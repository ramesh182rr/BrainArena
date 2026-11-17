import { exitDir, neighbor } from './grid';
import type { VoltCourierState, Cell, Dir, PulseKind } from './types';

export type PulseOutcome =
  | 'delivered'
  /** Reached a receiver of another kind. */
  | 'wrong_receiver'
  /** Hit a closed side, an empty cell or an emitter. */
  | 'blocked'
  /** Stopped by a gate of another kind. */
  | 'absorbed'
  /** Left the board. */
  | 'escaped'
  /**
   * Circled forever. Unreachable with the current tiles (every conduit pairs its
   * sides one-to-one, so a path can be traced back to its emitter and cannot
   * cycle); kept as a guard in case a future tile breaks that property.
   */
  | 'looped';

export interface TraceStep {
  index: number;
  /** Direction the pulse was moving when it entered this cell. */
  dir: Dir;
}

export interface PulseTrace {
  emitterIndex: number;
  kind: PulseKind;
  /** Cells entered, in order. The last step is where the pulse stopped (if on the board). */
  steps: TraceStep[];
  outcome: PulseOutcome;
}

export interface SimulationResult {
  traces: PulseTrace[];
  /** Conduits or receivers used by more than one pulse. */
  overloadedCells: number[];
  solved: boolean;
}

type Board = Pick<VoltCourierState, 'width' | 'height' | 'cells' | 'rotations'>;

function trace(board: Board, emitterIndex: number, kind: PulseKind, dir: Dir): PulseTrace {
  const { width, height, cells, rotations } = board;
  const steps: TraceStep[] = [];
  const seen = new Set<number>();
  let pos = emitterIndex;
  let moving = dir;
  for (;;) {
    const next = neighbor(width, height, pos, moving);
    if (next === null) return { emitterIndex, kind, steps, outcome: 'escaped' };
    steps.push({ index: next, dir: moving });
    const cell = cells[next] as Cell;
    if (cell.t === 'receiver') {
      return { emitterIndex, kind, steps, outcome: cell.kind === kind ? 'delivered' : 'wrong_receiver' };
    }
    if (cell.t === 'empty' || cell.t === 'emitter') return { emitterIndex, kind, steps, outcome: 'blocked' };
    const out = exitDir(cell, rotations[next] ?? 0, moving);
    if (out === null) return { emitterIndex, kind, steps, outcome: 'blocked' };
    if (cell.t === 'gate' && cell.kind !== kind) return { emitterIndex, kind, steps, outcome: 'absorbed' };
    const key = next * 4 + moving;
    if (seen.has(key)) return { emitterIndex, kind, steps, outcome: 'looped' };
    seen.add(key);
    pos = next;
    moving = out;
  }
}

/** Fires every emitter on the current rotations and reports where each pulse ends up. */
export function simulate(board: Board): SimulationResult {
  const traces: PulseTrace[] = [];
  let receiverCount = 0;
  board.cells.forEach((cell, index) => {
    if (cell.t === 'emitter') traces.push(trace(board, index, cell.kind, cell.dir));
    if (cell.t === 'receiver') receiverCount += 1;
  });

  // Usage: conduits count per pulse (per axis for crossings); receivers count arrivals.
  const usage = new Map<string, number>();
  const bump = (key: string) => usage.set(key, (usage.get(key) ?? 0) + 1);
  for (const t of traces) {
    const passed = new Set<string>();
    t.steps.forEach((step, i) => {
      const cell = board.cells[step.index] as Cell;
      const isLast = i === t.steps.length - 1;
      if (cell.t === 'receiver') {
        bump(`${step.index}`);
        return;
      }
      // A pulse that stopped in a cell did not pass through it.
      if (isLast && t.outcome !== 'looped') return;
      const key = cell.t === 'cross' ? `${step.index}:${step.dir % 2}` : `${step.index}`;
      if (!passed.has(key)) {
        passed.add(key);
        bump(key);
      }
    });
  }
  const overloaded = new Set<number>();
  for (const [key, count] of usage) {
    if (count > 1) overloaded.add(Number(key.split(':')[0]));
  }
  const overloadedCells = [...overloaded].sort((a, b) => a - b);
  const delivered = traces.filter((t) => t.outcome === 'delivered').length;
  const solved =
    traces.length > 0 &&
    delivered === traces.length &&
    delivered === receiverCount &&
    overloadedCells.length === 0;
  return { traces, overloadedCells, solved };
}
