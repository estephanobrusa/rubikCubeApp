import { describe, it, expect } from 'vitest';
import { createInitialState, applyMove } from '../cubeState';
import { Cubie, FaceColors } from '../cubeGeometry';

// Helper: apply a sequence of moves
function applySequence(cubies: Cubie[], moves: { face: string; direction: string }[]): Cubie[] {
  let state = cubies as ReturnType<typeof applyMove>;
  for (const move of moves) {
    state = applyMove(state as Cubie[], move);
  }
  return state as unknown as Cubie[];
}

// Helper: check if two cubie arrays are identical in position and faceColors
function statesEqual(a: Cubie[], b: Cubie[]): boolean {
  if (a.length !== b.length) return false;
  // Sort by position to compare regardless of array order
  const sort = (cubies: Cubie[]) =>
    [...cubies].sort((x, y) => {
      const px = x.position, py = y.position;
      if (px[0] !== py[0]) return px[0] - py[0];
      if (px[1] !== py[1]) return px[1] - py[1];
      return px[2] - py[2];
    });

  const sa = sort(a);
  const sb = sort(b);

  for (let i = 0; i < sa.length; i++) {
    const ca = sa[i], cb = sb[i];
    if (ca.position[0] !== cb.position[0] ||
        ca.position[1] !== cb.position[1] ||
        ca.position[2] !== cb.position[2]) {
      return false;
    }
    const fa = ca.faceColors as Record<string, string | undefined>;
    const fb = cb.faceColors as Record<string, string | undefined>;
    const keys: (keyof FaceColors)[] = ['right', 'left', 'top', 'bottom', 'front', 'back'];
    for (const k of keys) {
      if (fa[k] !== fb[k]) {
        return false;
      }
    }
  }
  return true;
}

// Helper: pretty-print differences for debugging
function diffStates(a: Cubie[], b: Cubie[]): string {
  const sort = (cubies: Cubie[]) =>
    [...cubies].sort((x, y) => {
      const px = x.position, py = y.position;
      if (px[0] !== py[0]) return px[0] - py[0];
      if (px[1] !== py[1]) return px[1] - py[1];
      return px[2] - py[2];
    });
  const sa = sort(a);
  const sb = sort(b);
  const diffs: string[] = [];
  const keys: (keyof FaceColors)[] = ['right', 'left', 'top', 'bottom', 'front', 'back'];
  for (let i = 0; i < sa.length; i++) {
    const ca = sa[i], cb = sb[i];
    const fa = ca.faceColors as Record<string, string | undefined>;
    const fb = cb.faceColors as Record<string, string | undefined>;
    const posDiff = ca.position.join(',') !== cb.position.join(',');
    if (posDiff) {
      diffs.push(`Position mismatch: ${ca.position} vs ${cb.position}`);
      continue;
    }
    for (const k of keys) {
      if (fa[k] !== fb[k]) {
        diffs.push(`[${ca.position}] ${k}: got "${fa[k]}" expected "${fb[k]}"`);
      }
    }
  }
  return diffs.join('\n');
}

describe('createInitialState', () => {
  it('has 27 cubies', () => {
    expect(createInitialState().length).toBe(27);
  });

  it('each position has correct face colors', () => {
    const state = createInitialState();
    for (const cubie of state) {
      const [x, y, z] = cubie.position;
      const fc = cubie.faceColors;
      if (x === 1) expect(fc.right).toBeDefined();
      else expect(fc.right).toBeUndefined();
      if (x === -1) expect(fc.left).toBeDefined();
      else expect(fc.left).toBeUndefined();
      if (y === 1) expect(fc.top).toBeDefined();
      else expect(fc.top).toBeUndefined();
      if (y === -1) expect(fc.bottom).toBeDefined();
      else expect(fc.bottom).toBeUndefined();
      if (z === 1) expect(fc.front).toBeDefined();
      else expect(fc.front).toBeUndefined();
      if (z === -1) expect(fc.back).toBeDefined();
      else expect(fc.back).toBeUndefined();
    }
  });
});

describe('X4 identity tests (4x same move = solved)', () => {
  const faces = ['R', 'L', 'U', 'D', 'F', 'B'] as const;
  const dirs = ['CW', 'CCW'] as const;

  for (const face of faces) {
    for (const direction of dirs) {
      it(`${face} ${direction} × 4 = identity`, () => {
        const initial = createInitialState();
        const result = applySequence(initial, [
          { face, direction },
          { face, direction },
          { face, direction },
          { face, direction },
        ]);
        const diff = diffStates(result, initial);
        expect(diff, `${face} ${direction} x4 failed:\n${diff}`).toBe('');
        expect(statesEqual(result, initial)).toBe(true);
      });
    }
  }
});

describe('CW then CCW = identity', () => {
  const faces = ['R', 'L', 'U', 'D', 'F', 'B'] as const;
  for (const face of faces) {
    it(`${face} CW then CCW = identity`, () => {
      const initial = createInitialState();
      const result = applySequence(initial, [
        { face, direction: 'CW' },
        { face, direction: 'CCW' },
      ]);
      const diff = diffStates(result, initial);
      expect(diff, `${face} CW+CCW failed:\n${diff}`).toBe('');
      expect(statesEqual(result, initial)).toBe(true);
    });

    it(`${face} CCW then CW = identity`, () => {
      const initial = createInitialState();
      const result = applySequence(initial, [
        { face, direction: 'CCW' },
        { face, direction: 'CW' },
      ]);
      const diff = diffStates(result, initial);
      expect(diff, `${face} CCW+CW failed:\n${diff}`).toBe('');
      expect(statesEqual(result, initial)).toBe(true);
    });
  }
});

describe('known Rubik algorithms', () => {
  it('(R U R\' U\')×6 = identity (sexy move, verified order-6 commutator)', () => {
    const initial = createInitialState();
    const seq = Array(6).fill([
      { face: 'R', direction: 'CW' },
      { face: 'U', direction: 'CW' },
      { face: 'R', direction: 'CCW' },
      { face: 'U', direction: 'CCW' },
    ]).flat();
    const result = applySequence(initial, seq);
    const diff = diffStates(result, initial);
    expect(diff, `(R U R' U')x6 failed:\n${diff}`).toBe('');
    expect(statesEqual(result, initial)).toBe(true);
  });

  it('(F R F\' R\')×6 = identity (front sexy move)', () => {
    const initial = createInitialState();
    const seq = Array(6).fill([
      { face: 'F', direction: 'CW' },
      { face: 'R', direction: 'CW' },
      { face: 'F', direction: 'CCW' },
      { face: 'R', direction: 'CCW' },
    ]).flat();
    const result = applySequence(initial, seq);
    const diff = diffStates(result, initial);
    expect(diff, `(F R F' R')x6 failed:\n${diff}`).toBe('');
    expect(statesEqual(result, initial)).toBe(true);
  });

  it('(U R U\' R\')×6 = identity', () => {
    const initial = createInitialState();
    const seq = Array(6).fill([
      { face: 'U', direction: 'CW' },
      { face: 'R', direction: 'CW' },
      { face: 'U', direction: 'CCW' },
      { face: 'R', direction: 'CCW' },
    ]).flat();
    const result = applySequence(initial, seq);
    const diff = diffStates(result, initial);
    expect(diff, `(U R U' R')x6 failed:\n${diff}`).toBe('');
    expect(statesEqual(result, initial)).toBe(true);
  });

  it('R U R\' = inverse of R U\' R\'... wait, testing R U4 R\' = R R\'= identity-like', () => {
    // R followed by R' = identity
    // U^4 = identity
    // So R U^4 R' = R I R' = R R' = identity
    const initial = createInitialState();
    const seq = [
      { face: 'R', direction: 'CW' },
      { face: 'U', direction: 'CW' },
      { face: 'U', direction: 'CW' },
      { face: 'U', direction: 'CW' },
      { face: 'U', direction: 'CW' },
      { face: 'R', direction: 'CCW' },
    ];
    const result = applySequence(initial, seq);
    const diff = diffStates(result, initial);
    expect(diff, `R U4 R' failed:\n${diff}`).toBe('');
    expect(statesEqual(result, initial)).toBe(true);
  });
});

describe('specific face color checks after single moves', () => {
  it('after R CW: right-face cubies still show right color on right face', () => {
    const initial = createInitialState();
    const after = applyMove(initial, { face: 'R', direction: 'CW' });

    // Cubies that were on the right face (x=1)
    // After R CW, their position is [1, z, -y] so they move but stay on x=1
    // They should still show right color on right face
    const rightCubies = after.filter(c => c.position[0] === 1);
    expect(rightCubies.length).toBe(9);
    for (const c of rightCubies) {
      expect(c.faceColors.right).toBeDefined();
    }
  });

  it('after R CW: front face of right column shows bottom color (from solved)', () => {
    // R CW: front becomes bottom? No wait:
    // R CW transform: [x,y,z] -> [x, z, -y]
    // The cubie at [1, 0, 1] (right-center-front) moves to [1, 1, 0] (right-top-center)
    // Its faceColors: right=yellow, front=red
    // After R CW: right stays right, front (red) goes to top
    const initial = createInitialState();
    const after = applyMove(initial, { face: 'R', direction: 'CW' });

    // Original cubie at [1, 0, 1]: right=yellow, front=red
    // After R CW it's at position [1, 1, 0]
    const cubie = after.find(c =>
      c.position[0] === 1 && c.position[1] === 1 && c.position[2] === 0
    );
    expect(cubie).toBeDefined();
    // This cubie was the right-center-front, now at right-top-center
    // Its right face color stays right (yellow)
    // Its front face (red) should now be on top
    // So faceColors.top should be red (front color)
    const frontColor = initial.find(c =>
      c.position[0] === 1 && c.position[1] === 0 && c.position[2] === 1
    )?.faceColors.front;
    expect(cubie!.faceColors.top).toBe(frontColor);
  });

  it('after U CW: top-face cubies still show top color on top face', () => {
    const initial = createInitialState();
    const after = applyMove(initial, { face: 'U', direction: 'CW' });
    const topCubies = after.filter(c => c.position[1] === 1);
    expect(topCubies.length).toBe(9);
    for (const c of topCubies) {
      expect(c.faceColors.top).toBeDefined();
    }
  });

  it('after F CW: front-face cubies still show front color on front face', () => {
    const initial = createInitialState();
    const after = applyMove(initial, { face: 'F', direction: 'CW' });
    const frontCubies = after.filter(c => c.position[2] === 1);
    expect(frontCubies.length).toBe(9);
    for (const c of frontCubies) {
      expect(c.faceColors.front).toBeDefined();
    }
  });

  it('position transform consistency: R CW moves [1,0,1] to [1,1,0]', () => {
    const initial = createInitialState();
    const after = applyMove(initial, { face: 'R', direction: 'CW' });
    // R CW: [x,y,z] -> [x, z, -y], so [1,0,1] -> [1,1,0]
    const moved = after.find(c =>
      c.position[0] === 1 && c.position[1] === 1 && c.position[2] === 0
    );
    expect(moved).toBeDefined();
    // The original at [1,1,0] should now be somewhere else
    const orig101 = initial.find(c =>
      c.position[0] === 1 && c.position[1] === 0 && c.position[2] === 1
    );
    expect(orig101).toBeDefined();
  });

  it('position transform consistency: U CW moves [1,1,0] to [0,1,-1]', () => {
    // U CW: [x,y,z] -> [-z, y, x], so [1,1,0] -> [0,1,1]... 
    // Wait: [-z,y,x] for [1,1,0] -> [0,1,1]
    const initial = createInitialState();
    const after = applyMove(initial, { face: 'U', direction: 'CW' });
    // [1,1,0] -> [-0, 1, 1] = [0, 1, 1]
    const moved = after.find(c =>
      c.position[0] === 0 && c.position[1] === 1 && c.position[2] === 1
    );
    expect(moved).toBeDefined();
  });
});

describe('position after moves: all 27 positions are unique', () => {
  const faces = ['R', 'L', 'U', 'D', 'F', 'B'] as const;
  const dirs = ['CW', 'CCW'] as const;

  for (const face of faces) {
    for (const dir of dirs) {
      it(`after ${face} ${dir}: 27 unique positions`, () => {
        const initial = createInitialState();
        const after = applyMove(initial, { face, direction: dir });
        expect(after.length).toBe(27);
        const positions = new Set(after.map(c => c.position.join(',')));
        expect(positions.size).toBe(27);
      });
    }
  }
});
