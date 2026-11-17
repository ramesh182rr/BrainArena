import type { MazeCell, NumberMazeState, Op } from './types';

const DR = [-1, 0, 1, 0] as const;
const DC = [0, 1, 0, -1] as const;

export function neighbors(width: number, height: number, index: number): number[] {
  const r = Math.floor(index / width);
  const c = index % width;
  const out: number[] = [];
  for (let d = 0; d < 4; d += 1) {
    const nr = r + DR[d]!;
    const nc = c + DC[d]!;
    if (nr >= 0 && nr < height && nc >= 0 && nc < width) out.push(nr * width + nc);
  }
  return out;
}

/** Applies an arithmetic gate; null when division is not exact. */
export function applyOp(op: Op, n: number, value: number): number | null {
  switch (op) {
    case 'add':
      return value + n;
    case 'sub':
      return value - n;
    case 'mul':
      return value * n;
    case 'div':
      return n !== 0 && value % n === 0 ? value / n : null;
  }
}

export type MoveProblem =
  | 'finished'
  | 'not_adjacent'
  | 'visited'
  | 'blocked'
  | 'not_divisible'
  | 'below_min'
  | 'above_max'
  | 'lock_even'
  | 'lock_odd'
  | 'exit_closed';

export type MoveCheck = { ok: true; value: number } | { ok: false; problem: MoveProblem; value?: number };

type Board = Pick<NumberMazeState, 'width' | 'height' | 'cells' | 'min' | 'max' | 'target'>;

/** Value after entering `cell` with `value`, or the reason the room refuses entry. */
export function enter(board: Board, cell: MazeCell, value: number): MoveCheck {
  switch (cell.t) {
    case 'block':
    case 'start':
      return { ok: false, problem: 'blocked' };
    case 'exit':
      return value === board.target ? { ok: true, value } : { ok: false, problem: 'exit_closed' };
    case 'lock':
      if (cell.rule === 'even' && value % 2 !== 0) return { ok: false, problem: 'lock_even' };
      if (cell.rule === 'odd' && value % 2 === 0) return { ok: false, problem: 'lock_odd' };
      return { ok: true, value };
    case 'gate': {
      const next = applyOp(cell.op, cell.n, value);
      if (next === null) return { ok: false, problem: 'not_divisible' };
      if (next < board.min) return { ok: false, problem: 'below_min', value: next };
      if (next > board.max) return { ok: false, problem: 'above_max', value: next };
      return { ok: true, value: next };
    }
  }
}

export function currentIndex(state: NumberMazeState): number {
  return state.path[state.path.length - 1] as number;
}

export function currentValue(state: NumberMazeState): number {
  return state.values[state.values.length - 1] as number;
}

export function isFinished(state: NumberMazeState): boolean {
  return state.cells[currentIndex(state)]?.t === 'exit';
}

/** Whether the player may step into `index` now, and the resulting value. */
export function checkMove(state: NumberMazeState, index: number): MoveCheck {
  if (isFinished(state)) return { ok: false, problem: 'finished' };
  const cell = state.cells[index];
  if (!Number.isInteger(index) || !cell) return { ok: false, problem: 'not_adjacent' };
  if (!neighbors(state.width, state.height, currentIndex(state)).includes(index)) return { ok: false, problem: 'not_adjacent' };
  if (state.path.includes(index)) return { ok: false, problem: 'visited' };
  return enter(state, cell, currentValue(state));
}

/** Player-facing explanation of a refused move. */
export function describeProblem(state: NumberMazeState, check: MoveCheck): string {
  if (check.ok) return '';
  switch (check.problem) {
    case 'finished':
      return 'You are already through the exit.';
    case 'not_adjacent':
      return 'Move one room at a time, up, down, left or right.';
    case 'visited':
      return 'You have already been through that room.';
    case 'blocked':
      return 'That room is sealed.';
    case 'not_divisible':
      return `${currentValue(state)} does not divide evenly there.`;
    case 'below_min':
      return `That would drop to ${check.value}, below the minimum of ${state.min}.`;
    case 'above_max':
      return `That would rise to ${check.value}, above the maximum of ${state.max}.`;
    case 'lock_even':
      return 'This lock only opens on an even value.';
    case 'lock_odd':
      return 'This lock only opens on an odd value.';
    case 'exit_closed':
      return `The exit only opens at exactly ${state.target}.`;
  }
}
