import type { MoveMacro, SolverSnapshot } from '../types';

const PLL_BLUEPRINT: MoveMacro[] = [
  { name: 'pll:edges', turns: [] },
  { name: 'pll:corners', turns: [] },
];

export function buildPLLMacros(_snapshot: SolverSnapshot): MoveMacro[] {
  return PLL_BLUEPRINT.map((macro) => ({
    name: macro.name,
    turns: macro.turns,
  }));
}
