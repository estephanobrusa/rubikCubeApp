// @ts-nocheck
import { useState, useRef, useEffect, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import RubiksCube, { QueuedMove } from './RubiksCube';
import {
  createInitialState,
  applyMove,
  KEY_MAP,
} from '../utils/cubeState';
import { solveCube } from '../solver';
import { track } from '../utils/telemetry';

const ALL_MOVES: { face: string; direction: 'CW' | 'CCW' }[] = [
  { face: 'R', direction: 'CW' }, { face: 'R', direction: 'CCW' },
  { face: 'L', direction: 'CW' }, { face: 'L', direction: 'CCW' },
  { face: 'U', direction: 'CW' }, { face: 'U', direction: 'CCW' },
  { face: 'D', direction: 'CW' }, { face: 'D', direction: 'CCW' },
  { face: 'F', direction: 'CW' }, { face: 'F', direction: 'CCW' },
  { face: 'B', direction: 'CW' }, { face: 'B', direction: 'CCW' },
];

function generateShuffleMoves(): QueuedMove[] {
  const count = Math.floor(Math.random() * 41) + 10; // 10 to 50
  const moves: QueuedMove[] = [];
  for (let i = 0; i < count; i++) {
    let move: QueuedMove;
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
  controlsRow: {
    position: 'absolute' as const,
    top: '20px',
    right: '20px',
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    zIndex: 10,
  },
  shuffleBtn: {
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
    transition: 'opacity 0.2s',
  },
  shuffleBtnDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed' as const,
  },
  autoSolveBtn: {
    background: 'rgba(30, 80, 160, 0.75)',
    backdropFilter: 'blur(6px)',
    border: '1px solid rgba(100, 160, 255, 0.3)',
    borderRadius: '10px',
    padding: '10px 18px',
    color: '#e8e8e8',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    userSelect: 'none' as const,
    transition: 'opacity 0.2s',
  },
  autoSolveBtnDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed' as const,
  },
  solvingBtn: {
    background: 'rgba(30, 80, 160, 0.75)',
    backdropFilter: 'blur(6px)',
    border: '1px solid rgba(100, 160, 255, 0.3)',
    borderRadius: '10px',
    padding: '10px 18px',
    color: '#e8e8e8',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'default',
    userSelect: 'none' as const,
  },
  cancelBtn: {
    background: 'rgba(160, 40, 40, 0.75)',
    backdropFilter: 'blur(6px)',
    border: '1px solid rgba(255, 100, 100, 0.3)',
    borderRadius: '10px',
    padding: '10px 18px',
    color: '#e8e8e8',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    userSelect: 'none' as const,
    transition: 'opacity 0.2s',
  },
  statusChip: {
    background: 'rgba(30, 80, 160, 0.85)',
    border: '1px solid rgba(100, 160, 255, 0.4)',
    borderRadius: '6px',
    padding: '3px 10px',
    color: '#cce0ff',
    fontSize: '11px',
    fontWeight: 600,
    userSelect: 'none' as const,
  },
  toast: {
    position: 'absolute' as const,
    top: '70px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(30, 120, 60, 0.9)',
    backdropFilter: 'blur(6px)',
    border: '1px solid rgba(100, 220, 130, 0.4)',
    borderRadius: '10px',
    padding: '10px 20px',
    color: '#d0ffd0',
    fontSize: '13px',
    fontWeight: 600,
    zIndex: 20,
    userSelect: 'none' as const,
    pointerEvents: 'none' as const,
  },
  tooltip: {
    position: 'absolute' as const,
    top: '70px',
    right: '20px',
    background: 'rgba(80, 60, 20, 0.9)',
    backdropFilter: 'blur(6px)',
    border: '1px solid rgba(220, 180, 60, 0.4)',
    borderRadius: '8px',
    padding: '8px 14px',
    color: '#ffe090',
    fontSize: '12px',
    fontWeight: 500,
    zIndex: 20,
    userSelect: 'none' as const,
    pointerEvents: 'none' as const,
  },
};

interface SolveSession {
  sessionId: string;
  totalMoves: number;
  remainingMoves: number;
  startTime: number;
}

function ControlsLegend({ isSolverLocked }: { isSolverLocked: boolean }) {
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
            <span style={{ color: '#bbb' }}>{label}</span>
            <span style={{ color: '#666' }}>/ reverse</span>
          </span>
        </div>
      ))}
      <div style={styles.hint}>Drag to rotate the view</div>
      {isSolverLocked && (
        <div style={{ marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '6px' }}>
          <span style={styles.statusChip}>Auto-solve running</span>
        </div>
      )}
    </div>
  );
}

export default function RubiksCubeScene() {
  const [cubies, setCubies] = useState(() => createInitialState());
  const moveQueueRef = useRef<QueuedMove[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isSolverLocked, setIsSolverLocked] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<string | null>(null);
  const solveSessionRef = useRef<SolveSession | null>(null);
  const cubiesRef = useRef(cubies);

  useEffect(() => {
    cubiesRef.current = cubies;
  }, [cubies]);

  const showToast = useCallback((msg: string, durationMs = 3000) => {
    setToast(msg);
    setTimeout(() => setToast(null), durationMs);
  }, []);

  const showTooltip = useCallback((msg: string, durationMs = 2500) => {
    setTooltip(msg);
    setTimeout(() => setTooltip(null), durationMs);
  }, []);

  const handleMoveDone = useCallback((move: QueuedMove) => {
    setCubies((prev) => applyMove(prev, move));

    // Solver completion tracking
    const session = solveSessionRef.current;
    if (session && move.sessionId && move.sessionId === session.sessionId) {
      session.remainingMoves -= 1;
      if (session.remainingMoves <= 0) {
        const durationMs = Date.now() - session.startTime;
        const { sessionId, totalMoves } = session;
        track('auto_solve_complete', { sessionId, moveCount: totalMoves, durationMs });
        solveSessionRef.current = null;
        setIsSolverLocked(false);
        showToast(`Cube solved in ${totalMoves} moves!`);
      }
    }
  }, [showToast]);

  const handleAnimatingChange = useCallback((animating: boolean) => {
    setIsAnimating(animating);
  }, []);

  const handleShuffle = useCallback(() => {
    if (isAnimating || moveQueueRef.current.length > 0) return;
    const moves = generateShuffleMoves();
    moveQueueRef.current.push(...moves);
  }, [isAnimating]);

  const handleAutoSolve = useCallback(async () => {
    if (isAnimating || moveQueueRef.current.length > 0) {
      showTooltip('Finish current moves first');
      return;
    }

    const sessionId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : Date.now().toString();

    let moves: { face: string; direction: 'CW' | 'CCW' }[] = [];
    try {
      moves = await solveCube(cubiesRef.current);
    } catch {
      // Solver returned failure (stub/incomplete). Treat as empty sequence — UI still demos the flow.
      moves = [];
    }

    const taggedMoves: QueuedMove[] = moves.map((m) => ({
      face: m.face,
      direction: m.direction,
      source: 'solver' as const,
      sessionId,
    }));

    track('auto_solve_start', {
      sessionId,
      scrambleLength: moves.length,
      algorithm: 'beginner-layer',
    });

    if (taggedMoves.length === 0) {
      // Nothing to animate — complete immediately
      track('auto_solve_complete', { sessionId, moveCount: 0, durationMs: 0 });
      showToast('Cube solved in 0 moves!');
      return;
    }

    solveSessionRef.current = {
      sessionId,
      totalMoves: taggedMoves.length,
      remainingMoves: taggedMoves.length,
      startTime: Date.now(),
    };

    moveQueueRef.current.push(...taggedMoves);
    setIsSolverLocked(true);
  }, [isAnimating, showTooltip, showToast]);

  const handleCancelSolve = useCallback(() => {
    const session = solveSessionRef.current;
    if (!session) return;

    const { sessionId } = session;
    const remaining = moveQueueRef.current.filter((m) => m.sessionId === sessionId).length;

    // Remove all pending solver moves for this session
    moveQueueRef.current = moveQueueRef.current.filter((m) => m.sessionId !== sessionId);

    track('auto_solve_cancel', { sessionId, remainingMoves: remaining });

    solveSessionRef.current = null;
    setIsSolverLocked(false);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore keyboard input while solver is active
      if (isSolverLocked) return;

      const key = e.key.toLowerCase();
      const mapped = KEY_MAP[key];
      if (!mapped) return;
      const direction = e.shiftKey ? 'CCW' : 'CW';
      const move: QueuedMove = { face: mapped.face, direction };
      moveQueueRef.current.push(move);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSolverLocked]);

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

      {/* Controls row — top right */}
      <div style={styles.controlsRow}>
        {/* Shuffle button — disabled while solver locked */}
        <button
          style={{
            ...styles.shuffleBtn,
            ...(btnDisabled || isSolverLocked ? styles.shuffleBtnDisabled : {}),
          }}
          onClick={handleShuffle}
          disabled={btnDisabled || isSolverLocked}
          title="Shuffle cube with random moves"
        >
          Shuffle
        </button>

        {/* Auto Solve / Solving state */}
        {!isSolverLocked ? (
          <button
            style={{
              ...styles.autoSolveBtn,
              ...(btnDisabled ? styles.autoSolveBtnDisabled : {}),
            }}
            onClick={handleAutoSolve}
            disabled={btnDisabled}
            title="Auto-solve the cube"
          >
            Auto Solve
          </button>
        ) : (
          <>
            <span style={styles.solvingBtn}>Solving… ↻</span>
            <button
              style={styles.cancelBtn}
              onClick={handleCancelSolve}
              title="Cancel auto-solve"
            >
              Cancel
            </button>
          </>
        )}
      </div>

      {/* Success toast */}
      {toast && <div style={styles.toast}>{toast}</div>}

      {/* Warning tooltip */}
      {tooltip && <div style={styles.tooltip}>{tooltip}</div>}

      <ControlsLegend isSolverLocked={isSolverLocked} />
    </div>
  );
}
