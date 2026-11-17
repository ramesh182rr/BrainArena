import type { DifficultyBand } from '@/game-runtime/contracts';
import { createRng, type Rng } from '@/game-runtime/rng';

import { applySwitch, sameDials, shortestPresses } from './rules';
import type { Effect, MachineSwitch, SwitchState } from './types';

export interface MachineProfile {
  dials: number;
  levels: 3 | 4;
  switches: number;
  /** Most dials one switch touches. */
  maxEffects: number;
  /** Whether switches may lower dials as well as raise them. */
  lowering: boolean;
  conditional: number;
  par: readonly [number, number];
  /** Presses allowed beyond par, for discovering the wiring. */
  slack: number;
}

/** One new idea per band: wiring discovery, lowering, more switches, conditional switches, four levels. */
export const MACHINE_PROFILES: Readonly<Record<DifficultyBand, MachineProfile>> = {
  intro: { dials: 3, levels: 3, switches: 3, maxEffects: 2, lowering: false, conditional: 0, par: [2, 3], slack: 3 },
  easy: { dials: 4, levels: 3, switches: 3, maxEffects: 3, lowering: true, conditional: 0, par: [3, 4], slack: 3 },
  standard: { dials: 4, levels: 3, switches: 4, maxEffects: 3, lowering: true, conditional: 0, par: [3, 5], slack: 3 },
  advanced: { dials: 5, levels: 3, switches: 4, maxEffects: 3, lowering: true, conditional: 1, par: [4, 6], slack: 3 },
  expert: { dials: 5, levels: 4, switches: 5, maxEffects: 3, lowering: true, conditional: 2, par: [5, 7], slack: 3 },
};

const MAX_ATTEMPTS = 200;

export class MachineGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MachineGenerationError';
  }
}

function randomSwitch(rng: Rng, p: MachineProfile): MachineSwitch {
  const count = rng.int(1, p.maxEffects);
  const dials = rng.shuffle(Array.from({ length: p.dials }, (_, i) => i)).slice(0, count).sort((a, b) => a - b);
  const effects: Effect[] = dials.map((dial) => ({ dial, delta: p.lowering && rng.chance(0.35) ? -1 : 1 }));
  return { effects, condition: null };
}

export function assembleMachine(
  band: DifficultyBand,
  levels: number,
  switches: readonly MachineSwitch[],
  start: readonly number[],
  target: readonly number[],
  par: number,
  slack: number,
): SwitchState {
  return {
    band,
    levels,
    start,
    target,
    dials: start,
    switches,
    discovered: switches.map(() => false),
    presses: [],
    budget: par + slack,
    resets: 0,
    lastPress: null,
    par,
  };
}

function tryBuild(rng: Rng, band: DifficultyBand, p: MachineProfile): SwitchState | null {
  const switches = Array.from({ length: p.switches }, () => randomSwitch(rng, p));
  // Every dial must be wired, and no two switches may be identical.
  const wired = new Set(switches.flatMap((s) => s.effects.map((e) => e.dial)));
  if (wired.size !== p.dials) return null;
  if (new Set(switches.map((s) => JSON.stringify(s.effects))).size !== switches.length) return null;
  const start = Array.from({ length: p.dials }, () => rng.int(0, p.levels - 1));
  const conditionalIdx = rng.shuffle(Array.from({ length: p.switches }, (_, i) => i)).slice(0, p.conditional);
  for (const i of conditionalIdx) {
    const sw = switches[i]!;
    const free = Array.from({ length: p.dials }, (_, d) => d).filter((d) => !sw.effects.some((e) => e.dial === d));
    if (free.length === 0) return null;
    switches[i] = { ...sw, condition: { dial: rng.pick(free), level: rng.int(0, p.levels - 1) } };
  }
  // Target: a random walk from the start, so it is always reachable.
  let dials = [...start];
  for (let step = 0; step < p.par[1] + 2; step += 1) dials = applySwitch(dials, rng.pick(switches), p.levels).dials;
  if (sameDials(dials, start)) return null;
  const path = shortestPresses(switches, p.levels, start, dials, p.par[1]);
  if (!path || path.length < p.par[0] || path.length > p.par[1]) return null;
  // Conditional switches must matter: the shortest solution uses at least one of them.
  if (p.conditional > 0 && !path.some((i) => switches[i]!.condition)) return null;
  return assembleMachine(band, p.levels, switches, start, dials, path.length, p.slack);
}

/** Deterministic for a given `rngKey`. */
export function generateMachine(rngKey: string, band: DifficultyBand, profile: MachineProfile): SwitchState {
  const rng = createRng(rngKey);
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const state = tryBuild(rng, band, profile);
    if (state) return state;
  }
  throw new MachineGenerationError('No acceptable machine within the attempt budget');
}
