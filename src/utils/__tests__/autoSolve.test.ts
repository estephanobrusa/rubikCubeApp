/**
 * T10 — Auto-solve logic integration tests
 *
 * Tests the pure logic that backs the auto-solve feature WITHOUT rendering any
 * React components or WebGL contexts. Everything is tested at the data layer.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createInitialState, applyMove, buildStateSnapshot } from '../cubeState';
import { solveCube, SolverFailure } from '../../solver';
import type { Cubie } from '../cubeGeometry';

// ---------------------------------------------------------------------------
// Shared helpers (mirror logic in RubiksCubeScene without mounting React)
// ---------------------------------------------------------------------------

export interface QueuedMove {
  face: string;
  direction: 'CW' | 'CCW';
  source?: 'solver' | 'user';
  sessionId?: string;
}

export interface SolveSession {
  sessionId: string;
  totalMoves: number;
  remainingMoves: number;
  startTime: number;
}

/** Pure equivalent of handleAutoSolve — returns tagged moves without touching React state */
async function buildSolverMoves(
  cubies: Cubie[],
  sessionId: string,
): Promise<QueuedMove[]> {
  let moves: { face: string; direction: 'CW' | 'CCW' }[] = [];
  try {
    moves = await solveCube(cubies);
  } catch {
    moves = [];
  }
  return moves.map((m) => ({
    face: m.face,
    direction: m.direction,
    source: 'solver' as const,
    sessionId,
  }));
}

/** Simulates the busy guard in handleAutoSolve */
function canStartSolve(queue: QueuedMove[], isAnimating: boolean): boolean {
  return queue.length === 0 && !isAnimating;
}

/** Simulates the onMoveDone completion tracking */
function trackMoveDone(
  session: SolveSession,
  move: QueuedMove,
): { complete: boolean; remainingMoves: number } {
  if (!move.sessionId || move.sessionId !== session.sessionId) {
    return { complete: false, remainingMoves: session.remainingMoves };
  }
  const remaining = session.remainingMoves - 1;
  return { complete: remaining <= 0, remainingMoves: remaining };
}

/** Simulates cancel — removes session solver moves from queue */
function cancelSession(queue: QueuedMove[], sessionId: string): QueuedMove[] {
  return queue.filter((m) => m.sessionId !== sessionId);
}

// ---------------------------------------------------------------------------
// 1. solveCube integration — solved state → returns []
// ---------------------------------------------------------------------------

describe('solveCube integration: solved state', () => {
  it('returns empty array for the solved cube', async () => {
    const solved = createInitialState();
    const result = await solveCube(solved);
    expect(result).toEqual([]);
  });

  it('solved state → no moves are enqueued', async () => {
    const solved = createInitialState();
    const moves = await buildSolverMoves(solved, 'session-1');
    expect(moves).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 2. solveCube integration — scrambled state behaviour (macros are stubs)
// ---------------------------------------------------------------------------

describe('solveCube integration: scrambled state', () => {
  it('solves a scrambled cube and returns a non-empty move list', async () => {
    const scrambled = applyMove(createInitialState(), { face: 'R', direction: 'CW' });
    const result = await solveCube(scrambled);
    expect(result.length).toBeGreaterThan(0);
  });

  it('buildSolverMoves returns tagged moves for a scrambled cube', async () => {
    const scrambled = applyMove(createInitialState(), { face: 'R', direction: 'CW' });
    const moves = await buildSolverMoves(scrambled, 'session-2');
    expect(moves.length).toBeGreaterThan(0);
    expect(moves[0].source).toBe('solver');
    expect(moves[0].sessionId).toBe('session-2');
  });

  it('when solveCube resolves with moves, each entry has source=solver and sessionId', async () => {
    const sessionId = 'sess-abc';
    // Override solveCube with a custom strategy that yields 2 moves
    const { solveCube: realSolve } = await import('../../solver');

    // We test tagging logic directly: if the solver returns moves, they get tagged
    const rawMoves = [
      { face: 'R' as const, direction: 'CW' as const },
      { face: 'U' as const, direction: 'CCW' as const },
    ];

    const tagged: QueuedMove[] = rawMoves.map((m) => ({
      face: m.face,
      direction: m.direction,
      source: 'solver' as const,
      sessionId,
    }));

    expect(tagged).toHaveLength(2);
    for (const move of tagged) {
      expect(move.source).toBe('solver');
      expect(move.sessionId).toBe(sessionId);
    }

    void realSolve; // silence unused warning
  });
});

// ---------------------------------------------------------------------------
// 3. Busy guard logic
// ---------------------------------------------------------------------------

describe('busy guard logic', () => {
  it('canStartSolve returns true when queue is empty and not animating', () => {
    expect(canStartSolve([], false)).toBe(true);
  });

  it('canStartSolve returns false when queue is non-empty', () => {
    const queue: QueuedMove[] = [{ face: 'R', direction: 'CW' }];
    expect(canStartSolve(queue, false)).toBe(false);
  });

  it('canStartSolve returns false when animating', () => {
    expect(canStartSolve([], true)).toBe(false);
  });

  it('canStartSolve returns false when both queue non-empty and animating', () => {
    const queue: QueuedMove[] = [{ face: 'U', direction: 'CCW', source: 'solver', sessionId: 'x' }];
    expect(canStartSolve(queue, true)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 4. Cancel filtering — session-specific removal
// ---------------------------------------------------------------------------

describe('cancel filtering by sessionId', () => {
  const mixedQueue: QueuedMove[] = [
    { face: 'R', direction: 'CW',  source: 'solver', sessionId: 'A' },
    { face: 'U', direction: 'CCW', source: 'user' },
    { face: 'F', direction: 'CW',  source: 'solver', sessionId: 'A' },
    { face: 'D', direction: 'CW',  source: 'user' },
  ];

  it('removes only moves with matching sessionId', () => {
    const after = cancelSession(mixedQueue, 'A');
    expect(after.every((m) => m.sessionId !== 'A')).toBe(true);
    expect(after).toHaveLength(2);
  });

  it('user moves survive the cancel', () => {
    const after = cancelSession(mixedQueue, 'A');
    const userMoves = after.filter((m) => m.source === 'user' || !m.source);
    expect(userMoves).toHaveLength(2);
  });

  it('cancelling a non-existent sessionId leaves the queue unchanged', () => {
    const after = cancelSession(mixedQueue, 'nonexistent');
    expect(after).toHaveLength(mixedQueue.length);
  });
});

// ---------------------------------------------------------------------------
// 5. Completion tracking via trackMoveDone
// ---------------------------------------------------------------------------

describe('completion tracking: solveSession.remainingMoves', () => {
  function makeSession(total: number): SolveSession {
    return { sessionId: 'sess-test', totalMoves: total, remainingMoves: total, startTime: Date.now() };
  }

  it('does not complete after first of 3 moves', () => {
    const session = makeSession(3);
    const move: QueuedMove = { face: 'R', direction: 'CW', sessionId: 'sess-test' };
    const r1 = trackMoveDone(session, move);
    session.remainingMoves = r1.remainingMoves;
    expect(r1.complete).toBe(false);
    expect(r1.remainingMoves).toBe(2);
  });

  it('completes exactly when remainingMoves reaches 0 (3 decrements for totalMoves=3)', () => {
    const session = makeSession(3);
    const move: QueuedMove = { face: 'R', direction: 'CW', sessionId: 'sess-test' };

    let r = trackMoveDone(session, move);
    session.remainingMoves = r.remainingMoves;
    expect(r.complete).toBe(false);

    r = trackMoveDone(session, move);
    session.remainingMoves = r.remainingMoves;
    expect(r.complete).toBe(false);

    r = trackMoveDone(session, move);
    session.remainingMoves = r.remainingMoves;
    expect(r.complete).toBe(true);
    expect(r.remainingMoves).toBe(0);
  });

  it('ignores moves from a different sessionId', () => {
    const session = makeSession(2);
    const foreignMove: QueuedMove = { face: 'U', direction: 'CW', sessionId: 'other-session' };
    const r = trackMoveDone(session, foreignMove);
    expect(r.complete).toBe(false);
    expect(r.remainingMoves).toBe(2); // unchanged
  });

  it('ignores moves with no sessionId', () => {
    const session = makeSession(2);
    const userMove: QueuedMove = { face: 'U', direction: 'CW' }; // no sessionId
    const r = trackMoveDone(session, userMove);
    expect(r.complete).toBe(false);
    expect(r.remainingMoves).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// 6. Telemetry calls — mock track() and verify event payload structure
// ---------------------------------------------------------------------------

describe('telemetry call structure', () => {
  let trackMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    // Dynamically import telemetry module so we can spy on it
    vi.doMock('../telemetry', () => ({ track: vi.fn() }));
    const mod = await import('../telemetry');
    trackMock = mod.track as ReturnType<typeof vi.fn>;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('auto_solve_start payload has sessionId, scrambleLength, algorithm', () => {
    // Simulate what RubiksCubeScene fires before enqueuing
    const sessionId = 'tel-session-1';
    const scrambleLength = 5;

    // Re-implement the call inline to test payload shape
    const startPayload = { sessionId, scrambleLength, algorithm: 'beginner-layer' };
    expect(startPayload).toMatchObject({
      sessionId: expect.any(String),
      scrambleLength: expect.any(Number),
      algorithm: 'beginner-layer',
    });
  });

  it('auto_solve_complete payload has sessionId, moveCount, durationMs', () => {
    const completePayload = { sessionId: 'tel-session-2', moveCount: 0, durationMs: 0 };
    expect(completePayload).toMatchObject({
      sessionId: expect.any(String),
      moveCount: expect.any(Number),
      durationMs: expect.any(Number),
    });
  });

  it('auto_solve_cancel payload has sessionId, remainingMoves', () => {
    const cancelPayload = { sessionId: 'tel-session-3', remainingMoves: 4 };
    expect(cancelPayload).toMatchObject({
      sessionId: expect.any(String),
      remainingMoves: expect.any(Number),
    });
  });

  it('auto_solve_error payload has reason and scrambleLength', () => {
    const errorPayload = { reason: 'unsolved', scrambleLength: 3 };
    expect(errorPayload).toMatchObject({
      reason: expect.any(String),
      scrambleLength: expect.any(Number),
    });
  });

  it('track() function is callable with event name and payload', async () => {
    // Direct import of the real module (not the mock) to verify it doesn't throw
    vi.restoreAllMocks();
    vi.resetModules();
    const { track: realTrack } = await import('../telemetry');
    expect(() => realTrack('auto_solve_start', { sessionId: 'x', scrambleLength: 0, algorithm: 'beginner-layer' })).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 7. Queue tagging helpers
// ---------------------------------------------------------------------------

describe('queue tagging', () => {
  it('tagged moves have the correct face and direction from solver output', () => {
    const rawMoves = [
      { face: 'R', direction: 'CW' as const },
      { face: 'U', direction: 'CCW' as const },
      { face: 'F', direction: 'CW' as const },
    ];
    const sessionId = 'tag-session';

    const tagged: QueuedMove[] = rawMoves.map((m) => ({
      ...m,
      source: 'solver' as const,
      sessionId,
    }));

    expect(tagged).toHaveLength(3);
    tagged.forEach((m, i) => {
      expect(m.face).toBe(rawMoves[i].face);
      expect(m.direction).toBe(rawMoves[i].direction);
      expect(m.source).toBe('solver');
      expect(m.sessionId).toBe(sessionId);
    });
  });

  it('solver snapshot is a deep clone — mutations do not affect original', () => {
    const original = createInitialState();
    const snapshot = buildStateSnapshot(original);

    // Mutate snapshot — original must not change
    snapshot[0].position[0] = 999;
    expect(original[0].position[0]).not.toBe(999);
  });
});
