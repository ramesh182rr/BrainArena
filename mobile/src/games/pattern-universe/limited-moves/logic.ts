import type { DifficultyBand, GameHint, GameModule, HintTier, PuzzleLevel, ValidationResult } from '@/game-runtime/contracts';
import { createRng, fingerprint, levelSeedKey, type Rng } from '@/game-runtime/rng';

/**
 * Limited Moves (W4-G04): resource choreography.
 *
 * A workshop of machines and a fixed energy budget. Starting a machine costs
 * its current price. A running gear makes linked machines 1 cheaper; a running
 * boiler makes them 1 dearer; a lock can only start once a linked machine is
 * running. Start every starred machine within the budget. Machines never stop,
 * so the order is the puzzle. The minimum cost is exact (search over sets).
 */

export type Kind = 'gear' | 'boiler' | 'lock' | 'plain';

export interface Machine {
  kind: Kind;
  base: number;
  target: boolean;
  /** Grid slot for layout. */
  slot: number;
}

export interface WorkshopState {
  band: DifficultyBand;
  cols: number;
  machines: readonly Machine[];
  links: readonly [number, number][];
  budget: number;
  minCost: number;
  running: number[];
  spent: number;
  undos: number;
}

export type WorkshopAction = { type: 'start'; machine: number } | { type: 'undo' } | { type: 'reset' };

export const LIMITED_MOVES_ID = 'W4-G04';
export const LIMITED_MOVES_VERSION = '1.0.0';

export function linked(s: Pick<WorkshopState, 'links'>, i: number): number[] {
  return s.links.flatMap(([a, b]) => (a === i ? [b] : b === i ? [a] : []));
}

/** Current price of a machine given which machines are running (never below 0). */
export function priceOf(s: Pick<WorkshopState, 'machines' | 'links'>, running: ReadonlySet<number>, i: number): number {
  let p = s.machines[i]!.base;
  for (const n of linked(s, i)) {
    if (!running.has(n)) continue;
    if (s.machines[n]!.kind === 'gear') p -= 1;
    if (s.machines[n]!.kind === 'boiler') p += 1;
  }
  return Math.max(0, p);
}

export function canStart(s: Pick<WorkshopState, 'machines' | 'links'>, running: ReadonlySet<number>, i: number): boolean {
  if (running.has(i)) return false;
  return s.machines[i]!.kind !== 'lock' || linked(s, i).some((n) => running.has(n));
}

/** Cheapest way to get every target running: Dijkstra over running sets. Returns cost and order. */
export function cheapest(s: Pick<WorkshopState, 'machines' | 'links'>, from: readonly number[] = []): { cost: number; order: number[] } | null {
  const n = s.machines.length;
  const targetMask = s.machines.reduce((m, x, i) => (x.target ? m | (1 << i) : m), 0);
  const startMask = from.reduce((m, i) => m | (1 << i), 0);
  const dist = new Map<number, number>([[startMask, 0]]);
  const prev = new Map<number, [number, number]>();
  const queue: [number, number][] = [[0, startMask]];
  const done = new Set<number>();
  while (queue.length) {
    queue.sort((a, b) => a[0] - b[0]);
    const [d, mask] = queue.shift()!;
    if (done.has(mask)) continue;
    done.add(mask);
    if ((mask & targetMask) === targetMask) {
      const order: number[] = [];
      let m = mask;
      while (m !== startMask) {
        const [pm, i] = prev.get(m)!;
        order.unshift(i);
        m = pm;
      }
      return { cost: d, order };
    }
    const running = new Set(Array.from({ length: n }, (_, i) => i).filter((i) => mask & (1 << i)));
    for (let i = 0; i < n; i += 1) {
      if (!canStart(s, running, i)) continue;
      const nm = mask | (1 << i);
      const nd = d + priceOf(s, running, i);
      if (nd < (dist.get(nm) ?? Infinity)) {
        dist.set(nm, nd);
        prev.set(nm, [mask, i]);
        queue.push([nd, nm]);
      }
    }
  }
  return null;
}

/** A naive plan: start the cheapest available target each time (helpers ignored). */
function naiveCost(s: Pick<WorkshopState, 'machines' | 'links'>): number {
  const running = new Set<number>();
  let cost = 0;
  for (;;) {
    const options = s.machines.flatMap((m, i) => (m.target && canStart(s, running, i) ? [i] : []));
    if (!options.length) break;
    options.sort((a, b) => priceOf(s, running, a) - priceOf(s, running, b));
    cost += priceOf(s, running, options[0]!);
    running.add(options[0]!);
  }
  return s.machines.every((m, i) => !m.target || running.has(i)) ? cost : Infinity;
}

interface Profile {
  cols: number;
  rows: number;
  machines: number;
  targets: number;
  kinds: Partial<Record<Kind, number>>;
  /** Extra energy beyond the minimum. */
  slack: number;
  /** The naive plan must cost at least this much more than the minimum. */
  gap: number;
}

export const WORKSHOP_PROFILES: Readonly<Record<DifficultyBand, Profile>> = {
  intro: { cols: 3, rows: 2, machines: 5, targets: 2, kinds: { gear: 2, plain: 3 }, slack: 1, gap: 1 },
  easy: { cols: 3, rows: 3, machines: 6, targets: 3, kinds: { gear: 2, boiler: 1, plain: 3 }, slack: 0, gap: 1 },
  standard: { cols: 3, rows: 3, machines: 8, targets: 3, kinds: { gear: 3, boiler: 2, plain: 2 }, slack: 0, gap: 2 },
  advanced: { cols: 4, rows: 3, machines: 9, targets: 4, kinds: { gear: 3, boiler: 2, lock: 2, plain: 2 }, slack: 0, gap: 2 },
  expert: { cols: 4, rows: 3, machines: 11, targets: 4, kinds: { gear: 3, boiler: 3, lock: 2, plain: 2 }, slack: 0, gap: 3 },
};

function tryBuild(rng: Rng, band: DifficultyBand, p: Profile): WorkshopState | null {
  const slots = rng.shuffle(Array.from({ length: p.cols * p.rows }, (_, i) => i)).slice(0, p.machines).sort((a, b) => a - b);
  const pool: Kind[] = Object.entries(p.kinds).flatMap(([k, n]) => Array.from({ length: n as number }, () => k as Kind));
  const kinds = rng.shuffle(pool).slice(0, p.machines);
  while (kinds.length < p.machines) kinds.push('plain');
  const targetIdx = new Set(rng.shuffle(Array.from({ length: p.machines }, (_, i) => i)).slice(0, p.targets));
  const machines: Machine[] = slots.map((slot, i) => ({ kind: kinds[i]!, base: rng.int(1, 4), target: targetIdx.has(i), slot }));
  // Links between machines in neighbouring slots (including diagonals), most of them kept.
  const links: [number, number][] = [];
  for (let a = 0; a < machines.length; a += 1)
    for (let b = a + 1; b < machines.length; b += 1) {
      const [sa, sb] = [machines[a]!.slot, machines[b]!.slot];
      const dr = Math.abs(Math.floor(sa / p.cols) - Math.floor(sb / p.cols));
      const dc = Math.abs((sa % p.cols) - (sb % p.cols));
      if (dr <= 1 && dc <= 1 && rng.chance(dr + dc === 1 ? 0.8 : 0.35)) links.push([a, b]);
    }
  const base = { machines, links };
  // Every lock needs at least one link.
  if (machines.some((m, i) => m.kind === 'lock' && !linked(base, i).length)) return null;
  const best = cheapest(base);
  if (!best || best.cost < 3) return null;
  const naive = naiveCost(base);
  if (naive - best.cost < p.gap) return null;
  return { band, cols: p.cols, machines, links, budget: best.cost + p.slack, minCost: best.cost, running: [], spent: 0, undos: 0 };
}

export function generateWorkshop(key: string, band: DifficultyBand, p: Profile = WORKSHOP_PROFILES[band]): WorkshopState {
  const rng = createRng(key);
  for (let i = 0; i < 4000; i += 1) {
    const s = tryBuild(rng, band, p);
    if (s) return s;
  }
  throw new Error('No acceptable workshop within the attempt budget');
}

export const WORKSHOP_TUTORIALS = [
  { id: 'tutorial-1', difficulty: 'intro' as const, intro: 'Start both starred machines. A running gear makes the machines linked to it 1 cheaper, so start a gear first.', profile: WORKSHOP_PROFILES.intro },
  { id: 'tutorial-2', difficulty: 'easy' as const, intro: 'A running boiler makes linked machines 1 dearer. Start what you need before you light it.', profile: WORKSHOP_PROFILES.easy },
  { id: 'tutorial-3', difficulty: 'advanced' as const, intro: 'Locks can only start after a machine linked to them is running.', profile: WORKSHOP_PROFILES.advanced },
];

export const workshopFingerprint = (s: WorkshopState) => fingerprint(JSON.stringify([s.cols, s.machines, s.links, s.budget]));
export const machineId = (i: number) => `machine-${i}`;

function toLevel(s: WorkshopState, seed: string, difficulty: DifficultyBand, source: PuzzleLevel['source'], levelId: string): PuzzleLevel<WorkshopState> {
  return { gameId: LIMITED_MOVES_ID, levelId, generatorVersion: LIMITED_MOVES_VERSION, seed, difficulty, source, fingerprint: workshopFingerprint(s), initialState: s, metadata: { machines: s.machines.length, budget: s.budget } };
}

export const allTargetsRunning = (s: WorkshopState) => s.machines.every((m, i) => !m.target || s.running.includes(i));
export const energyLeft = (s: WorkshopState) => s.budget - s.spent;

export const limitedMoves: GameModule<WorkshopState, WorkshopAction> = {
  id: LIMITED_MOVES_ID,
  version: LIMITED_MOVES_VERSION,
  createLevel(seed, difficulty) {
    const t = WORKSHOP_TUTORIALS.find((x) => x.id === seed);
    if (t) return toLevel(generateWorkshop(levelSeedKey(LIMITED_MOVES_ID, LIMITED_MOVES_VERSION, seed), t.difficulty, t.profile), seed, t.difficulty, 'authored', `${LIMITED_MOVES_ID}:${seed}`);
    return toLevel(generateWorkshop(levelSeedKey(LIMITED_MOVES_ID, LIMITED_MOVES_VERSION, `${seed}/${difficulty}`), difficulty), seed, difficulty, 'generated', `${LIMITED_MOVES_ID}:${difficulty}:${seed}`);
  },
  fallbackLevel(difficulty) {
    return toLevel(generateWorkshop(levelSeedKey(LIMITED_MOVES_ID, LIMITED_MOVES_VERSION, `curated/${difficulty}`), difficulty), 'curated', difficulty, 'fallback', `${LIMITED_MOVES_ID}:fallback-${difficulty}`);
  },
  validateLevel(level): ValidationResult {
    if (level.gameId !== LIMITED_MOVES_ID) return { valid: false, reasonCode: 'wrong_game' };
    const s = level.initialState;
    if (s.machines.length < 3 || s.machines.length > 14 || !s.machines.some((m) => m.target)) return { valid: false, reasonCode: 'bad_board' };
    if (s.running.length || s.spent || s.undos) return { valid: false, reasonCode: 'bad_start' };
    const best = cheapest(s);
    if (!best) return { valid: false, reasonCode: 'unsolvable' };
    if (best.cost !== s.minCost || s.budget < s.minCost) return { valid: false, reasonCode: 'budget_mismatch' };
    if (level.fingerprint !== workshopFingerprint(s)) return { valid: false, reasonCode: 'fingerprint_mismatch' };
    return { valid: true, solutionFingerprint: fingerprint(best.order.join(',')) };
  },
  reduce(s, a) {
    if (allTargetsRunning(s)) return s;
    switch (a.type) {
      case 'start': {
        const running = new Set(s.running);
        if (!s.machines[a.machine] || !canStart(s, running, a.machine)) return s;
        const price = priceOf(s, running, a.machine);
        if (price > energyLeft(s)) return s;
        return { ...s, running: [...s.running, a.machine], spent: s.spent + price };
      }
      case 'undo': {
        if (!s.running.length) return s;
        const running = s.running.slice(0, -1);
        const last = s.running[s.running.length - 1]!;
        return { ...s, running, spent: s.spent - priceOf(s, new Set(running), last), undos: s.undos + 1 };
      }
      case 'reset':
        return s.running.length ? { ...s, running: [], spent: 0, undos: s.undos + 1 } : s;
      default:
        return s;
    }
  },
  isComplete: allTargetsRunning,
  score: (s, { hintsUsed }) => 100 + Math.max(0, 50 - Math.max(0, s.undos - 1) * 5 - hintsUsed * 10),
  hint(s, tier: HintTier): GameHint {
    const plan = cheapest(s, s.running);
    const left = energyLeft(s);
    if (!plan || plan.cost > left) return { tier, text: 'There is not enough energy left for that order. Undo or reset.', highlightIds: [] };
    if (tier === 1) {
      const helper = s.machines.findIndex((m, i) => m.kind === 'gear' && !s.running.includes(i));
      return { tier, text: helper >= 0 ? 'Gears pay for themselves when they sit next to several machines you need.' : 'Start the starred machines before lighting any boiler next to them.', highlightIds: [] };
    }
    const next = plan.order.slice(0, tier === 2 ? 1 : 2);
    return { tier, text: tier === 2 ? 'Start the highlighted machine next.' : 'Start the highlighted machines next, in order.', highlightIds: next.map(machineId) };
  },
};
