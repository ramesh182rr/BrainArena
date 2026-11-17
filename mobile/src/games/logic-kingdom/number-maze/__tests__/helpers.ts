import { parseMaze } from '../authored';
import { numberMaze } from '../module';
import { solveMaze } from '../solver';
import type { NumberMazeAction, NumberMazeState } from '../types';

export function mazeState(header: string, rows: readonly string[]): NumberMazeState {
  const parsed = parseMaze(header, rows);
  const start = parsed.cells.findIndex((c) => c.t === 'start');
  const base = { ...parsed, path: [start], values: [parsed.startValue], par: 0 };
  const r = solveMaze(base, [start], parsed.startValue);
  return { ...base, par: r.status === 'solved' ? r.moves : 0 };
}

/** Move actions along the shortest solution from the current position. */
export function solvingMoves(state: NumberMazeState): NumberMazeAction[] {
  const r = solveMaze(state, state.path, state.values[state.values.length - 1] as number);
  if (r.status !== 'solved') throw new Error(`Maze not solvable: ${r.status}`);
  return r.path.slice(state.path.length).map((index) => ({ type: 'move', index }));
}

export function applyAll(state: NumberMazeState, actions: readonly NumberMazeAction[]): NumberMazeState {
  return actions.reduce((s, a) => numberMaze.reduce(s, a), state);
}
