import type { DifficultyBand } from '@/game-runtime/contracts';
import { createRng, type Rng } from '@/game-runtime/rng';

import { inBloom } from './rules';
import { solveGarden } from './solver';
import { ALL_COLOURS, type Bloom, type CascadeState, type GardenCell, type Inventory } from './types';

export interface GardenProfile {
  width: number;
  height: number;
  colours: 3 | 4;
  patches: readonly [number, number];
  pads: number;
  stones: number;
  hardy: number;
  minPar: number;
  maxPar: number;
  /** Extra droplets beyond one shortest solution (gives easier bands some slack). */
  spare: number;
}

/** One new idea per band: cascades, order, stones, hardy shells, then a four-colour cycle. */
export const GARDEN_PROFILES: Readonly<Record<DifficultyBand, GardenProfile>> = {
  intro: { width: 4, height: 4, colours: 3, patches: [3, 4], pads: 3, stones: 0, hardy: 0, minPar: 2, maxPar: 2, spare: 1 },
  easy: { width: 4, height: 5, colours: 3, patches: [4, 5], pads: 3, stones: 0, hardy: 0, minPar: 2, maxPar: 3, spare: 1 },
  standard: { width: 5, height: 5, colours: 3, patches: [5, 6], pads: 4, stones: 2, hardy: 0, minPar: 3, maxPar: 3, spare: 0 },
  advanced: { width: 5, height: 5, colours: 3, patches: [5, 7], pads: 4, stones: 2, hardy: 2, minPar: 3, maxPar: 4, spare: 0 },
  expert: { width: 5, height: 6, colours: 4, patches: [6, 8], pads: 4, stones: 2, hardy: 2, minPar: 3, maxPar: 4, spare: 0 },
};

const MAX_ATTEMPTS = 150;

export class GardenGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GardenGenerationError';
  }
}

export function cycleFor(colours: 3 | 4): Bloom[] {
  return colours === 4 ? [...ALL_COLOURS] : ['rose', 'leaf', 'sky'];
}

/** Colour patches: each cell takes the colour of its nearest seed (Manhattan distance). */
function patchColours(rng: Rng, profile: GardenProfile, cycle: readonly Bloom[]): Bloom[] {
  const { width, height } = profile;
  const n = width * height;
  const seeds = rng.shuffle(Array.from({ length: n }, (_, i) => i)).slice(0, rng.int(profile.patches[0], profile.patches[1]));
  const seedColours = seeds.map(() => rng.pick(cycle));
  return Array.from({ length: n }, (_, i) => {
    let best = 0;
    let bestD = Infinity;
    seeds.forEach((s, k) => {
      const d = Math.abs(Math.floor(s / width) - Math.floor(i / width)) + Math.abs((s % width) - (i % width));
      if (d < bestD) {
        bestD = d;
        best = k;
      }
    });
    return seedColours[best] as Bloom;
  });
}

function countColours(drops: readonly { colour: Bloom }[]): Inventory {
  const inv: Inventory = {};
  for (const d of drops) inv[d.colour] = (inv[d.colour] ?? 0) + 1;
  return inv;
}

function tryBuild(rng: Rng, profile: GardenProfile): CascadeState | null {
  const cycle = cycleFor(profile.colours);
  const colours = patchColours(rng, profile, cycle);
  const n = colours.length;
  const order = rng.shuffle(Array.from({ length: n }, (_, i) => i));
  const stones = new Set(order.slice(0, profile.stones));
  const pads = new Set(order.slice(profile.stones, profile.stones + profile.pads));
  const hardy = new Set(rng.shuffle(order.slice(profile.stones)).slice(0, profile.hardy));
  const cells: GardenCell[] = colours.map((colour, i) =>
    stones.has(i) ? { t: 'stone' } : { t: 'plant', colour, hardy: hardy.has(i), pad: pads.has(i) },
  );
  if (inBloom(cells) || new Set(colours).size < 2) return null;
  const board = { width: profile.width, height: profile.height, cycle, cells };
  const free = solveGarden(board, null, { maxDrops: profile.maxPar });
  if (free.status !== 'solved' || free.drops.length < profile.minPar) return null;
  const inventory = countColours(free.drops);
  for (let k = 0; k < profile.spare; k += 1) {
    const extra = rng.pick(cycle);
    inventory[extra] = (inventory[extra] ?? 0) + 1;
  }
  const bounded = solveGarden(board, inventory, { maxDrops: profile.maxPar + profile.spare });
  if (bounded.status !== 'solved') return null;
  return { ...board, inventory, drops: [], lastWave: [], history: [], par: bounded.drops.length };
}

/** Deterministic for a given `rngKey`. */
export function generateGarden(rngKey: string, profile: GardenProfile): CascadeState {
  const rng = createRng(rngKey);
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const state = tryBuild(rng, profile);
    if (state) return state;
  }
  throw new GardenGenerationError('No acceptable garden within the attempt budget');
}
