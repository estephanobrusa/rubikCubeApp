import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { CUBIE_SIZE, getCubieMaterials } from '../utils/cubeGeometry';
import {
  selectFace,
  getRotationAxis,
  getRotationAngle,
  ANIMATION_DURATION,
} from '../utils/cubeState';

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export default function RubiksCube({ cubies, moveQueueRef, onMoveDone }) {
  const geometry = useMemo(
    () => new THREE.BoxGeometry(CUBIE_SIZE, CUBIE_SIZE, CUBIE_SIZE),
    []
  );

  // Materials keyed by cubie id (created once, travel with the cubie)
  const materialsMap = useMemo(() => {
    const map = {};
    cubies.forEach((cubie) => {
      const [ix, iy, iz] = cubie.id.match(/-?\d/g).map(Number);
      map[cubie.id] = getCubieMaterials(ix, iy, iz);
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mesh refs: cubie.id → THREE.Mesh
  const meshRefs = useRef(new Map());

  // Animation group — temp parent for rotating cubies
  const animGroupRef = useRef(null);

  // Animation state (all in refs to avoid re-renders per frame)
  const animRef = useRef({
    active: false,
    move: null,
    progress: 0,
    axis: null,
    angle: 0,
    affectedIds: null,
  });

  // Keep a ref-mirror of cubies so useFrame always sees latest state
  const cubiesRef = useRef(cubies);
  cubiesRef.current = cubies;

  useFrame((_state, delta) => {
    const anim = animRef.current;
    const queue = moveQueueRef.current;

    // Idle: try to dequeue
    if (!anim.active) {
      if (queue.length === 0) return;
      const move = queue.shift();
      const face = selectFace(cubiesRef.current, move.face);
      const ids = new Set(face.map((c) => c.id));

      // Reparent affected meshes into animation group
      const group = animGroupRef.current;
      group.rotation.set(0, 0, 0);
      group.updateMatrixWorld(true);

      ids.forEach((id) => {
        const mesh = meshRefs.current.get(id);
        if (mesh) {
          // Preserve world position when reparenting
          group.attach(mesh);
        }
      });

      anim.active = true;
      anim.move = move;
      anim.progress = 0;
      anim.axis = getRotationAxis(move.face);
      anim.angle = getRotationAngle(move.face, move.direction);
      anim.affectedIds = ids;
      return;
    }

    // Animating: interpolate rotation
    anim.progress += delta / ANIMATION_DURATION;
    const t = Math.min(anim.progress, 1);
    const eased = easeInOutCubic(t);
    const currentAngle = anim.angle * eased;

    const group = animGroupRef.current;
    const [ax, ay, az] = anim.axis;
    group.rotation.set(ax * currentAngle, ay * currentAngle, az * currentAngle);

    // Animation complete
    if (t >= 1) {
      // Snap to exact final angle
      const finalAngle = anim.angle;
      group.rotation.set(ax * finalAngle, ay * finalAngle, az * finalAngle);
      group.updateMatrixWorld(true);

      // Reparent meshes back to the main group (parent of animGroup)
      const mainGroup = group.parent;
      const idsArray = Array.from(anim.affectedIds);
      idsArray.forEach((id) => {
        const mesh = meshRefs.current.get(id);
        if (mesh) {
          mainGroup.attach(mesh);
        }
      });

      // Reset animation group
      group.rotation.set(0, 0, 0);

      // Update React state
      onMoveDone(anim.move);

      anim.active = false;
      anim.move = null;
      anim.affectedIds = null;
    }
  });

  return (
    <group>
      <group ref={animGroupRef} />
      {cubies.map((cubie) => (
        <mesh
          key={cubie.id}
          ref={(el) => {
            if (el) meshRefs.current.set(cubie.id, el);
            else meshRefs.current.delete(cubie.id);
          }}
          position={cubie.position}
          geometry={geometry}
          material={materialsMap[cubie.id]}
        />
      ))}
    </group>
  );
}
