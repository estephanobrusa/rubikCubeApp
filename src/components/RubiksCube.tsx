import { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { CUBIE_SIZE, FACE_COLORS } from '../utils/cubeGeometry';
import {
  selectFace,
  getRotationAxis,
  getRotationAngle,
  ANIMATION_DURATION,
} from '../utils/cubeState';

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

interface RubiksCubeProps {
  cubies: any[];
  moveQueueRef: React.RefObject<any[]>;
  onMoveDone: (move: any) => void;
}

interface AnimationRef {
  active: boolean;
  move: any;
  progress: number;
  axis: [number, number, number] | null;
  angle: number;
  affectedIds: Set<string> | null;
}

export default function RubiksCube({ cubies, moveQueueRef, onMoveDone }: RubiksCubeProps) {
  const geometry = useMemo(
    () => new THREE.BoxGeometry(CUBIE_SIZE, CUBIE_SIZE, CUBIE_SIZE),
    []
  );

  const meshRefs = useRef(new Map());
  const animGroupRef = useRef<any>(null);
  const animRef = useRef<AnimationRef>({
    active: false,
    move: null,
    progress: 0,
    axis: null,
    angle: 0,
    affectedIds: null,
  });
  const cubiesRef = useRef(cubies);
  useEffect(() => {
    cubiesRef.current = cubies;
  }, [cubies]);

  useFrame((_state, delta) => {
    const anim = animRef.current;
    const queue = moveQueueRef.current;
    if (!anim.active) {
      if (queue.length === 0) return;
      const move = queue.shift();
      const face = selectFace(cubiesRef.current, move.face);
      const ids = new Set<string>(face.map((c: any) => c.id));
      const group = animGroupRef.current;
      group.rotation.set(0, 0, 0);
      group.updateMatrixWorld(true);
      ids.forEach((id) => {
        const mesh = meshRefs.current.get(id);
        if (mesh) {
          group.attach(mesh);
        }
      });
      anim.active = true;
      anim.move = move;
      anim.progress = 0;
      anim.axis = getRotationAxis(move.face) as [number, number, number];
      anim.angle = getRotationAngle(move.face, move.direction);
      anim.affectedIds = ids;
      return;
    }
    anim.progress += delta / ANIMATION_DURATION;
    const t = Math.min(anim.progress, 1);
    const eased = easeInOutCubic(t);
    const currentAngle = anim.angle * eased;
    const group = animGroupRef.current;
    if (anim.axis) {
      const [ax, ay, az] = anim.axis;
      group.rotation.set(ax * currentAngle, ay * currentAngle, az * currentAngle);
      if (t >= 1) {
        const finalAngle = anim.angle;
        group.rotation.set(ax * finalAngle, ay * finalAngle, az * finalAngle);
        group.updateMatrixWorld(true);
        const mainGroup = group.parent;
        if (anim.affectedIds) {
          const idsArray = Array.from(anim.affectedIds);
          idsArray.forEach((id) => {
            const mesh = meshRefs.current.get(id);
            if (mesh) {
              mainGroup.attach(mesh);
            }
          });
        }
        group.rotation.set(0, 0, 0);
        onMoveDone(anim.move);
        anim.active = false;
        anim.move = null;
        anim.affectedIds = null;
        anim.axis = null;
      }
    }
  });

  return (
    <group>
      <group ref={animGroupRef} />
      {cubies.map((cubie: any) => (
        <mesh
          key={cubie.id}
          ref={(el) => {
            if (el) meshRefs.current.set(cubie.id, el);
            else meshRefs.current.delete(cubie.id);
          }}
          position={cubie.position}
          geometry={geometry}
          material={getMaterialsFromFaceColors(cubie.faceColors)}
        />
      ))}
    </group>
  );
}

const INTERNAL_COLOR = '#333333';

const getMaterialsFromFaceColors = (faceColors: any) => {
    const obj = [
  // Orden Three.js: +X, -X, +Y, -Y, +Z, -Z
  new THREE.MeshStandardMaterial({ color: faceColors?.right  ?? INTERNAL_COLOR }), // +X
  new THREE.MeshStandardMaterial({ color: faceColors?.left   ?? INTERNAL_COLOR }), // -X
  new THREE.MeshStandardMaterial({ color: faceColors?.top    ?? INTERNAL_COLOR }), // +Y
  new THREE.MeshStandardMaterial({ color: faceColors?.bottom ?? INTERNAL_COLOR }), // -Y
  new THREE.MeshStandardMaterial({ color: faceColors?.front  ?? INTERNAL_COLOR }), // +Z
  new THREE.MeshStandardMaterial({ color: faceColors?.back   ?? INTERNAL_COLOR }), // -Z
];
    return obj;
};
