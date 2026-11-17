/**
 * Number Maze (W2-G02): arithmetic route planning.
 *
 * The player walks from START through adjacent rooms, never revisiting one.
 * Each room applies its gate to a running value (+n, −n, ×n, ÷n). The value must
 * stay inside the level's bounds and division must be exact. Locks only open
 * for an even or odd value. EXIT opens only when the value equals the target.
 */

export type Op = 'add' | 'sub' | 'mul' | 'div';
export type LockRule = 'even' | 'odd';

export type MazeCell =
  | { t: 'start' }
  | { t: 'exit' }
  | { t: 'gate'; op: Op; n: number }
  | { t: 'lock'; rule: LockRule }
  | { t: 'block' };

export interface NumberMazeState {
  width: number;
  height: number;
  /** Row-major, `width * height` entries. Never changes during play. */
  cells: readonly MazeCell[];
  startValue: number;
  target: number;
  /** Inclusive bounds the running value must stay within. */
  min: number;
  max: number;
  /** Rooms visited in order; `path[0]` is the start. */
  path: readonly number[];
  /** Running value after entering each room in `path`; `values[0]` is the start value. */
  values: readonly number[];
  /** Fewest moves that reach the exit. */
  par: number;
}

export type NumberMazeAction = { type: 'move'; index: number } | { type: 'undo' } | { type: 'reset' };

export const OP_SYMBOL: Record<Op, string> = { add: '+', sub: '−', mul: '×', div: '÷' };
export const OP_WORD: Record<Op, string> = { add: 'Add', sub: 'Subtract', mul: 'Multiply by', div: 'Divide by' };
