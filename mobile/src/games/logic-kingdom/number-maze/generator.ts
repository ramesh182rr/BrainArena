import type { DifficultyBand } from '@/game-runtime/contracts';
import { createRng, type Rng } from '@/game-runtime/rng';

import { applyOp, neighbors } from './rules';
import { solveMaze } from './solver';
import type { LockRule, MazeCell, NumberMazeState, Op } from './types';

export interface MazeProfile {
  width: number;
  height: number;
  ops: readonly Op[];
  /** Inclusive range for gate amounts (+/−). × and ÷ always use 2 or 3. */
  amount: readonly [number, number];
  min: number;
  max: number;
  /** Planted route length in moves. */
  route: readonly [number, number];
  blocks: number;
  locks: number;
  minPar: number;
  /** Boards with more distinct routes than this are too loose and are rejected. */
  maxSolutions: number;
}

/** One new idea per band: + −, then ×, then ÷, then parity locks, then tight bounds and walls. */
export const MAZE_PROFILES: Readonly<Record<DifficultyBand, MazeProfile>> = {
  intro: { width: 3, height: 3, ops: ['add', 'sub'], amount: [1, 5], min: 0, max: 20, route: [3, 5], blocks: 0, locks: 0, minPar: 3, maxSolutions: 4 },
  easy: { width: 4, height: 4, ops: ['add', 'sub', 'mul'], amount: [1, 6], min: 0, max: 40, route: [5, 7], blocks: 1, locks: 0, minPar: 4, maxSolutions: 6 },
  standard: { width: 4, height: 5, ops: ['add', 'sub', 'mul', 'div'], amount: [1, 7], min: 0, max: 50, route: [6, 9], blocks: 2, locks: 0, minPar: 5, maxSolutions: 5 },
  advanced: { width: 5, height: 5, ops: ['add', 'sub', 'mul', 'div'], amount: [1, 8], min: 0, max: 40, route: [7, 11], blocks: 2, locks: 2, minPar: 6, maxSolutions: 4 },
  expert: { width: 5, height: 6, ops: ['add', 'sub', 'mul', 'div'], amount: [1, 9], min: 0, max: 30, route: [9, 14], blocks: 3, locks: 3, minPar: 8, maxSolutions: 3 },
};

const MAX_ATTEMPTS = 120;

export class MazeGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MazeGenerationError';
  }
}

function randomRoute(rng: Rng, profile: MazeProfile, start: number, length: number): number[] | null {
  const route = [start];
  const used = new Set(route);
  let budget = 400;
  const go = (): boolean => {
    if (route.length - 1 === length) return true;
    if (--budget < 0) return false;
    for (const next of rng.shuffle(neighbors(profile.width, profile.height, route[route.length - 1]!))) {
      if (used.has(next)) continue;
      route.push(next);
      used.add(next);
      if (go()) return true;
      route.pop();
      used.delete(next);
    }
    return false;
  };
  return go() ? route : null;
}

/** A gate that keeps `value` inside the bounds and changes it; null if none fits. */
function plantGate(rng: Rng, profile: MazeProfile, value: number): { cell: MazeCell; value: number } | null {
  for (const op of rng.shuffle(profile.ops)) {
    const amounts = op === 'mul' || op === 'div' ? rng.shuffle([2, 3]) : rng.shuffle(range(profile.amount[0], profile.amount[1]));
    for (const n of amounts) {
      const next = applyOp(op, n, value);
      if (next === null || next < profile.min || next > profile.max || next === value) continue;
      return { cell: { t: 'gate', op, n }, value: next };
    }
  }
  return null;
}

function range(a: number, b: number): number[] {
  return Array.from({ length: b - a + 1 }, (_, i) => a + i);
}

function randomGate(rng: Rng, profile: MazeProfile): MazeCell {
  const op = rng.pick(profile.ops);
  const n = op === 'mul' || op === 'div' ? rng.int(2, 3) : rng.int(profile.amount[0], profile.amount[1]);
  return { t: 'gate', op, n };
}

function tryBuild(rng: Rng, profile: MazeProfile): NumberMazeState | null {
  const { width, height } = profile;
  const n = width * height;
  const start = rng.int(0, n - 1);
  const route = randomRoute(rng, profile, start, rng.int(profile.route[0], profile.route[1]));
  if (!route) return null;

  const cells: MazeCell[] = new Array<MazeCell>(n).fill({ t: 'block' });
  cells[start] = { t: 'start' };
  const startValue = rng.int(Math.max(profile.min, 2), Math.min(profile.max, 12));
  let value = startValue;

  // Locks go on route rooms (never the first or last), matching the value at that point.
  const lockSlots = new Set(rng.shuffle(range(2, route.length - 2)).slice(0, profile.locks));
  for (let i = 1; i < route.length - 1; i += 1) {
    const index = route[i]!;
    if (lockSlots.has(i)) {
      const rule: LockRule = value % 2 === 0 ? 'even' : 'odd';
      cells[index] = { t: 'lock', rule };
      continue;
    }
    const planted = plantGate(rng, profile, value);
    if (!planted) return null;
    cells[index] = planted.cell;
    value = planted.value;
  }
  if (value === startValue) return null;
  cells[route[route.length - 1]!] = { t: 'exit' };

  // Off-route rooms: a few sealed blocks, the rest decoy gates.
  const offRoute = rng.shuffle(range(0, n - 1).filter((i) => !route.includes(i)));
  offRoute.forEach((index, k) => {
    cells[index] = k < profile.blocks ? { t: 'block' } : randomGate(rng, profile);
  });

  const state: NumberMazeState = {
    width,
    height,
    cells,
    startValue,
    target: value,
    min: profile.min,
    max: profile.max,
    path: [start],
    values: [startValue],
    par: 0,
  };
  const result = solveMaze(state, [start], startValue, { solutionCap: profile.maxSolutions + 1 });
  if (result.status !== 'solved') return null;
  if (result.moves < profile.minPar || result.solutions > profile.maxSolutions) return null;
  return { ...state, par: result.moves };
}

/** Deterministic for a given `rngKey`. */
export function generateMaze(rngKey: string, profile: MazeProfile): NumberMazeState {
  const rng = createRng(rngKey);
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const state = tryBuild(rng, profile);
    if (state) return state;
  }
  throw new MazeGenerationError('No acceptable maze within the attempt budget');
}
