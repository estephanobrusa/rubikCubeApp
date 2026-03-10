import * as THREE from 'three';

// ============================================================
// cubeGeometry.js — Rubik's Cube geometry and color utilities
// ============================================================
// Generates the 26 visible cubie positions for a 3×3×3 cube
// and provides material arrays with WCA-standard face colors.
//
// Three.js BoxGeometry material index order:
//   0: +X (right)   1: -X (left)
//   2: +Y (top)     3: -Y (bottom)
//   4: +Z (front)   5: -Z (back)
// ============================================================

/** Cubie box dimensions (slightly smaller than 1 to show gaps) */
export const CUBIE_SIZE = 0.95;

/**
 * WCA standard Rubik's Cube face colors.
 * Each key maps a face direction to its hex color string.
 */
export const FACE_COLORS = {
  right:  '#FF0000', // +X → Red
  left:   '#FF8800', // -X → Orange
  top:    '#FFFFFF', // +Y → White
  bottom: '#FFFF00', // -Y → Yellow
  front:  '#009900', // +Z → Green
  back:   '#0000FF', // -Z → Blue
};

/** Color for internal (non-visible) cubie faces */
const INTERNAL_COLOR = '#333333';

/**
 * All 26 visible cubie positions in the 3×3×3 grid.
 * The center (0,0,0) is excluded since it has no visible faces.
 * Coordinates range from -1 to +1 on each axis.
 */
export const CUBIE_POSITIONS = (() => {
  const positions = [];
  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      for (let z = -1; z <= 1; z++) {
        // Skip the invisible center cube
        if (x === 0 && y === 0 && z === 0) continue;
        positions.push({ x, y, z });
      }
    }
  }
  return positions;
})();

/**
 * Returns an array of 6 MeshStandardMaterial instances for a cubie
 * at position (x, y, z). Surface faces get their WCA color; all
 * internal faces are dark gray.
 *
 * Material index mapping (Three.js BoxGeometry convention):
 *   [0] +X face → Red    if x === +1
 *   [1] -X face → Orange if x === -1
 *   [2] +Y face → White  if y === +1
 *   [3] -Y face → Yellow if y === -1
 *   [4] +Z face → Green  if z === +1
 *   [5] -Z face → Blue   if z === -1
 *
 * @param {number} x - Cubie x position (-1, 0, or 1)
 * @param {number} y - Cubie y position (-1, 0, or 1)
 * @param {number} z - Cubie z position (-1, 0, or 1)
 * @returns {THREE.MeshStandardMaterial[]} Array of 6 materials
 */
export function getCubieMaterials(x, y, z) {
  const colors = [
    x === 1  ? FACE_COLORS.right  : INTERNAL_COLOR, // [0] +X
    x === -1 ? FACE_COLORS.left   : INTERNAL_COLOR, // [1] -X
    y === 1  ? FACE_COLORS.top    : INTERNAL_COLOR, // [2] +Y
    y === -1 ? FACE_COLORS.bottom : INTERNAL_COLOR, // [3] -Y
    z === 1  ? FACE_COLORS.front  : INTERNAL_COLOR, // [4] +Z
    z === -1 ? FACE_COLORS.back   : INTERNAL_COLOR, // [5] -Z
  ];

  return colors.map(
    (color) => new THREE.MeshStandardMaterial({ color })
  );
}
