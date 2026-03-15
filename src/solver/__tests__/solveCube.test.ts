import { describe, expect, it } from 'vitest';
import { applyMove, buildStateSnapshot, createInitialState } from '../../utils/cubeState';
import { solveCube, SolverFailure, serializeState } from '..';
import { SCRAMBLES, SOLVED_STATE, applySequence } from './__fixtures__/scrambles';

describe('solveCube', () => {
  it('returns empty array for solved state', async () => {
    const result = await solveCube(SOLVED_STATE);
    expect(result).toEqual([]);
  });

  it('throws invalid_state when snapshot length differs', async () => {
    await expect(solveCube(SOLVED_STATE.slice(0, 10))).rejects.toBeInstanceOf(SolverFailure);
  });

  it('solves a 3-move scramble (easy) and actually reaches solved state', async () => {
    const scrambled = applySequence(SOLVED_STATE, SCRAMBLES.easy);
    const solution = await solveCube(scrambled);

    // Apply solution moves and verify we reach solved state
    let result = buildStateSnapshot(scrambled);
    for (const move of solution) {
      result = applyMove(result, move);
    }
    expect(serializeState(result)).toBe(serializeState(createInitialState()));
  });

  it('solves a 6-move scramble (medium) and actually reaches solved state', async () => {
    const scrambled = applySequence(SOLVED_STATE, SCRAMBLES.medium);
    const solution = await solveCube(scrambled);

    let result = buildStateSnapshot(scrambled);
    for (const move of solution) {
      result = applyMove(result, move);
    }
    expect(serializeState(result)).toBe(serializeState(createInitialState()));
  }, 15000); // allow up to 15s for IDA*

  it('enforces move limit guard', async () => {
    const scrambled = applySequence(SOLVED_STATE, SCRAMBLES.loop);
    const promise = solveCube(scrambled, {
      maxMoves: 1,
      strategyFactory: () => ({
        name: 'beginner-layer',
        *solve() {
          yield { name: 'test', turns: [{ face: 'R', direction: 'CW' }, { face: 'R', direction: 'CW' }] };
        },
      }),
    });
    await expect(promise).rejects.toMatchObject({ code: 'limit_exceeded' });
  });

  it('does not mutate the provided cubies reference', async () => {
    const scrambled = applySequence(SOLVED_STATE, SCRAMBLES.easy);
    const before = buildStateSnapshot(scrambled);
    await solveCube(scrambled);
    expect(buildStateSnapshot(scrambled)).toEqual(before);
  });

  it('solves a 1-move scramble', async () => {
    const scrambled = applyMove(createInitialState(), { face: 'R', direction: 'CW' });
    const solution = await solveCube(scrambled);

    let result = buildStateSnapshot(scrambled);
    for (const move of solution) {
      result = applyMove(result, move);
    }
    expect(serializeState(result)).toBe(serializeState(createInitialState()));
  });

  it('solves a 2-move scramble', async () => {
    let scrambled = createInitialState();
    scrambled = applyMove(scrambled, { face: 'U', direction: 'CW' });
    scrambled = applyMove(scrambled, { face: 'R', direction: 'CCW' });
    const solution = await solveCube(scrambled);

    let result = buildStateSnapshot(scrambled);
    for (const move of solution) {
      result = applyMove(result, move);
    }
    expect(serializeState(result)).toBe(serializeState(createInitialState()));
  });
});
