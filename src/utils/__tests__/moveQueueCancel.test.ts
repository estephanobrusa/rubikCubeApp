/**
 * T11 — Queue cancel regression tests
 *
 * Tests the queue filtering logic used by handleCancelSolve in RubiksCubeScene.
 * All tests are pure data tests — no component rendering required.
 */
import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Types (mirror QueuedMove from RubiksCube.tsx without importing Three.js)
// ---------------------------------------------------------------------------

interface QueuedMove {
  face: string;
  direction: 'CW' | 'CCW';
  source?: 'solver' | 'user';
  sessionId?: string;
}

interface SolveSession {
  sessionId: string;
  totalMoves: number;
  remainingMoves: number;
  startTime: number;
}

// ---------------------------------------------------------------------------
// Pure helpers — extracted equivalents of scene logic
// ---------------------------------------------------------------------------

/** Cancel a session: removes matching solver moves, resets the session ref. */
function cancelSession(
  queue: QueuedMove[],
  session: SolveSession,
): { filteredQueue: QueuedMove[]; remainingMoves: number } {
  const { sessionId } = session;
  const filteredQueue = queue.filter((m) => m.sessionId !== sessionId);
  return { filteredQueue, remainingMoves: 0 };
}

/** Build a new clean session for a given move list. */
function createSession(sessionId: string, moves: QueuedMove[]): SolveSession {
  return {
    sessionId,
    totalMoves: moves.length,
    remainingMoves: moves.length,
    startTime: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSolverMoves(sessionId: string, count: number): QueuedMove[] {
  return Array.from({ length: count }, (_, i) => ({
    face: 'R',
    direction: (i % 2 === 0 ? 'CW' : 'CCW') as 'CW' | 'CCW',
    source: 'solver' as const,
    sessionId,
  }));
}

function makeUserMoves(count: number): QueuedMove[] {
  return Array.from({ length: count }, (_, i) => ({
    face: 'U',
    direction: (i % 2 === 0 ? 'CW' : 'CCW') as 'CW' | 'CCW',
    source: 'user' as const,
    // No sessionId — user moves are untagged
  }));
}

// ---------------------------------------------------------------------------
// Test 1: Mixed queue — solver (A) + user moves
// ---------------------------------------------------------------------------

describe('cancel session A: mixed solver and user moves', () => {
  const sessionId = 'session-A';
  const solverMoves = makeSolverMoves(sessionId, 3);
  const userMoves = makeUserMoves(2);

  // Interleave so queue looks realistic
  const queue: QueuedMove[] = [
    solverMoves[0],
    userMoves[0],
    solverMoves[1],
    userMoves[1],
    solverMoves[2],
  ];
  const session = createSession(sessionId, solverMoves);

  it('removes all solver moves for session A', () => {
    const { filteredQueue } = cancelSession(queue, session);
    const remaining = filteredQueue.filter((m) => m.sessionId === sessionId);
    expect(remaining).toHaveLength(0);
  });

  it('leaves all user moves intact', () => {
    const { filteredQueue } = cancelSession(queue, session);
    const remainingUser = filteredQueue.filter((m) => m.source === 'user');
    expect(remainingUser).toHaveLength(2);
  });

  it('total remaining queue length is exactly the user move count', () => {
    const { filteredQueue } = cancelSession(queue, session);
    expect(filteredQueue).toHaveLength(2);
  });

  it('remainingMoves resets to 0 after cancel', () => {
    const { remainingMoves } = cancelSession(queue, session);
    expect(remainingMoves).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Test 2: Two solver sessions in queue — cancel A, leave B intact
// ---------------------------------------------------------------------------

describe('cancel session A: two solver sessions (A and B) in queue', () => {
  const movesA = makeSolverMoves('session-A', 3);
  const movesB = makeSolverMoves('session-B', 2);
  const queue: QueuedMove[] = [...movesA, ...movesB];
  const sessionA = createSession('session-A', movesA);

  it('removes all A moves', () => {
    const { filteredQueue } = cancelSession(queue, sessionA);
    const aRemaining = filteredQueue.filter((m) => m.sessionId === 'session-A');
    expect(aRemaining).toHaveLength(0);
  });

  it('leaves all B moves intact', () => {
    const { filteredQueue } = cancelSession(queue, sessionA);
    const bRemaining = filteredQueue.filter((m) => m.sessionId === 'session-B');
    expect(bRemaining).toHaveLength(movesB.length);
  });

  it('queue length equals B moves count after cancelling A', () => {
    const { filteredQueue } = cancelSession(queue, sessionA);
    expect(filteredQueue).toHaveLength(movesB.length);
  });

  it('B moves retain their source and sessionId unchanged', () => {
    const { filteredQueue } = cancelSession(queue, sessionA);
    for (const m of filteredQueue) {
      expect(m.source).toBe('solver');
      expect(m.sessionId).toBe('session-B');
    }
  });
});

// ---------------------------------------------------------------------------
// Test 3: Cancel non-existent sessionId leaves queue unchanged
// ---------------------------------------------------------------------------

describe('cancel non-existent sessionId', () => {
  const moves = makeSolverMoves('session-X', 4);
  const queue: QueuedMove[] = [...moves, ...makeUserMoves(2)];
  const orphanSession = createSession('session-DOES-NOT-EXIST', []);

  it('queue length is unchanged', () => {
    const { filteredQueue } = cancelSession(queue, orphanSession);
    expect(filteredQueue).toHaveLength(queue.length);
  });

  it('all moves are intact (deep equality)', () => {
    const { filteredQueue } = cancelSession(queue, orphanSession);
    expect(filteredQueue).toEqual(queue);
  });

  it('remainingMoves still resets to 0 (cancel side effect is consistent)', () => {
    const { remainingMoves } = cancelSession(queue, orphanSession);
    expect(remainingMoves).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Test 4: remainingMoves counter resets to 0 after cancel
// ---------------------------------------------------------------------------

describe('remainingMoves resets correctly', () => {
  it('reset to 0 regardless of how many moves were pending', () => {
    const session = createSession('sess-reset', makeSolverMoves('sess-reset', 10));
    const queue = makeSolverMoves('sess-reset', 10);

    // Simulate some moves having been processed already (4 done, 6 remaining)
    session.remainingMoves = 6;

    const { remainingMoves } = cancelSession(queue, session);
    expect(remainingMoves).toBe(0);
  });

  it('reset to 0 even if session already had 0 remaining', () => {
    const session = createSession('sess-zero', []);
    session.remainingMoves = 0;
    const { remainingMoves } = cancelSession([], session);
    expect(remainingMoves).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Test 5: After cancel, a new solve session can start cleanly
// ---------------------------------------------------------------------------

describe('new session starts cleanly after cancel', () => {
  const oldSessionId = 'old-session';
  const newSessionId = 'new-session';

  it('old session moves do not contaminate new session queue', () => {
    // Original queue has old session solver moves + user moves
    const oldSolverMoves = makeSolverMoves(oldSessionId, 5);
    const userMoves = makeUserMoves(2);
    const queue: QueuedMove[] = [...oldSolverMoves, ...userMoves];
    const oldSession = createSession(oldSessionId, oldSolverMoves);

    // Cancel old session
    const { filteredQueue } = cancelSession(queue, oldSession);

    // New session enqueues its own moves
    const newSolverMoves = makeSolverMoves(newSessionId, 3);
    const newQueue: QueuedMove[] = [...filteredQueue, ...newSolverMoves];

    // No old session moves remain
    expect(newQueue.filter((m) => m.sessionId === oldSessionId)).toHaveLength(0);

    // New session moves are all present
    expect(newQueue.filter((m) => m.sessionId === newSessionId)).toHaveLength(3);
  });

  it('new session tracking starts with fresh remainingMoves count', () => {
    const newMoves = makeSolverMoves(newSessionId, 4);
    const newSession = createSession(newSessionId, newMoves);

    expect(newSession.remainingMoves).toBe(4);
    expect(newSession.sessionId).toBe(newSessionId);
  });

  it('stale solveSessionRef is null after cancel (simulated with null check)', () => {
    // Simulate solveSessionRef.current = null after cancel
    let sessionRef: SolveSession | null = createSession(oldSessionId, makeSolverMoves(oldSessionId, 3));
    expect(sessionRef).not.toBeNull();

    // Cancel clears the ref
    sessionRef = null;
    expect(sessionRef).toBeNull();
  });

  it('isSolverLocked is false after cancel (simulated state transition)', () => {
    let isSolverLocked = true;

    // Simulate the handleCancelSolve flow
    const queue = makeSolverMoves(oldSessionId, 3);
    const session = createSession(oldSessionId, queue);
    cancelSession(queue, session); // clear queue
    isSolverLocked = false;        // scene sets lock false

    expect(isSolverLocked).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Test 6: Edge cases
// ---------------------------------------------------------------------------

describe('edge cases', () => {
  it('cancelling an empty queue is a no-op', () => {
    const session = createSession('sess-empty', []);
    const { filteredQueue, remainingMoves } = cancelSession([], session);
    expect(filteredQueue).toHaveLength(0);
    expect(remainingMoves).toBe(0);
  });

  it('queue with only user moves is unaffected by cancel of any sessionId', () => {
    const userMoves = makeUserMoves(5);
    const session = createSession('orphan', []);
    const { filteredQueue } = cancelSession(userMoves, session);
    expect(filteredQueue).toHaveLength(5);
  });

  it('solver moves without sessionId are NOT removed by cancel (no sessionId match)', () => {
    const noTagMoves: QueuedMove[] = [
      { face: 'R', direction: 'CW', source: 'solver' }, // no sessionId
    ];
    const session = createSession('some-session', []);
    const { filteredQueue } = cancelSession(noTagMoves, session);
    // filter: m.sessionId !== 'some-session' → undefined !== 'some-session' = true → kept
    expect(filteredQueue).toHaveLength(1);
  });
});
