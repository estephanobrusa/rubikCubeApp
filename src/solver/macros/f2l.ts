import type { MoveMacro, SolverSnapshot } from '../types';

const F2L_BLUEPRINT: MoveMacro[] = [
  { name: 'f2l:pairing', turns: [] },
  { name: 'f2l:insertion', turns: [] },
];

export function buildF2LMacros(_snapshot: SolverSnapshot): MoveMacro[] {
  return F2L_BLUEPRINT.map((macro) => ({
    name: macro.name,
    turns: macro.turns,
  }));
}
