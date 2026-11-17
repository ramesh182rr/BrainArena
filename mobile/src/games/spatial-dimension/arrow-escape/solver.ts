import { candidateRotations, exitDir, neighbor, turnsBetween } from './grid';
import type { ArrowEscapeState, Cell, Dir, PulseKind } from './types';

export type SolveResult =
  | { status: 'solved'; rotations: number[]; cost: number; nodes: number }
  | { status: 'unsolvable'; nodes: number }
  | { status: 'budget_exceeded'; nodes: number };

export const DEFAULT_SOLVER_BUDGET = 200_000;

type Board = Pick<ArrowEscapeState, 'width' | 'height' | 'cells' | 'rotations'>;

/**
 * Exact solver: finds the solution needing the fewest clockwise turns from the
 * current rotations, or proves there is none.
 *
 * It routes pulses one at a time from their emitters. Only conduits a pulse
 * actually enters are branched on (a bend has two useful orientations, a
 * straight one), so the search stays small. A conduit used by one pulse is
 * off-limits to the next, which encodes the overload rule; crossings track
 * each axis separately. Branch-and-bound prunes on turn cost.
 */
export function solve(board: Board, budget = DEFAULT_SOLVER_BUDGET): SolveResult {
  const { width, height, cells, rotations } = board;
  const n = cells.length;
  const emitters: { index: number; kind: PulseKind; dir: Dir }[] = [];
  let receiverTotal = 0;
  cells.forEach((cell, index) => {
    if (cell.t === 'emitter') emitters.push({ index, kind: cell.kind, dir: cell.dir });
    if (cell.t === 'receiver') receiverTotal += 1;
  });
  if (emitters.length === 0 || emitters.length !== receiverTotal) return { status: 'unsolvable', nodes: 0 };

  const assigned = new Int8Array(n).fill(-1);
  // Bit 1: vertical traversal, bit 2: horizontal. Non-crossing conduits use both bits.
  const usage = new Uint8Array(n);
  const received = new Uint8Array(n);
  let receivedCount = 0;
  let nodes = 0;
  let aborted = false;
  let best: { rotations: number[]; cost: number } | null = null;

  const rotationOf = (i: number) => {
    const a = assigned[i] as number;
    return a >= 0 ? a : (rotations[i] ?? 0);
  };

  const nextPulse = (p: number, cost: number): void => {
    if (aborted || (best && cost >= best.cost)) return;
    if (p === emitters.length) {
      if (receivedCount === receiverTotal) {
        best = { rotations: Array.from(rotations, (_r, i) => rotationOf(i)), cost };
      }
      return;
    }
    const e = emitters[p]!;
    walk(p, e.kind, e.index, e.dir, cost);
  };

  const walk = (p: number, kind: PulseKind, pos: number, moving: Dir, cost: number): void => {
    nodes += 1;
    if (nodes > budget) {
      aborted = true;
      return;
    }
    if (best && cost >= best.cost) return;
    const next = neighbor(width, height, pos, moving);
    if (next === null) return;
    const cell = cells[next] as Cell;
    switch (cell.t) {
      case 'empty':
      case 'emitter':
        return;
      case 'receiver': {
        if (cell.kind !== kind || received[next]) return;
        received[next] = 1;
        receivedCount += 1;
        nextPulse(p + 1, cost);
        received[next] = 0;
        receivedCount -= 1;
        return;
      }
      case 'cross': {
        const bit = moving % 2 === 0 ? 1 : 2;
        if ((usage[next] as number) & bit) return;
        usage[next] = (usage[next] as number) | bit;
        walk(p, kind, next, moving, cost);
        usage[next] = (usage[next] as number) & ~bit;
        return;
      }
      default: {
        if (usage[next]) return;
        if (cell.t === 'gate' && cell.kind !== kind) return;
        const fixed = cell.t === 'gate' || cell.locked;
        if (fixed) {
          const out = exitDir(cell, rotationOf(next), moving);
          if (out === null) return;
          usage[next] = 3;
          walk(p, kind, next, out, cost);
          usage[next] = 0;
          return;
        }
        const current = rotations[next] ?? 0;
        for (const r of candidateRotations(cell, current, moving)) {
          const out = exitDir(cell, r, moving);
          if (out === null) continue;
          assigned[next] = r;
          usage[next] = 3;
          walk(p, kind, next, out, cost + turnsBetween(cell, current, r));
          assigned[next] = -1;
          usage[next] = 0;
          if (aborted) return;
        }
      }
    }
  };

  nextPulse(0, 0);
  if (aborted) return { status: 'budget_exceeded', nodes };
  const found = best as { rotations: number[]; cost: number } | null;
  return found ? { status: 'solved', rotations: found.rotations, cost: found.cost, nodes } : { status: 'unsolvable', nodes };
}
