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

const ALL_MOVES: { face: string; direction: 'CW' | 'CCW' }[] = [
  { face: 'R', direction: 'CW' }, { face: 'R', direction: 'CCW' },
  { face: 'L', direction: 'CW' }, { face: 'L', direction: 'CCW' },
  { face: 'U', direction: 'CW' }, { face: 'U', direction: 'CCW' },
  { face: 'D', direction: 'CW' }, { face: 'D', direction: 'CCW' },
  { face: 'F', direction: 'CW' }, { face: 'F', direction: 'CCW' },
  { face: 'B', direction: 'CW' }, { face: 'B', direction: 'CCW' },
];

function generateShuffleMoves(): { face: string; direction: 'CW' | 'CCW' }[] {
  const count = Math.floor(Math.random() * 41) + 10; // 10 to 50
  const moves: { face: string; direction: 'CW' | 'CCW' }[] = [];
  for (let i = 0; i < count; i++) {
    let move: { face: string; direction: 'CW' | 'CCW' };
    do {
      move = ALL_MOVES[Math.floor(Math.random() * ALL_MOVES.length)];
    } while (moves.length > 0 && moves[moves.length - 1].face === move.face);
    moves.push(move);
  }
  return moves;
}

const CONTROLS: { face: string; key: string; label: string }[] = [
  { face: 'R', key: 'r / R', label: 'Right' },
  { face: 'L', key: 'l / L', label: 'Left' },
  { face: 'U', key: 'u / U', label: 'Up' },
  { face: 'D', key: 'd / D', label: 'Down' },
  { face: 'F', key: 'f / F', label: 'Front' },
  { face: 'B', key: 'b / B', label: 'Back' },
];

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  legend: {
    position: 'absolute',
    bottom: '20px',
    right: '20px',
    background: 'rgba(0, 0, 0, 0.65)',
    backdropFilter: 'blur(6px)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '10px',
    padding: '12px 16px',
    color: '#e8e8e8',
    fontSize: '12px',
    lineHeight: '1.6',
    userSelect: 'none',
    zIndex: 10,
    minWidth: '200px',
  },
  title: {
    fontWeight: 700,
    fontSize: '11px',
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    color: '#aaa',
    marginBottom: '8px',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '4px',
  },
  keys: {
    display: 'flex',
    gap: '4px',
  },
  kbd: {
    fontFamily: 'monospace',
    fontSize: '11px',
    background: 'rgba(255,255,255,0.12)',
    border: '1px solid rgba(255,255,255,0.25)',
    borderRadius: '4px',
    padding: '1px 6px',
    color: '#fff',
    whiteSpace: 'nowrap' as const,
  },
  hint: {
    fontSize: '10px',
    color: '#888',
    marginTop: '8px',
    borderTop: '1px solid rgba(255,255,255,0.08)',
    paddingTop: '6px',
  },
  shuffleBtn: {
    position: 'absolute' as const,
    top: '20px',
    right: '20px',
    background: 'rgba(0, 0, 0, 0.65)',
    backdropFilter: 'blur(6px)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '10px',
    padding: '10px 18px',
    color: '#e8e8e8',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    userSelect: 'none' as const,
    zIndex: 10,
    transition: 'opacity 0.2s',
  },
  shuffleBtnDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed' as const,
  },
};

function ControlsLegend() {
  return (
    <div style={styles.legend}>
      <div style={styles.title}>Move</div>
      {CONTROLS.map(({ face, key, label }) => (
        <div key={face} style={styles.row}>
          <div style={styles.keys}>
            <span style={styles.kbd}>{key.split(' / ')[0]}</span>
            <span style={{ ...styles.kbd, opacity: 0.7 }}>⇧{key.split(' / ')[0].toUpperCase()}</span>
          </div>
          <span>
            <strong style={{ color: '#fff' }}>{face}</strong>
            {' '}
            <span style={{ color: '#bbb' }}>{label}</span>
            {' '}
            <span style={{ color: '#666' }}>/ reverse</span>
          </span>
        </div>
      ))}
      <div style={styles.hint}>Drag to rotate the view</div>
    </div>
  );
}

export default function RubiksCubeScene() {
  const [cubies, setCubies] = useState(() => createInitialState());
  const moveQueueRef = useRef([]);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleMoveDone = useCallback((move) => {
    setCubies((prev) => applyMove(prev, move));
  }, []);

  const handleAnimatingChange = useCallback((animating: boolean) => {
    setIsAnimating(animating);
  }, []);

  const handleShuffle = useCallback(() => {
    if (isAnimating || moveQueueRef.current.length > 0) return;
    const moves = generateShuffleMoves();
    moveQueueRef.current.push(...moves);
  }, [isAnimating]);

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

  const btnDisabled = isAnimating || moveQueueRef.current.length > 0;

  return (
    <div style={styles.wrapper}>
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
          onAnimatingChange={handleAnimatingChange}
        />
      </Canvas>
      <button
        style={{
          ...styles.shuffleBtn,
          ...(btnDisabled ? styles.shuffleBtnDisabled : {}),
        }}
        onClick={handleShuffle}
        disabled={btnDisabled}
        title="Shuffle cube with random moves"
      >
        Shuffle
      </button>
      <ControlsLegend />
    </div>
  );
}
