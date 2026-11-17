import type { DifficultyBand } from '@/game-runtime/contracts';
import { createRng, type Rng } from '@/game-runtime/rng';

import { DIRS, isRotatable, neighbor, rotationFor } from './grid';
import { simulate } from './simulate';
import { solve } from './solver';
import { PULSE_KINDS, type ArrowEscapeState, type Cell, type Dir, type PulseKind } from './types';

export interface DifficultyProfile {
  width: number;
  height: number;
  pulses: readonly [number, number];
  kinds: number;
  pathLength: readonly [number, number];
  crossings: boolean;
  gates: number;
  /** Rotatable tiles placed off every route, to make the board harder to read. */
  decoys: number;
  /** Minimum turns required; rejects boards that are too easy for the band. */
  minPar: number;
  /** Maximum turns required; rejects tedious outliers. */
  maxPar: number;
}

/**
 * Difficulty grows by structure, not by timers (GDD §6): more pulses, more kinds,
 * crossings, then gates and decoys. One new rule per band.
 */
export const PROFILES: Readonly<Record<DifficultyBand, DifficultyProfile>> = {
  intro: { width: 4, height: 4, pulses: [1, 1], kinds: 1, pathLength: [3, 5], crossings: false, gates: 0, decoys: 0, minPar: 2, maxPar: 8 },
  easy: { width: 5, height: 5, pulses: [2, 2], kinds: 2, pathLength: [3, 6], crossings: false, gates: 0, decoys: 2, minPar: 3, maxPar: 14 },
  standard: { width: 5, height: 5, pulses: [2, 3], kinds: 2, pathLength: [4, 7], crossings: true, gates: 0, decoys: 3, minPar: 5, maxPar: 20 },
  advanced: { width: 6, height: 6, pulses: [3, 3], kinds: 3, pathLength: [4, 8], crossings: true, gates: 1, decoys: 4, minPar: 7, maxPar: 28 },
  expert: { width: 7, height: 7, pulses: [3, 4], kinds: 3, pathLength: [5, 10], crossings: true, gates: 2, decoys: 6, minPar: 9, maxPar: 38 },
};

const MAX_LAYOUT_ATTEMPTS = 60;
const MAX_SCRAMBLE_ATTEMPTS = 6;
const SOLVER_BUDGET = 150_000;

export class GenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GenerationError';
  }
}

interface Step {
  index: number;
  inDir: Dir;
  outDir: Dir;
  cross: boolean;
}

interface Layout {
  cells: Cell[];
  solution: number[];
  /** Pulse that owns each conduit, or -1. */
  owner: number[];
}

function randomRoute(
  rng: Rng,
  profile: DifficultyProfile,
  layout: Layout,
  start: number,
  startDir: Dir,
  length: number,
): { steps: Step[]; receiver: number } | null {
  const { width, height } = profile;
  const { cells, solution, owner } = layout;
  const inRoute = new Set<number>();
  const steps: Step[] = [];
  let budget = 500;

  const isFree = (i: number) => cells[i]?.t === 'empty' && !inRoute.has(i);
  const isCrossable = (i: number, moving: Dir) =>
    profile.crossings &&
    !inRoute.has(i) &&
    cells[i]?.t === 'straight' &&
    (owner[i] ?? -1) >= 0 &&
    (solution[i] ?? 0) % 2 !== moving % 2;

  const go = (index: number, inDir: Dir, cross: boolean): number | null => {
    budget -= 1;
    if (budget < 0) return null;
    inRoute.add(index);
    const outs: Dir[] = cross ? [inDir] : rng.shuffle([inDir, ((inDir + 1) % 4) as Dir, ((inDir + 3) % 4) as Dir]);
    for (const out of outs) {
      const next = neighbor(width, height, index, out);
      if (next === null) continue;
      steps.push({ index, inDir, outDir: out, cross });
      if (steps.length >= length) {
        if (isFree(next)) return next;
      } else if (isFree(next)) {
        const r = go(next, out, false);
        if (r !== null) return r;
      } else if (isCrossable(next, out)) {
        const r = go(next, out, true);
        if (r !== null) return r;
      }
      steps.pop();
    }
    inRoute.delete(index);
    return null;
  };

  const receiver = go(start, startDir, false);
  return receiver === null ? null : { steps, receiver };
}

function buildLayout(rng: Rng, profile: DifficultyProfile): Layout | null {
  const n = profile.width * profile.height;
  const layout: Layout = {
    cells: Array.from({ length: n }, (): Cell => ({ t: 'empty' })),
    solution: new Array<number>(n).fill(0),
    owner: new Array<number>(n).fill(-1),
  };
  const { cells, solution, owner } = layout;
  const pulseCount = rng.int(profile.pulses[0], profile.pulses[1]);
  const kinds = rng.shuffle(PULSE_KINDS).slice(0, profile.kinds);
  const pulseKinds: PulseKind[] = [];

  for (let p = 0; p < pulseCount; p += 1) {
    // Cycle through kinds so every kind in the band appears at least once.
    const kind = kinds[p % kinds.length] as PulseKind;
    let placed = false;
    for (let attempt = 0; attempt < 30 && !placed; attempt += 1) {
      const emitter = rng.int(0, n - 1);
      if (cells[emitter]?.t !== 'empty') continue;
      const dir = rng.pick(DIRS);
      const front = neighbor(profile.width, profile.height, emitter, dir);
      if (front === null || cells[front]?.t !== 'empty') continue;
      cells[emitter] = { t: 'emitter', kind, dir };
      const route = randomRoute(rng, profile, layout, front, dir, rng.int(profile.pathLength[0], profile.pathLength[1]));
      if (!route) {
        cells[emitter] = { t: 'empty' };
        continue;
      }
      for (const step of route.steps) {
        if (step.cross) {
          cells[step.index] = { t: 'cross' };
          owner[step.index] = p;
          continue;
        }
        const tile = rotationFor(step.inDir, step.outDir);
        cells[step.index] = { t: tile.t, locked: false };
        solution[step.index] = tile.rotation;
        owner[step.index] = p;
      }
      cells[route.receiver] = { t: 'receiver', kind };
      pulseKinds.push(kind);
      placed = true;
    }
    if (!placed) return null;
  }

  // Gates: convert straight route tiles into gates for the pulse that uses them.
  const gateCandidates = rng.shuffle(
    cells.map((c, i) => i).filter((i) => cells[i]?.t === 'straight' && (owner[i] ?? -1) >= 0),
  );
  if (gateCandidates.length < profile.gates) return null;
  for (const i of gateCandidates.slice(0, profile.gates)) {
    cells[i] = { t: 'gate', kind: pulseKinds[owner[i] as number] as PulseKind };
  }

  // Decoys: rotatable conduits that no solution route needs.
  const empties = rng.shuffle(cells.map((c, i) => i).filter((i) => cells[i]?.t === 'empty'));
  for (const i of empties.slice(0, profile.decoys)) {
    cells[i] = { t: rng.chance(0.5) ? 'straight' : 'bend', locked: false };
    solution[i] = rng.int(0, 3);
  }
  return layout;
}

export interface GeneratedBoard {
  state: ArrowEscapeState;
  /** Rotations of a minimum-turn solution, the validator certificate. */
  solution: number[];
}

/** Deterministic for a given `rngKey`; throws `GenerationError` if no acceptable board is found. */
export function generateBoard(rngKey: string, profile: DifficultyProfile): GeneratedBoard {
  const rng = createRng(rngKey);
  for (let attempt = 0; attempt < MAX_LAYOUT_ATTEMPTS; attempt += 1) {
    const layout = buildLayout(rng, profile);
    if (!layout) continue;
    const { cells } = layout;
    for (let s = 0; s < MAX_SCRAMBLE_ATTEMPTS; s += 1) {
      const rotations = layout.solution.map((r, i) => (isRotatable(cells[i] as Cell) ? rng.int(0, 3) : r));
      const board = { width: profile.width, height: profile.height, cells, rotations };
      if (simulate(board).solved) continue;
      const result = solve(board, SOLVER_BUDGET);
      if (result.status !== 'solved' || result.cost < profile.minPar || result.cost > profile.maxPar) continue;
      return {
        state: {
          ...board,
          initialRotations: rotations,
          history: [],
          turns: 0,
          par: result.cost,
        },
        solution: result.rotations,
      };
    }
  }
  throw new GenerationError('No acceptable board within the attempt budget');
}
