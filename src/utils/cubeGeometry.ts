import * as THREE from 'three';

export interface FaceColors {
  right?: string;
  left?: string;
  top?: string;
  bottom?: string;
  front?: string;
  back?: string;
}

export interface Cubie {
  id: string;
  position: [number, number, number];
  faceColors: FaceColors;
}

export const FACE_COLORS: Record<string, string> = {
  right: '#FFD500', // yellow
  left: '#FF9900', // orange
  top: '#FFFFFF', // white
  bottom: '#009B48', // green
  front: '#C41E3A', // red
  back: '#0051BA', // blue
};

export const CUBIE_SIZE = 0.98;

export const CUBIE_POSITIONS = [
  { x: -1, y: -1, z: -1 }, { x: 0, y: -1, z: -1 }, { x: 1, y: -1, z: -1 },
  { x: -1, y:  0, z: -1 }, { x: 0, y:  0, z: -1 }, { x: 1, y:  0, z: -1 },
  { x: -1, y:  1, z: -1 }, { x: 0, y:  1, z: -1 }, { x: 1, y:  1, z: -1 },

  { x: -1, y: -1, z:  0 }, { x: 0, y: -1, z:  0 }, { x: 1, y: -1, z:  0 },
  { x: -1, y:  0, z:  0 }, { x: 0, y:  0, z:  0 }, { x: 1, y:  0, z:  0 },
  { x: -1, y:  1, z:  0 }, { x: 0, y:  1, z:  0 }, { x: 1, y:  1, z:  0 },

  { x: -1, y: -1, z:  1 }, { x: 0, y: -1, z:  1 }, { x: 1, y: -1, z:  1 },
  { x: -1, y:  0, z:  1 }, { x: 0, y:  0, z:  1 }, { x: 1, y:  0, z:  1 },
  { x: -1, y:  1, z:  1 }, { x: 0, y:  1, z:  1 }, { x: 1, y:  1, z:  1 },
];

const INTERNAL_COLOR = '#333333';

export function getCubieMaterials(x: number, y: number, z: number): THREE.MeshStandardMaterial[] {
  // Orden: +X (right), -X (left), +Y (top), -Y (bottom), +Z (front), -Z (back)
  return [
    new THREE.MeshStandardMaterial({ color: x === 1  ? FACE_COLORS.right  : INTERNAL_COLOR }),
    new THREE.MeshStandardMaterial({ color: x === -1 ? FACE_COLORS.left   : INTERNAL_COLOR }),
    new THREE.MeshStandardMaterial({ color: y === 1  ? FACE_COLORS.top    : INTERNAL_COLOR }),
    new THREE.MeshStandardMaterial({ color: y === -1 ? FACE_COLORS.bottom : INTERNAL_COLOR }),
    new THREE.MeshStandardMaterial({ color: z === 1  ? FACE_COLORS.front  : INTERNAL_COLOR }),
    new THREE.MeshStandardMaterial({ color: z === -1 ? FACE_COLORS.back   : INTERNAL_COLOR }),
  ];
}
