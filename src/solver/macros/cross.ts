import type { MoveMacro, SolverSnapshot } from '../types';

const CROSS_BLUEPRINT: MoveMacro[] = [
  { name: 'cross:daisy', turns: [] },
  { name: 'cross:lineup', turns: [] },
  { name: 'cross:insert', turns: [] },
];

export function buildCrossMacros(_snapshot: SolverSnapshot): MoveMacro[] {
  return CROSS_BLUEPRINT.map((macro) => ({
    name: macro.name,
    turns: macro.turns,
  }));
}
