import type { DifficultyBand, GameHint, GameModule, HintTier, PuzzleLevel, ValidationResult } from '@/game-runtime/contracts';
import { createRng, fingerprint, levelSeedKey, type Rng } from '@/game-runtime/rng';

/**
 * Impossible Machine (W6-G05): causal machine repair by rhythm.
 *
 * A rhythm of 8 beats loops into a whimsical machine with a row of empty
 * slots. Each module reshapes the rhythm passing through it: delay shifts it,
 * echo doubles each beat, thin keeps only even counts, flip swaps beats and
 * rests, mirror plays it backwards. Fill the slots so the machine's output
 * matches the target rhythm. Modules do not commute, so the order matters.
 */

export const MODULES = ['delay', 'echo', 'thin', 'flip', 'mirror'] as const;
export type ModuleKind = (typeof MODULES)[number];
export const LENGTH = 8;
const MASK = (1 << LENGTH) - 1;

export interface MachineState {
  band: DifficultyBand;
  input: number;
  target: number;
  inventory: readonly ModuleKind[];
  slots: (number | null)[];
  /** Index into inventory currently picked up. */
  holding: number | null;
  tests: number;
  solved: boolean;
}

export type MachineAction = { type: 'pick'; item: number } | { type: 'slot'; index: number } | { type: 'run' } | { type: 'clear' };

export const IMPOSSIBLE_MACHINE_ID = 'W6-G05';
export const IMPOSSIBLE_MACHINE_VERSION = '1.0.0';

const rotate = (p: number) => ((p << 1) | (p >> (LENGTH - 1))) & MASK;
export function apply(kind: ModuleKind, p: number): number {
  switch (kind) {
    case 'delay':
      return rotate(p);
    case 'echo':
      return p | rotate(p);
    case 'thin':
      return p & 0b01010101;
    case 'flip':
      return ~p & MASK;
    case 'mirror': {
      let out = 0;
      for (let i = 0; i < LENGTH; i += 1) if (p & (1 << i)) out |= 1 << (LENGTH - 1 - i);
      return out;
    }
  }
}

export const runChain = (input: number, chain: readonly ModuleKind[]) => chain.reduce((p, k) => apply(k, p), input);
export const beats = (p: number) => Array.from({ length: LENGTH }, (_, i) => (p & (1 << i)) !== 0);

/** All orderings of `slots` items drawn from the inventory that produce the target. */
export function solveMachine(s: Pick<MachineState, 'input' | 'target' | 'inventory'>, slots: number, limit = 50): number[][] {
  const out: number[][] = [];
  const used = new Set<number>();
  const chain: number[] = [];
  const go = () => {
    if (out.length >= limit) return;
    if (chain.length === slots) {
      if (runChain(s.input, chain.map((i) => s.inventory[i]!)) === s.target) out.push([...chain]);
      return;
    }
    const tried = new Set<ModuleKind>();
    for (let i = 0; i < s.inventory.length; i += 1) {
      if (used.has(i) || tried.has(s.inventory[i]!)) continue;
      tried.add(s.inventory[i]!);
      used.add(i);
      chain.push(i);
      go();
      chain.pop();
      used.delete(i);
    }
  };
  go();
  return out;
}

interface Profile {
  slots: number;
  inventory: number;
  kinds: readonly ModuleKind[];
}

export const MACHINE_PROFILES: Readonly<Record<DifficultyBand, Profile>> = {
  intro: { slots: 1, inventory: 2, kinds: ['delay', 'echo', 'thin'] },
  easy: { slots: 2, inventory: 2, kinds: ['delay', 'echo', 'thin'] },
  standard: { slots: 2, inventory: 3, kinds: ['delay', 'echo', 'thin', 'flip'] },
  advanced: { slots: 3, inventory: 3, kinds: ['delay', 'echo', 'thin', 'flip', 'mirror'] },
  expert: { slots: 3, inventory: 4, kinds: ['delay', 'echo', 'thin', 'flip', 'mirror'] },
};

function tryBuild(rng: Rng, band: DifficultyBand, p: Profile): MachineState | null {
  // A readable input: 3–5 beats, not all bunched together.
  const input = rng.int(1, MASK - 1);
  const count = beats(input).filter(Boolean).length;
  if (count < 3 || count > 5) return null;
  const chain = Array.from({ length: p.slots }, () => rng.pick(p.kinds));
  const target = runChain(input, chain);
  if (target === input || target === 0 || target === MASK) return null;
  const decoys = Array.from({ length: p.inventory - p.slots }, () => rng.pick(p.kinds));
  const inventory = rng.shuffle([...chain, ...decoys]);
  const base = { input, target, inventory };
  const sols = solveMachine(base, p.slots);
  // Every solution must use the same multiset order (unique up to identical modules), and order must matter.
  const distinct = new Set(sols.map((sol) => sol.map((i) => inventory[i]).join(',')));
  if (distinct.size !== 1) return null;
  if (p.slots > 1 && new Set(chain).size > 1) {
    const reversed = [...chain].reverse();
    if (runChain(input, reversed) === target && reversed.join() !== chain.join()) return null;
  }
  // No shorter chain should already work.
  for (let k = 1; k < p.slots; k += 1) if (solveMachine(base, k, 1).length) return null;
  return { band, input, target, inventory, slots: Array(p.slots).fill(null), holding: null, tests: 0, solved: false };
}

export function generateMachine(key: string, band: DifficultyBand, p: Profile = MACHINE_PROFILES[band]): MachineState {
  const rng = createRng(key);
  for (let i = 0; i < 6000; i += 1) {
    const s = tryBuild(rng, band, p);
    if (s) return s;
  }
  throw new Error('No acceptable machine within the attempt budget');
}

export const MACHINE_TUTORIALS = [
  { id: 'tutorial-1', difficulty: 'intro' as const, intro: 'Pick a module and drop it in the slot, then Run. Which module turns the input rhythm into the target?', profile: MACHINE_PROFILES.intro },
  { id: 'tutorial-2', difficulty: 'easy' as const, intro: 'Two slots: the rhythm passes through the left module first. Try both orders.', profile: MACHINE_PROFILES.easy },
  { id: 'tutorial-3', difficulty: 'advanced' as const, intro: 'Mirror plays the rhythm backwards and flip swaps beats and rests. Three slots, so plan the order.', profile: MACHINE_PROFILES.advanced },
];

export const machineFingerprint = (s: MachineState) => fingerprint(JSON.stringify([s.input, s.target, s.inventory, s.slots.length]));
export const itemId = (i: number) => `module-${i}`;
export const slotId = (i: number) => `slot-${i}`;
export const outputOf = (s: MachineState) => runChain(s.input, s.slots.filter((x): x is number => x !== null).map((i) => s.inventory[i]!));

function toLevel(s: MachineState, seed: string, difficulty: DifficultyBand, source: PuzzleLevel['source'], levelId: string): PuzzleLevel<MachineState> {
  return { gameId: IMPOSSIBLE_MACHINE_ID, levelId, generatorVersion: IMPOSSIBLE_MACHINE_VERSION, seed, difficulty, source, fingerprint: machineFingerprint(s), initialState: s, metadata: { slots: s.slots.length, modules: s.inventory.length } };
}

export const impossibleMachine: GameModule<MachineState, MachineAction> = {
  id: IMPOSSIBLE_MACHINE_ID,
  version: IMPOSSIBLE_MACHINE_VERSION,
  createLevel(seed, difficulty) {
    const t = MACHINE_TUTORIALS.find((x) => x.id === seed);
    if (t) return toLevel(generateMachine(levelSeedKey(IMPOSSIBLE_MACHINE_ID, IMPOSSIBLE_MACHINE_VERSION, seed), t.difficulty, t.profile), seed, t.difficulty, 'authored', `${IMPOSSIBLE_MACHINE_ID}:${seed}`);
    return toLevel(generateMachine(levelSeedKey(IMPOSSIBLE_MACHINE_ID, IMPOSSIBLE_MACHINE_VERSION, `${seed}/${difficulty}`), difficulty), seed, difficulty, 'generated', `${IMPOSSIBLE_MACHINE_ID}:${difficulty}:${seed}`);
  },
  fallbackLevel(difficulty) {
    return toLevel(generateMachine(levelSeedKey(IMPOSSIBLE_MACHINE_ID, IMPOSSIBLE_MACHINE_VERSION, `curated/${difficulty}`), difficulty), 'curated', difficulty, 'fallback', `${IMPOSSIBLE_MACHINE_ID}:fallback-${difficulty}`);
  },
  validateLevel(level): ValidationResult {
    if (level.gameId !== IMPOSSIBLE_MACHINE_ID) return { valid: false, reasonCode: 'wrong_game' };
    const s = level.initialState;
    if (s.slots.length < 1 || s.slots.length > s.inventory.length || s.inventory.some((k) => !MODULES.includes(k))) return { valid: false, reasonCode: 'bad_machine' };
    if (s.slots.some((x) => x !== null) || s.tests || s.solved || s.holding !== null) return { valid: false, reasonCode: 'bad_start' };
    if (s.input === s.target) return { valid: false, reasonCode: 'already_solved' };
    const sols = solveMachine(s, s.slots.length);
    if (!sols.length) return { valid: false, reasonCode: 'unsolvable' };
    if (level.fingerprint !== machineFingerprint(s)) return { valid: false, reasonCode: 'fingerprint_mismatch' };
    return { valid: true, solutionFingerprint: fingerprint(sols[0]!.map((i) => s.inventory[i]).join(',')) };
  },
  reduce(s, a) {
    if (s.solved) return s;
    switch (a.type) {
      case 'pick': {
        if (!Number.isInteger(a.item) || a.item < 0 || a.item >= s.inventory.length) return s;
        // Picking a module already in a slot takes it out.
        const at = s.slots.indexOf(a.item);
        if (at >= 0) {
          const slots = [...s.slots];
          slots[at] = null;
          return { ...s, slots, holding: a.item };
        }
        return { ...s, holding: s.holding === a.item ? null : a.item };
      }
      case 'slot': {
        if (!Number.isInteger(a.index) || a.index < 0 || a.index >= s.slots.length) return s;
        const slots = [...s.slots];
        if (s.holding === null) {
          if (slots[a.index] === null) return s;
          // Tap a filled slot with empty hands to pick its module back up.
          const item = slots[a.index]!;
          slots[a.index] = null;
          return { ...s, slots, holding: item };
        }
        slots[a.index] = s.holding;
        return { ...s, slots, holding: null };
      }
      case 'run': {
        if (s.slots.some((x) => x === null)) return s;
        return { ...s, tests: s.tests + 1, solved: outputOf(s) === s.target };
      }
      case 'clear':
        return s.slots.some((x) => x !== null) || s.holding !== null ? { ...s, slots: s.slots.map(() => null), holding: null } : s;
      default:
        return s;
    }
  },
  isComplete: (s) => s.solved,
  score: (s, { hintsUsed }) => 100 + Math.max(0, 50 - Math.max(0, s.tests - 1) * 8 - hintsUsed * 10),
  hint(s, tier: HintTier): GameHint {
    const sol = solveMachine(s, s.slots.length, 1)[0];
    if (!sol) return { tier, text: 'Clear the slots and look again.', highlightIds: [] };
    if (tier === 1) {
      const used = [...new Set(sol.map((i) => s.inventory[i]))];
      return { tier, text: `The machine needs: ${used.join(', ')}.`, highlightIds: [] };
    }
    const show = sol.slice(0, tier === 2 ? 1 : 2);
    return { tier, text: show.map((item, k) => `Slot ${k + 1} takes the ${s.inventory[item]} module.`).join(' '), highlightIds: show.flatMap((item, k) => [itemId(item), slotId(k)]) };
  },
};
