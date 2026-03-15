import { CUBIE_POSITIONS, FACE_COLORS, Cubie, FaceColors } from './cubeGeometry';

export function createInitialState(): Cubie[] {
  console.log("🚀 ~ createInitialState ~ createInitialState:")
  return CUBIE_POSITIONS.map(({ x, y, z }) => {
    const faceColors: FaceColors = {
      right:  x === 1  ? FACE_COLORS.right  : undefined,
      left:   x === -1 ? FACE_COLORS.left   : undefined,
      top:    y === 1  ? FACE_COLORS.top    : undefined,
      bottom: y === -1 ? FACE_COLORS.bottom : undefined,
      front:  z === 1  ? FACE_COLORS.front  : undefined,
      back:   z === -1 ? FACE_COLORS.back   : undefined,
    };
    return {
      id: `cubie-${x}-${y}-${z}`,
      position: [x, y, z],
      faceColors,
    };
  });
}

const FACE_AXIS: Record<FaceKey, [number, number]> = {
  R: [0, 1],
  L: [0, -1],
  U: [1, 1],
  D: [1, -1],
  F: [2, 1],
  B: [2, -1],
};

type FaceKey = 'R' | 'L' | 'U' | 'D' | 'F' | 'B';
type DirectionKey = 'CW' | 'CCW';

export function selectFace(state: Cubie[], face: string) {
  const [axis, value] = FACE_AXIS[face as FaceKey];
  return state.filter((cubie) => cubie.position[axis] === value);
}

export const ROTATION_TRANSFORMS: Record<FaceKey, Record<DirectionKey, (pos: number[]) => number[]>> = {
  R: {
    CW:  ([x, y, z]: number[]) => [x, z, -y],
    CCW: ([x, y, z]: number[]) => [x, -z, y],
  },
  L: {
    CW:  ([x, y, z]: number[]) => [x, -z, y],
    CCW: ([x, y, z]: number[]) => [x, z, -y],
  },
  U: {
    CW:  ([x, y, z]: number[]) => [-z, y, x],
    CCW: ([x, y, z]: number[]) => [z, y, -x],
  },
  D: {
    CW:  ([x, y, z]: number[]) => [z, y, -x],
    CCW: ([x, y, z]: number[]) => [-z, y, x],
  },
  F: {
    CW:  ([x, y, z]: number[]) => [-y, x, z],
    CCW: ([x, y, z]: number[]) => [y, -x, z],
  },
  B: {
    CW:  ([x, y, z]: number[]) => [y, -x, z],
    CCW: ([x, y, z]: number[]) => [-y, x, z],
  },
};

export function applyMove(state: Cubie[], { face, direction }: { face: string, direction: string }) {
  const [axis, value] = FACE_AXIS[face as FaceKey];
  const transform = ROTATION_TRANSFORMS[face as FaceKey][direction as DirectionKey];

  // Tabla semántica: dest: src
  // Cada entrada significa "la cara DEST recibe el color que tenía SRC"
  const FACE_PERMUTATION: Record<FaceKey, Record<DirectionKey, Record<keyof FaceColors, keyof FaceColors>>> = {
    U: {
      CW:  { right: 'back',  front: 'right', left: 'front', back: 'left',  top: 'top', bottom: 'bottom' },
      CCW: { right: 'front', back: 'right',  left: 'back',  front: 'left', top: 'top', bottom: 'bottom' },
    },
    D: {
      CW:  { right: 'front', back: 'right',  left: 'back',  front: 'left', top: 'top', bottom: 'bottom' },
      CCW: { right: 'back',  front: 'right', left: 'front', back: 'left',  top: 'top', bottom: 'bottom' },
    },
    F: {
      CW:  { left: 'top',  bottom: 'left', right: 'bottom', top: 'right', front: 'front', back: 'back' },
      CCW: { right: 'top', bottom: 'right', left: 'bottom', top: 'left',  front: 'front', back: 'back' },
    },
    B: {
      CW:  { right: 'top', bottom: 'right', left: 'bottom', top: 'left',  front: 'front', back: 'back' },
      CCW: { left: 'top',  bottom: 'left',  right: 'bottom', top: 'right', front: 'front', back: 'back' },
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

  return state.map((cubie) => {
    if (cubie.position[axis] !== value) return cubie;

    const newPosition = transform(cubie.position);
    const permutation = FACE_PERMUTATION[face as FaceKey][direction as DirectionKey];
    const newFaceColors: FaceColors = {};

    // dest recibe el color de src
    (Object.keys(cubie.faceColors) as (keyof FaceColors)[]).forEach((dest) => {
      const src = permutation[dest] ?? dest;
      newFaceColors[dest] = cubie.faceColors[src];
    });

    return { id: cubie.id, position: newPosition, faceColors: newFaceColors };
  });
}

export function getRotationAxis(face: string): [number, number, number] {
  if (face === 'R' || face === 'L') return [1, 0, 0];
  if (face === 'U' || face === 'D') return [0, 1, 0];
  return [0, 0, 1];
}

const ANGLE_SIGN: Record<string, number> = { R: -1, L: 1, U: -1, D: 1, F: -1, B: 1 };

export function getRotationAngle(face: string, direction: string): number {
  const sign = ANGLE_SIGN[face];
  return direction === 'CW' ? sign * (Math.PI / 2) : -sign * (Math.PI / 2);
}

export const KEY_MAP: Record<string, { face: string, direction: string }> = {
  r: { face: 'R', direction: 'CW' },
  l: { face: 'L', direction: 'CW' },
  u: { face: 'U', direction: 'CW' },
  d: { face: 'D', direction: 'CW' },
  f: { face: 'F', direction: 'CW' },
  b: { face: 'B', direction: 'CW' },
};

export const ANIMATION_DURATION = 0.3;
