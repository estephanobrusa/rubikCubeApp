// @ts-nocheck
import { useState, useRef, useEffect, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import RubiksCube from './RubiksCube';
import {
  createInitialState,
  applyMove,
  KEY_MAP,
} from '../utils/cubeState';

export default function RubiksCubeScene() {
  const [cubies, setCubies] = useState(() => createInitialState());
  const moveQueueRef = useRef([]);

  const handleMoveDone = useCallback((move) => {
    setCubies((prev) => applyMove(prev, move));
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();
      const mapped = KEY_MAP[key];
      if (!mapped) return;
      const direction = e.shiftKey ? 'CCW' : 'CW';
      moveQueueRef.current.push({ face: mapped.face, direction });
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <Canvas
      camera={{
        position: [4, 4, 4],
        fov: 50,
        near: 0.1,
        far: 100,
      }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />

      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        enableZoom
        enablePan={false}
        minDistance={3}
        maxDistance={15}
      />

      <RubiksCube
        cubies={cubies}
        moveQueueRef={moveQueueRef}
        onMoveDone={handleMoveDone}
      />
    </Canvas>
  );
}
