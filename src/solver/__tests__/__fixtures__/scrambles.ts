import type { Cubie } from '../../../utils/cubeGeometry';
import { applyMove, buildStateSnapshot, createInitialState } from '../../../utils/cubeState';

export type MoveCommand = { face: string; direction: string };

export const SOLVED_STATE: Cubie[] = createInitialState();

export function applySequence(base: Cubie[], sequence: MoveCommand[]): Cubie[] {
  let state = buildStateSnapshot(base);
  for (const move of sequence) {
    state = applyMove(state, move);
  }
  return state;
}

export const SCRAMBLES: Record<string, MoveCommand[]> = {
  easy: [
    { face: 'R', direction: 'CW' },
    { face: 'U', direction: 'CW' },
    { face: 'R', direction: 'CCW' },
  ],
  medium: [
    { face: 'R', direction: 'CW' },
    { face: 'U', direction: 'CW' },
    { face: 'R', direction: 'CCW' },
    { face: 'U', direction: 'CCW' },
    { face: 'F', direction: 'CW' },
    { face: 'F', direction: 'CW' },
  ],
  loop: [
    { face: 'U', direction: 'CW' },
    { face: 'R', direction: 'CW' },
    { face: 'U', direction: 'CCW' },
    { face: 'R', direction: 'CCW' },
  ],
};
