import { enter, neighbors } from './rules';
import type { MazeCell, NumberMazeState } from './types';

export type MazeSolveResult =
  | { status: 'solved'; path: number[]; moves: number; solutions: number; nodes: number }
  | { status: 'unsolvable'; nodes: number }
  | { status: 'budget_exceeded'; nodes: number };

export const DEFAULT_MAZE_BUDGET = 400_000;

type Board = Pick<NumberMazeState, 'width' | 'height' | 'cells' | 'min' | 'max' | 'target'>;

/**
 * Exhaustive search over simple paths from the end of `prefix`. Returns the
 * shortest route to the exit and how many distinct routes exist (capped at
 * `solutionCap`, used by the generator to reject loose boards).
 */
export function solveMaze(
  board: Board,
  prefix: readonly number[],
  prefixValue: number,
  options: { budget?: number; solutionCap?: number } = {},
): MazeSolveResult {
  const budget = options.budget ?? DEFAULT_MAZE_BUDGET;
  const cap = options.solutionCap ?? 1_000;
  const visited = new Uint8Array(board.cells.length);
  for (const i of prefix) visited[i] = 1;
  const path = [...prefix];
  let best: number[] | null = null;
  let solutions = 0;
  let nodes = 0;
  let aborted = false;

  const walk = (index: number, value: number): void => {
    if (aborted) return;
    nodes += 1;
    if (nodes > budget) {
      aborted = true;
      return;
    }
    for (const next of neighbors(board.width, board.height, index)) {
      if (visited[next]) continue;
      const cell = board.cells[next] as MazeCell;
      const result = enter(board, cell, value);
      if (!result.ok) continue;
      path.push(next);
      if (cell.t === 'exit') {
        solutions += 1;
        if (!best || path.length < best.length) best = [...path];
      } else {
        visited[next] = 1;
        walk(next, result.value);
        visited[next] = 0;
      }
      path.pop();
      if (solutions >= cap) return;
    }
  };

  const start = prefix[prefix.length - 1];
  if (start === undefined) return { status: 'unsolvable', nodes: 0 };
  walk(start, prefixValue);
  if (aborted) return { status: 'budget_exceeded', nodes };
  const found = best as number[] | null;
  return found
    ? { status: 'solved', path: found, moves: found.length - 1, solutions, nodes }
    : { status: 'unsolvable', nodes };
}
