import type { Cubie } from '../utils/cubeGeometry';
import { applyMove, buildStateSnapshot, createInitialState } from '../utils/cubeState';
import type {
  MoveDescriptor,
  MoveTurn,
  SolverOptions,
} from './types';
import { MAX_MOVES, SolverFailure } from './types';

// ---------------------------------------------------------------------------
// Compact state encoding
//
// We represent the cube as a flat Uint8Array of 27 * 6 = 162 bytes.
// Each cubie slot (sorted by position) stores 6 color indices (one per face).
// Color index 0 = undefined (internal), 1..6 = face colors.
// ---------------------------------------------------------------------------

// Sorted positions (same order every time)
const SORTED_POSITIONS: Array<[number, number, number]> = [];
for (let x = -1; x <= 1; x++)
  for (let y = -1; y <= 1; y++)
    for (let z = -1; z <= 1; z++)
      SORTED_POSITIONS.push([x, y, z]);
// SORTED_POSITIONS is 27 entries in lexicographic order

// Position key: (x+1)*9 + (y+1)*3 + (z+1)  →  0..26
function posKey(pos: [number, number, number]): number {
  return (pos[0] + 1) * 9 + (pos[1] + 1) * 3 + (pos[2] + 1);
}

// Face order for encoding: right=0, left=1, top=2, bottom=3, front=4, back=5
const FACE_NAMES: (keyof Cubie['faceColors'])[] = ['right', 'left', 'top', 'bottom', 'front', 'back'];

// Color encoding: build from initial solved state
const COLOR_TO_IDX = new Map<string | undefined, number>();
COLOR_TO_IDX.set(undefined, 0);
// Assign color indices 1..6 from face colors
const INIT = createInitialState();
for (const c of INIT) {
  for (const face of FACE_NAMES) {
    const col = c.faceColors[face];
    if (col !== undefined && !COLOR_TO_IDX.has(col)) {
      COLOR_TO_IDX.set(col, COLOR_TO_IDX.size);
    }
  }
}

// Encode a Cubie[] into a compact Uint8Array
function encodeState(cubies: Cubie[]): Uint8Array {
  const buf = new Uint8Array(27 * 6);
  for (let i = 0; i < cubies.length; i++) {
    const c = cubies[i];
    const slot = posKey(c.position as [number, number, number]) * 6;
    for (let f = 0; f < 6; f++) {
      buf[slot + f] = COLOR_TO_IDX.get(c.faceColors[FACE_NAMES[f]]) ?? 0;
    }
  }
  return buf;
}

// Build solved state encoding once
const SOLVED_ENCODING = encodeState(buildStateSnapshot(createInitialState()));

function encodingsEqual(a: Uint8Array, b: Uint8Array): boolean {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// All 12 quarter-turn moves (pre-encoded as their effects on the encoding)
// ---------------------------------------------------------------------------

// We represent each move as a permutation over the 162-byte buffer.
// A "permutation" maps each output byte index to its input byte index.
// We pre-compute these from applyMove.

type MovePerm = Uint8Array; // length 162: out[i] = in[perm[i]]

function computeMovePerm(face: string, direction: string): MovePerm {
  // Apply move to solved state and figure out byte remapping
  const solvedCubies = buildStateSnapshot(createInitialState());
  const movedCubies = applyMove(solvedCubies, { face, direction });

  // For each output cubie, find where each of its bytes came from in the input
  const perm = new Uint8Array(162);

  for (let i = 0; i < movedCubies.length; i++) {
    const outCubie = movedCubies[i];
    const outSlot = posKey(outCubie.position as [number, number, number]);

    // Find which input cubie has the same data (same id = same original position)
    // Actually: movedCubies[i] was originally solvedCubies[i] (same array index),
    // but moved to a new position. We need input slot = original position.
    const inCubie = solvedCubies[i];
    const inSlot = posKey(inCubie.position as [number, number, number]);

    // For each face of the output cubie, find which face of the input cubie it came from
    for (let fOut = 0; fOut < 6; fOut++) {
      const colorOut = outCubie.faceColors[FACE_NAMES[fOut]];
      // Find which input face has this color
      let fIn = fOut; // default (unmoved faces)
      for (let f = 0; f < 6; f++) {
        if (inCubie.faceColors[FACE_NAMES[f]] === colorOut && colorOut !== undefined) {
          fIn = f;
          break;
        }
        if (colorOut === undefined && inCubie.faceColors[FACE_NAMES[f]] === undefined) {
          fIn = f;
          break;
        }
      }
      // But we need the source to be deterministic for the permutation.
      // The permutation maps output_byte → input_byte.
      perm[outSlot * 6 + fOut] = inSlot * 6 + fIn;
    }
  }
  return perm;
}

// Actually the above approach is flawed because a color might appear multiple times
// in a solved state (different cubies with same color on same face type).
// Let me use a different approach: apply the move to an identity-labeled state.

// Better: use the position transform to map slots, and the face permutation to map face indices.
// We already have ROTATION_TRANSFORMS and FACE_PERMUTATION logic in applyMove.
// Let's just track which byte in the INPUT array maps to which byte in the OUTPUT array.

// Simpler approach: for each move, we know the 9 cubies on that face move.
// We encode the permutation by applying the move to a uniquely-labeled state.

function computeMovePerm2(face: string, direction: string): MovePerm {
  // Create a state where each byte has a unique value equal to its index
  // We'll track where each byte ends up after the move.

  // Instead, simulate: for each output position and face, find the source.
  // We apply the move to SOLVED state and track byte movements via color matching.

  // The key insight: applyMove maps cubie[i] → cubie[j] with face color remapping.
  // We can compute the byte-level permutation by applying the move to a state
  // where each byte has a unique identifier.

  const N = 162;
  const perm = new Uint8Array(N);

  // Apply move to solved state to see where things go
  const solvedCubies = buildStateSnapshot(createInitialState());

  // Assign unique IDs to each (cubie-slot, face) combination
  // Encode as: slot*6 + faceIdx → unique byte value
  // But we need to track the reverse: for output byte B, what input byte produced it?

  // Use a different strategy: apply the move and compare position+face
  const movedCubies = applyMove(solvedCubies, { face, direction });

  // Build a map: original_position → cubie_data (before move)
  const beforeMap = new Map<number, Cubie>();
  for (const c of solvedCubies) {
    beforeMap.set(posKey(c.position as [number, number, number]), c);
  }

  // For each output cubie (after move):
  // - It was at original position inCubie.position (= same array index as before move)
  // - It moved to outCubie.position
  // - Its face colors were remapped by FACE_PERMUTATION
  for (let i = 0; i < movedCubies.length; i++) {
    const outCubie = movedCubies[i];
    const inCubie = solvedCubies[i]; // same array position = same original cubie

    const outSlot = posKey(outCubie.position as [number, number, number]);
    const inSlot = posKey(inCubie.position as [number, number, number]);

    // For each output face, which input face did it come from?
    // applyMove uses: newFaceColors[dest] = cubie.faceColors[permutation[dest] ?? dest]
    // So output face F_out has color from input face permutation[F_out]
    // We need to find fIn such that FACE_NAMES[fIn] = permutation[FACE_NAMES[fOut]]

    // Reconstruct by comparing colors between inCubie and outCubie
    // Problem: in solved state, some colors are undefined → multiple undefined matches
    // We need to handle this carefully.

    // Use explicit face mapping from FACE_PERMUTATION table embedded in applyMove
    const faceMapping = getFaceMapping(face, direction);

    for (let fOut = 0; fOut < 6; fOut++) {
      const destFaceName = FACE_NAMES[fOut];
      const srcFaceName = faceMapping[destFaceName] ?? destFaceName;
      const fIn = FACE_NAMES.indexOf(srcFaceName as any);
      perm[outSlot * 6 + fOut] = inSlot * 6 + fIn;
    }
  }

  // For cubies NOT on this face, bytes map to themselves
  // (already set correctly by initialization to 0, but we need identity for those)
  // Actually we need to fix this: all 162 bytes must be mapped.
  // Cubies not on the face stay put: outSlot === inSlot, face mapping = identity
  // These are handled above since solvedCubies[i] for non-face cubies has inSlot = outSlot.

  return perm;
}

// FACE_PERMUTATION table (dest: src) extracted from applyMove in cubeState.ts
const FACE_PERMUTATION_TABLE: Record<string, Record<string, Record<string, string>>> = {
  U: {
    CW:  { right: 'back',  front: 'right', left: 'front', back: 'left',  top: 'top', bottom: 'bottom' },
    CCW: { right: 'front', back: 'right',  left: 'back',  front: 'left', top: 'top', bottom: 'bottom' },
  },
  D: {
    CW:  { right: 'front', back: 'right',  left: 'back',  front: 'left', top: 'top', bottom: 'bottom' },
    CCW: { right: 'back',  front: 'right', left: 'front', back: 'left',  top: 'top', bottom: 'bottom' },
  },
  F: {
    CW:  { right: 'top', bottom: 'right', left: 'bottom', top: 'left',  front: 'front', back: 'back' },
    CCW: { left: 'top',  bottom: 'left',  right: 'bottom', top: 'right', front: 'front', back: 'back' },
  },
  B: {
    CW:  { left: 'top',  bottom: 'left',  right: 'bottom', top: 'right', front: 'front', back: 'back' },
    CCW: { right: 'top', bottom: 'right', left: 'bottom',  top: 'left',  front: 'front', back: 'back' },
  },
  R: {
    CW:  { top: 'front', back: 'top',  bottom: 'back', front: 'bottom', right: 'right', left: 'left' },
    CCW: { front: 'top', top: 'back',  back: 'bottom', bottom: 'front', right: 'right', left: 'left' },
  },
  L: {
    CW:  { front: 'top', top: 'back',  back: 'bottom', bottom: 'front', right: 'right', left: 'left' },
    CCW: { top: 'front', back: 'top',  bottom: 'back', front: 'bottom', right: 'right', left: 'left' },
  },
};

function getFaceMapping(face: string, direction: string): Record<string, string> {
  return FACE_PERMUTATION_TABLE[face]?.[direction] ?? {};
}

// FACE_AXIS table
const FACE_AXIS: Record<string, [number, number]> = {
  R: [0, 1], L: [0, -1], U: [1, 1], D: [1, -1], F: [2, 1], B: [2, -1],
};

// Position transform table (same as ROTATION_TRANSFORMS)
const POS_TRANSFORMS: Record<string, Record<string, (p: [number, number, number]) => [number, number, number]>> = {
  R: { CW: ([x,y,z]) => [x, z, -y], CCW: ([x,y,z]) => [x, -z, y] },
  L: { CW: ([x,y,z]) => [x, -z, y], CCW: ([x,y,z]) => [x, z, -y] },
  U: { CW: ([x,y,z]) => [-z, y, x], CCW: ([x,y,z]) => [z, y, -x] },
  D: { CW: ([x,y,z]) => [z, y, -x], CCW: ([x,y,z]) => [-z, y, x] },
  F: { CW: ([x,y,z]) => [y, -x, z], CCW: ([x,y,z]) => [-y, x, z] },
  B: { CW: ([x,y,z]) => [-y, x, z], CCW: ([x,y,z]) => [y, -x, z] },
};

// Compute move permutation directly from face axis, position transform, and face mapping
function buildMovePerm(face: string, direction: string): MovePerm {
  const [axis, value] = FACE_AXIS[face];
  const posTransform = POS_TRANSFORMS[face][direction];
  const faceMapping = getFaceMapping(face, direction);
  const perm = new Uint8Array(162);

  // Initialize to identity
  for (let i = 0; i < 162; i++) perm[i] = i;

  // For each of the 27 positions, find if it's on this face
  for (const pos of SORTED_POSITIONS) {
    const inSlot = posKey(pos);
    if (pos[axis] !== value) {
      // Not on face: identity (already set)
      continue;
    }
    // On face: compute new position
    const newPos = posTransform(pos);
    const outSlot = posKey(newPos);

    // Map face colors: for each output face, find input face
    for (let fOut = 0; fOut < 6; fOut++) {
      const destFaceName = FACE_NAMES[fOut];
      const srcFaceName = faceMapping[destFaceName] ?? destFaceName;
      const fIn = FACE_NAMES.indexOf(srcFaceName as any);
      perm[outSlot * 6 + fOut] = inSlot * 6 + fIn;
    }
  }

  return perm;
}

// Pre-compute all 12 move permutations
const MOVE_PERMS: MovePerm[] = [
  buildMovePerm('R', 'CW'), buildMovePerm('R', 'CCW'),
  buildMovePerm('L', 'CW'), buildMovePerm('L', 'CCW'),
  buildMovePerm('U', 'CW'), buildMovePerm('U', 'CCW'),
  buildMovePerm('D', 'CW'), buildMovePerm('D', 'CCW'),
  buildMovePerm('F', 'CW'), buildMovePerm('F', 'CCW'),
  buildMovePerm('B', 'CW'), buildMovePerm('B', 'CCW'),
];

const MOVE_NAMES: Array<{ face: 'R' | 'L' | 'U' | 'D' | 'F' | 'B'; direction: 'CW' | 'CCW' }> = [
  { face: 'R', direction: 'CW' }, { face: 'R', direction: 'CCW' },
  { face: 'L', direction: 'CW' }, { face: 'L', direction: 'CCW' },
  { face: 'U', direction: 'CW' }, { face: 'U', direction: 'CCW' },
  { face: 'D', direction: 'CW' }, { face: 'D', direction: 'CCW' },
  { face: 'F', direction: 'CW' }, { face: 'F', direction: 'CCW' },
  { face: 'B', direction: 'CW' }, { face: 'B', direction: 'CCW' },
];

// Apply permutation into a pre-allocated buffer: out[i] = state[perm[i]]
function applyPermInto(state: Uint8Array, perm: Uint8Array, out: Uint8Array): void {
  for (let i = 0; i < 162; i++) {
    out[i] = state[perm[i]];
  }
}

// Apply permutation and return a new Uint8Array
function applyPerm(state: Uint8Array, perm: Uint8Array): Uint8Array {
  const out = new Uint8Array(162);
  applyPermInto(state, perm, out);
  return out;
}

// ---------------------------------------------------------------------------
// Pruning tables
// ---------------------------------------------------------------------------
// INVERSE[i] = index of inverse of MOVE_NAMES[i]
const INVERSE: number[] = MOVE_NAMES.map((_, i) => (i % 2 === 0 ? i + 1 : i - 1));

// Face indices: R=0, L=1, U=2, D=3, F=4, B=5
const FACE_IDX: Record<string, number> = { R: 0, L: 1, U: 2, D: 3, F: 4, B: 5 };
const MOVE_FACE_IDX: number[] = MOVE_NAMES.map(m => FACE_IDX[m.face]);
const OPPOSITE_IDX: number[] = [1, 0, 3, 2, 5, 4]; // R↔L, U↔D, F↔B

// ---------------------------------------------------------------------------
// Heuristic on compact state
// ---------------------------------------------------------------------------
function heuristicEncoded(state: Uint8Array): number {
  let misplaced = 0;
  for (let i = 0; i < 162; i++) {
    if (state[i] !== SOLVED_ENCODING[i]) {
      misplaced++;
    }
  }
  // Each move changes at most 9 * 6 = 54 bytes, but conservative lower bound:
  // Each move affects at most 9 cubies × 3 active faces = ~27 bytes
  // Divide by 8 for admissibility (most moves fix 8 misplaced stickers)
  return Math.ceil(misplaced / 8);
}

function isSolvedEncoded(state: Uint8Array): boolean {
  return encodingsEqual(state, SOLVED_ENCODING);
}

// ---------------------------------------------------------------------------
// IDA* search on compact state
// ---------------------------------------------------------------------------
const MAX_DEPTH = 20;
const TIME_LIMIT_MS = 8000;
const FOUND = -1;
const TIMEOUT = -2;

function idaStar(initial: Uint8Array, startTime: number): number[] {
  if (isSolvedEncoded(initial)) return [];

  const path: number[] = new Array(MAX_DEPTH + 1).fill(-1);
  const h0 = heuristicEncoded(initial);

  for (let limit = h0 > 0 ? h0 : 1; limit <= MAX_DEPTH; limit++) {
    path.fill(-1);
    const result = dfs(initial, path, 0, limit, -1, -1, startTime);
    if (result === FOUND) {
      let len = 0;
      for (let i = 0; i < MAX_DEPTH; i++) {
        if (path[i] < 0) break;
        len = i + 1;
      }
      return path.slice(0, len);
    }
    if (result === TIMEOUT) {
      throw new SolverFailure('limit_exceeded', { reason: 'time_limit', ms: TIME_LIMIT_MS });
    }
  }

  throw new SolverFailure('unsolved', { reason: 'depth_limit', maxDepth: MAX_DEPTH });
}

function dfs(
  state: Uint8Array,
  path: number[],
  g: number,
  limit: number,
  lastMoveIdx: number,
  secondLastFaceIdx: number,
  startTime: number,
): number {
  const h = heuristicEncoded(state);
  const f = g + h;
  if (f > limit) return f;

  if (h === 0 && isSolvedEncoded(state)) {
    path[g] = -1;
    return FOUND;
  }

  // Check timeout every 1024 nodes
  if ((g === 0 || (g & 0x3) === 0) && Date.now() - startTime > TIME_LIMIT_MS) return TIMEOUT;

  let minExceeded = Infinity;
  const lastFaceIdx = lastMoveIdx >= 0 ? MOVE_FACE_IDX[lastMoveIdx] : -1;

  for (let i = 0; i < 12; i++) {
    const fi = MOVE_FACE_IDX[i];

    if (lastMoveIdx >= 0 && INVERSE[lastMoveIdx] === i) continue;
    if (lastFaceIdx >= 0 && fi === lastFaceIdx) continue;
    if (
      lastFaceIdx >= 0 &&
      OPPOSITE_IDX[fi] === lastFaceIdx &&
      secondLastFaceIdx === fi
    ) continue;

    const next = applyPerm(state, MOVE_PERMS[i]);
    path[g] = i;

    const result = dfs(next, path, g + 1, limit, i, lastFaceIdx, startTime);

    if (result === FOUND) return FOUND;
    if (result === TIMEOUT) return TIMEOUT;
    if ((result as number) < minExceeded) minExceeded = result as number;
  }

  return minExceeded;
}

// ---------------------------------------------------------------------------
// Public serialization helper (using Cubie[])
// ---------------------------------------------------------------------------
export function serializeState(cubies: Cubie[]): string {
  const enc = encodeState(cubies);
  return Array.from(enc).join(',');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export { SolverFailure };

export async function solveCube(
  cubies: Readonly<Cubie[]>,
  options: SolverOptions = {},
): Promise<MoveDescriptor[]> {
  const snapshot = buildStateSnapshot(cubies as Cubie[]);
  validateSnapshot(snapshot);

  const maxMoves = options.maxMoves ?? MAX_MOVES;

  // If a custom strategyFactory is supplied, use the legacy macro path
  if (options.strategyFactory) {
    return legacyStrategyPath(snapshot, options, maxMoves);
  }

  // Encode to compact representation
  const encoded = encodeState(snapshot);

  // Fast path: already solved
  if (isSolvedEncoded(encoded)) return [];

  // IDA* search
  const startTime = Date.now();
  const moveIndices = idaStar(encoded, startTime);

  if (moveIndices.length > maxMoves) {
    throw new SolverFailure('limit_exceeded', { count: moveIndices.length, maxMoves });
  }

  return moveIndices.map(i => ({ face: MOVE_NAMES[i].face, direction: MOVE_NAMES[i].direction }));
}

// ---------------------------------------------------------------------------
// Legacy strategy path (kept for options.strategyFactory compatibility)
// ---------------------------------------------------------------------------

import { makeBeginnerLayerStrategy } from './strategies/beginnerLayer';
import type { MoveMacro, SolverSnapshot } from './types';

function legacyStrategyPath(
  snapshot: Cubie[],
  options: SolverOptions,
  maxMoves: number,
): MoveDescriptor[] {
  const solverSnapshot: SolverSnapshot = { cubies: snapshot };
  const strategyFactory = options.strategyFactory ?? makeBeginnerLayerStrategy;
  const strategy = strategyFactory();
  const context = { scrambleLength: 0 };
  const moves = collectMoves(strategy.solve(solverSnapshot, context), solverSnapshot, maxMoves);
  return moves;
}

function collectMoves(
  macros: Generator<MoveMacro, void, void>,
  snapshot: SolverSnapshot,
  maxMoves: number,
): MoveDescriptor[] {
  const moves: MoveDescriptor[] = [];
  for (const macro of macros) {
    processMacro(macro, snapshot, moves, maxMoves);
  }
  return moves;
}

function processMacro(
  macro: MoveMacro,
  snapshot: SolverSnapshot,
  moves: MoveDescriptor[],
  maxMoves: number,
) {
  const expandedTurns = expandTurns(macro.turns);
  for (const turn of expandedTurns) {
    snapshot.cubies = applyMove(snapshot.cubies, turn as { face: string; direction: string });
    moves.push({ face: turn.face, direction: turn.direction });
    if (moves.length > maxMoves) {
      throw new SolverFailure('limit_exceeded', { count: moves.length, maxMoves });
    }
  }
}

function expandTurns(turns: MoveTurn[]): MoveTurn[] {
  const expanded: MoveTurn[] = [];
  for (const turn of turns) {
    expanded.push({ face: turn.face, direction: turn.direction });
    if (turn.double) {
      expanded.push({ face: turn.face, direction: turn.direction });
    }
  }
  return expanded;
}

function validateSnapshot(cubies: Cubie[]) {
  if (cubies.length !== 27) {
    throw new SolverFailure('invalid_state', {
      reason: 'unexpected_cubie_count',
      cubies: cubies.length,
    });
  }

  const uniquePositions = new Set(cubies.map(c => c.position.join(',')));
  if (uniquePositions.size !== cubies.length) {
    throw new SolverFailure('invalid_state', { reason: 'duplicate_positions' });
  }
}
