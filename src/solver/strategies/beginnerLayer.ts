import { buildCrossMacros } from '../macros/cross';
import { buildF2LMacros } from '../macros/f2l';
import { buildOLLMacros } from '../macros/oll';
import { buildPLLMacros } from '../macros/pll';
import type { MoveMacro, SolverContext, SolverSnapshot, SolverStrategy } from '../types';

export function makeBeginnerLayerStrategy(): SolverStrategy {
  return {
    name: 'beginner-layer',
    *solve(snapshot: SolverSnapshot, _context: SolverContext): Generator<MoveMacro, void, void> {
      const cross = buildCrossMacros(snapshot);
      for (const macro of cross) yield macro;

      const f2l = buildF2LMacros(snapshot);
      for (const macro of f2l) yield macro;

      const oll = buildOLLMacros(snapshot);
      for (const macro of oll) yield macro;

      const pll = buildPLLMacros(snapshot);
      for (const macro of pll) yield macro;
    },
  };
}
