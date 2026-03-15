import { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { CUBIE_SIZE } from '../utils/cubeGeometry';
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
  onAnimatingChange?: (isAnimating: boolean) => void;
}

interface AnimationRef {
  active: boolean;
  move: any;
  progress: number;
  axis: [number, number, number] | null;
  angle: number;
  affectedIds: Set<string> | null;
}

const INTERNAL_COLOR = '#333333';

function getMaterialsFromFaceColors(
  faceColors: any,
  cubieId: string,
  cache: Map<string, THREE.MeshStandardMaterial[]>
): THREE.MeshStandardMaterial[] {
  if (!cache.has(cubieId)) {
    cache.set(cubieId, [
      new THREE.MeshStandardMaterial(), // +X right
      new THREE.MeshStandardMaterial(), // -X left
      new THREE.MeshStandardMaterial(), // +Y top
      new THREE.MeshStandardMaterial(), // -Y bottom
      new THREE.MeshStandardMaterial(), // +Z front
      new THREE.MeshStandardMaterial(), // -Z back
    ]);
  }
  const mats = cache.get(cubieId)!;
  mats[0].color.set(faceColors?.right  ?? INTERNAL_COLOR);
  mats[1].color.set(faceColors?.left   ?? INTERNAL_COLOR);
  mats[2].color.set(faceColors?.top    ?? INTERNAL_COLOR);
  mats[3].color.set(faceColors?.bottom ?? INTERNAL_COLOR);
  mats[4].color.set(faceColors?.front  ?? INTERNAL_COLOR);
  mats[5].color.set(faceColors?.back   ?? INTERNAL_COLOR);
  return mats;
}

export default function RubiksCube({ cubies, moveQueueRef, onMoveDone, onAnimatingChange }: RubiksCubeProps) {
  const cubiesRef = useRef(cubies);

  // ✅ Cache de materiales dentro del componente — se limpia correctamente con el ciclo de vida
  const materialsCache = useRef(new Map<string, THREE.MeshStandardMaterial[]>());

  const geometry = useMemo(
    () => new THREE.BoxGeometry(CUBIE_SIZE, CUBIE_SIZE, CUBIE_SIZE),
    []
  );

  const meshRefs = useRef(new Map<string, THREE.Mesh>());
  const animGroupRef = useRef<THREE.Group>(null!);
  const animRef = useRef<AnimationRef>({
    active: false,
    move: null,
    progress: 0,
    axis: null,
    angle: 0,
    affectedIds: null,
  });

  useEffect(() => {
    cubiesRef.current = cubies;
  }, [cubies]);

  // Limpia materiales de cubies que ya no existen
  useEffect(() => {
    const currentIds = new Set(cubies.map((c: any) => c.id));
    for (const id of materialsCache.current.keys()) {
      if (!currentIds.has(id)) {
        const mats = materialsCache.current.get(id)!;
        mats.forEach((m) => m.dispose());
        materialsCache.current.delete(id);
      }
    }
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
        if (mesh) group.attach(mesh);
      });

      anim.active = true;
      anim.move = move;
      anim.progress = 0;
      anim.axis = getRotationAxis(move.face) as [number, number, number];
      anim.angle = getRotationAngle(move.face, move.direction);
      anim.affectedIds = ids;
      onAnimatingChange?.(true);
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

        const mainGroup = group.parent!;
        if (anim.affectedIds) {
          Array.from(anim.affectedIds).forEach((id) => {
            const mesh = meshRefs.current.get(id);
            if (mesh) {
              mainGroup.attach(mesh);
              // After attach, Three.js bakes the world transform (including rotation)
              // into the mesh's local transform. Reset rotation and snap position to
              // the nearest integer grid coordinate so the face materials always align
              // with world axes (no accumulated rotation drift).
              mesh.rotation.set(0, 0, 0);
              mesh.position.set(
                Math.round(mesh.position.x),
                Math.round(mesh.position.y),
                Math.round(mesh.position.z),
              );
            }
          });
        }

        group.rotation.set(0, 0, 0);
        onMoveDone(anim.move);
        anim.active = false;
        anim.move = null;
        anim.affectedIds = null;
        anim.axis = null;
        // Notify animating done only when queue is also empty
        if (moveQueueRef.current.length === 0) {
          onAnimatingChange?.(false);
        }
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
          material={getMaterialsFromFaceColors(cubie.faceColors, cubie.id, materialsCache.current)}
        />
      ))}
    </group>
  );
}