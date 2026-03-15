import type { MoveMacro, SolverSnapshot } from '../types';

const OLL_BLUEPRINT: MoveMacro[] = [
  { name: 'oll:edges', turns: [] },
  { name: 'oll:corners', turns: [] },
];

export function buildOLLMacros(_snapshot: SolverSnapshot): MoveMacro[] {
  return OLL_BLUEPRINT.map((macro) => ({
    name: macro.name,
    turns: macro.turns,
  }));
}
