import { CUBIE_POSITIONS } from './cubeGeometry';

export function createInitialState() {
  return CUBIE_POSITIONS.map(({ x, y, z }) => ({
    id: `cubie-${x}-${y}-${z}`,
    position: [x, y, z],
  }));
}

const FACE_AXIS = {
  R: [0, 1],
  L: [0, -1],
  U: [1, 1],
  D: [1, -1],
  F: [2, 1],
  B: [2, -1],
};

export function selectFace(state, face) {
  const [axis, value] = FACE_AXIS[face];
  return state.filter((cubie) => cubie.position[axis] === value);
}

export const ROTATION_TRANSFORMS = {
  R: {
    CW:  ([x, y, z]) => [x, z, -y],
    CCW: ([x, y, z]) => [x, -z, y],
  },
  L: {
    CW:  ([x, y, z]) => [x, -z, y],
    CCW: ([x, y, z]) => [x, z, -y],
  },
  U: {
    CW:  ([x, y, z]) => [-z, y, x],
    CCW: ([x, y, z]) => [z, y, -x],
  },
  D: {
    CW:  ([x, y, z]) => [z, y, -x],
    CCW: ([x, y, z]) => [-z, y, x],
  },
  F: {
    CW:  ([x, y, z]) => [-y, x, z],
    CCW: ([x, y, z]) => [y, -x, z],
  },
  B: {
    CW:  ([x, y, z]) => [y, -x, z],
    CCW: ([x, y, z]) => [-y, x, z],
  },
};

export function applyMove(state, { face, direction }) {
  const [axis, value] = FACE_AXIS[face];
  const transform = ROTATION_TRANSFORMS[face][direction];
  return state.map((cubie) => {
    if (cubie.position[axis] !== value) return cubie;
    return { id: cubie.id, position: transform(cubie.position) };
  });
}

export function getRotationAxis(face) {
  if (face === 'R' || face === 'L') return [1, 0, 0];
  if (face === 'U' || face === 'D') return [0, 1, 0];
  return [0, 0, 1];
}

const ANGLE_SIGN = { R: -1, L: 1, U: -1, D: 1, F: -1, B: 1 };

export function getRotationAngle(face, direction) {
  const sign = ANGLE_SIGN[face];
  return direction === 'CW' ? sign * (Math.PI / 2) : -sign * (Math.PI / 2);
}

export const KEY_MAP = {
  r: { face: 'R', direction: 'CW' },
  l: { face: 'L', direction: 'CW' },
  u: { face: 'U', direction: 'CW' },
  d: { face: 'D', direction: 'CW' },
  f: { face: 'F', direction: 'CW' },
  b: { face: 'B', direction: 'CW' },
};

export const ANIMATION_DURATION = 0.3;
