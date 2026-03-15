import type { Cubie } from '../utils/cubeGeometry';
import type { DirectionKey, FaceKey } from '../utils/cubeState';

export type MoveDirection = DirectionKey;
export type MoveFace = FaceKey;

export type MoveTurn = {
  face: MoveFace;
  direction: MoveDirection;
  double?: boolean;
};

export type MoveDescriptor = MoveTurn;

export interface SolverMoveDescriptor extends MoveDescriptor {
  source: 'solver';
  sessionId?: string;
}

export interface SolverSnapshot {
  cubies: Cubie[];
}

export interface MoveMacro {
  name: string;
  turns: MoveTurn[];
}

export interface SolverStrategy {
  name: 'beginner-layer';
  solve(
    snapshot: SolverSnapshot,
    context: SolverContext,
  ): Generator<MoveMacro, void, void>;
}

export interface SolverContext {
  scrambleLength: number;
}

export interface StrategyFactory {
  (): SolverStrategy;
}

export type SolverFailureCode = 'invalid_state' | 'limit_exceeded' | 'unsolved';

export class SolverFailure extends Error {
  constructor(
    public readonly code: SolverFailureCode,
    public readonly meta: Record<string, unknown> = {},
  ) {
    super(code);
    this.name = 'SolverFailure';
  }
}

export const MAX_MOVES = 160;
export const MAX_SCRAMBLE_LENGTH = 200;

export interface SolverOptions {
  maxMoves?: number;
  scrambleLength?: number;
  strategyFactory?: StrategyFactory;
}
