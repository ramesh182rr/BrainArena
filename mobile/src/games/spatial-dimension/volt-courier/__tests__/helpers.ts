import { parseBoard } from '../authored';
import { turnsBetween } from '../grid';
import { voltCourier } from '../module';
import { solve } from '../solver';
import type { VoltCourierAction, VoltCourierState, Cell } from '../types';

/** Builds a playable state from text rows (see authored.ts for the format). */
export function boardState(rows: readonly string[]): VoltCourierState {
  const board = parseBoard(rows);
  const result = solve(board);
  return {
    ...board,
    initialRotations: board.rotations,
    history: [],
    turns: 0,
    par: result.status === 'solved' ? result.cost : 0,
  };
}

/** The rotate actions that turn `state` into its minimum-turn solution. */
export function solvingActions(state: VoltCourierState): VoltCourierAction[] {
  const result = solve(state);
  if (result.status !== 'solved') throw new Error(`Board not solvable: ${result.status}`);
  const actions: VoltCourierAction[] = [];
  result.rotations.forEach((target, index) => {
    const cell = state.cells[index] as Cell;
    const turns = turnsBetween(cell, state.rotations[index] ?? 0, target);
    for (let t = 0; t < turns; t += 1) actions.push({ type: 'rotate', index });
  });
  return actions;
}

export function applyAll(state: VoltCourierState, actions: readonly VoltCourierAction[]): VoltCourierState {
  return actions.reduce((s, a) => voltCourier.reduce(s, a), state);
}

/** Row-major index helper for readable tests. */
export const at = (width: number, row: number, col: number) => row * width + col;
