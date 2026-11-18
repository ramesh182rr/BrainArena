import type { DifficultyBand, GameHint, GameModule, HintTier, PuzzleLevel, ValidationResult } from '@/game-runtime/contracts';
import { createRng, fingerprint, levelSeedKey, type Rng } from '@/game-runtime/rng';

/**
 * Path Finder (W3-G03): living path construction.
 *
 * Walk a garden from the gate to the fountain. Hedges grow and shrink: every
 * step toggles the hedges right next to the square you step onto (up becomes
 * down and down becomes up). Raised hedges block. Stones never change and
 * flowers (advanced+) toggle the whole row instead. The order of steps decides
 * which way stays open. Breadth-first search gives the exact par.
 */

export type Ground = 'grass' | 'hedgeUp' | 'hedgeDown' | 'stone' | 'flower' | 'fountain';

export interface GardenState {
  band: DifficultyBand;
  width: number;
  height: number;
  ground: readonly Ground[];
  start: number;
  goal: number;
  par: number;
  at: number;
  steps: number;
  history: { ground: readonly Ground[]; at: number }[];
  initial: readonly Ground[];
}

export type GardenAction = { type: 'step'; cell: number } | { type: 'undo' } | { type: 'reset' };

export const PATH_FINDER_ID = 'W3-G03';
export const PATH_FINDER_VERSION = '1.0.0';

export function neighbours(w: number, h: number, i: number): number[] {
  const r = Math.floor(i / w);
  const c = i % w;
  return [r > 0 ? i - w : -1, c < w - 1 ? i + 1 : -1, r < h - 1 ? i + w : -1, c > 0 ? i - 1 : -1].filter((x) => x >= 0);
}

const blocks = (g: Ground) => g === 'hedgeUp' || g === 'stone';
const flip = (g: Ground): Ground => (g === 'hedgeUp' ? 'hedgeDown' : g === 'hedgeDown' ? 'hedgeUp' : g);

/** Ground after stepping onto `cell`: its neighbours' hedges toggle; a flower toggles every hedge in its row. */
export function afterStep(s: Pick<GardenState, 'width' | 'height'>, ground: readonly Ground[], cell: number): Ground[] {
  const out = [...ground];
  const targets = ground[cell] === 'flower' ? Array.from({ length: s.width }, (_, c) => Math.floor(cell / s.width) * s.width + c).filter((x) => x !== cell) : neighbours(s.width, s.height, cell);
  for (const t of targets) out[t] = flip(out[t]!);
  return out;
}

export const canEnter = (ground: readonly Ground[], cell: number) => !blocks(ground[cell]!);

/** Shortest walk as a list of cells (excluding the start), or null. */
export function solveGarden(s: Pick<GardenState, 'width' | 'height' | 'goal'>, ground: readonly Ground[], at: number, cap = 60_000): number[] | null {
  const key = (g: readonly Ground[], a: number) => `${a}|${g.map((x) => (x === 'hedgeUp' ? 1 : x === 'hedgeDown' ? 0 : '')).join('')}`;
  const prev = new Map<string, { from: string; cell: number } | null>([[key(ground, at), null]]);
  let frontier: { g: readonly Ground[]; a: number }[] = [{ g: ground, a: at }];
  while (frontier.length && prev.size < cap) {
    const next: { g: readonly Ground[]; a: number }[] = [];
    for (const { g, a } of frontier) {
      const k = key(g, a);
      for (const n of neighbours(s.width, s.height, a)) {
        if (!canEnter(g, n)) continue;
        const ng = afterStep(s, g, n);
        const nk = key(ng, n);
        if (prev.has(nk)) continue;
        prev.set(nk, { from: k, cell: n });
        if (n === s.goal) {
          const path: number[] = [];
          let cur: string | undefined = nk;
          while (cur) {
            const e = prev.get(cur);
            if (!e) break;
            path.unshift(e.cell);
            cur = e.from;
          }
          return path;
        }
        next.push({ g: ng, a: n });
      }
    }
    frontier = next;
  }
  return null;
}

interface Profile {
  size: number;
  hedges: number;
  stones: number;
  flowers: number;
  par: [number, number];
}

export const GARDEN_PROFILES: Readonly<Record<DifficultyBand, Profile>> = {
  intro: { size: 4, hedges: 4, stones: 1, flowers: 0, par: [4, 7] },
  easy: { size: 5, hedges: 7, stones: 2, flowers: 0, par: [6, 10] },
  standard: { size: 5, hedges: 9, stones: 3, flowers: 0, par: [8, 13] },
  advanced: { size: 6, hedges: 11, stones: 4, flowers: 1, par: [10, 16] },
  expert: { size: 6, hedges: 13, stones: 4, flowers: 2, par: [12, 20] },
};

function tryBuild(rng: Rng, band: DifficultyBand, p: Profile): GardenState | null {
  const n = p.size * p.size;
  const ground: Ground[] = Array.from({ length: n }, () => 'grass');
  const start = rng.int(0, p.size - 1) * p.size;
  const goal = rng.int(0, p.size - 1) * p.size + p.size - 1;
  ground[goal] = 'fountain';
  const free = () => rng.pick(ground.flatMap((g, i) => (g === 'grass' && i !== start ? [i] : [])));
  for (let k = 0; k < p.stones; k += 1) ground[free()] = 'stone';
  for (let k = 0; k < p.flowers; k += 1) ground[free()] = 'flower';
  for (let k = 0; k < p.hedges; k += 1) ground[free()] = rng.chance(0.55) ? 'hedgeUp' : 'hedgeDown';
  const sol = solveGarden({ width: p.size, height: p.size, goal }, ground, start);
  if (!sol || sol.length < p.par[0] || sol.length > p.par[1]) return null;
  // The garden must actually shift under the player: a static walk (hedges frozen) must not do as well.
  const frozen = solveGardenStatic(p.size, ground, start, goal);
  if (frozen !== null && frozen <= sol.length) return null;
  return { band, width: p.size, height: p.size, ground, start, goal, par: sol.length, at: start, steps: 0, history: [], initial: ground };
}

function solveGardenStatic(size: number, ground: readonly Ground[], start: number, goal: number): number | null {
  const dist = new Map([[start, 0]]);
  let frontier = [start];
  while (frontier.length) {
    const next: number[] = [];
    for (const a of frontier) for (const nb of neighbours(size, size, a)) if (!dist.has(nb) && canEnter(ground, nb)) {
      dist.set(nb, dist.get(a)! + 1);
      if (nb === goal) return dist.get(nb)!;
      next.push(nb);
    }
    frontier = next;
  }
  return null;
}

export function generateGarden(key: string, band: DifficultyBand, p: Profile = GARDEN_PROFILES[band]): GardenState {
  const rng = createRng(key);
  for (let i = 0; i < 3000; i += 1) {
    const s = tryBuild(rng, band, p);
    if (s) return s;
  }
  throw new Error('No acceptable garden within the attempt budget');
}

export const GARDEN_TUTORIALS = [
  { id: 'tutorial-1', difficulty: 'intro' as const, intro: 'Each step toggles the hedges next to the square you land on. Raised hedges block; lowered ones you can cross. Reach the fountain.', profile: GARDEN_PROFILES.intro },
  { id: 'tutorial-2', difficulty: 'easy' as const, intro: 'Sometimes stepping back and forth opens the way. Plan which hedges your steps will flip.', profile: GARDEN_PROFILES.easy },
  { id: 'tutorial-3', difficulty: 'advanced' as const, intro: 'Flowers toggle every hedge in their whole row when you step on them.', profile: GARDEN_PROFILES.advanced },
];

export const gardenFingerprint = (s: GardenState) => fingerprint(JSON.stringify([s.width, s.initial, s.start, s.goal]));
export const plotId = (i: number) => `plot-${i}`;

function toLevel(s: GardenState, seed: string, difficulty: DifficultyBand, source: PuzzleLevel['source'], levelId: string): PuzzleLevel<GardenState> {
  return { gameId: PATH_FINDER_ID, levelId, generatorVersion: PATH_FINDER_VERSION, seed, difficulty, source, fingerprint: gardenFingerprint(s), initialState: s, metadata: { size: s.width, par: s.par } };
}

export const pathFinder: GameModule<GardenState, GardenAction> = {
  id: PATH_FINDER_ID,
  version: PATH_FINDER_VERSION,
  createLevel(seed, difficulty) {
    const t = GARDEN_TUTORIALS.find((x) => x.id === seed);
    if (t) return toLevel(generateGarden(levelSeedKey(PATH_FINDER_ID, PATH_FINDER_VERSION, seed), t.difficulty, t.profile), seed, t.difficulty, 'authored', `${PATH_FINDER_ID}:${seed}`);
    return toLevel(generateGarden(levelSeedKey(PATH_FINDER_ID, PATH_FINDER_VERSION, `${seed}/${difficulty}`), difficulty), seed, difficulty, 'generated', `${PATH_FINDER_ID}:${difficulty}:${seed}`);
  },
  fallbackLevel(difficulty) {
    return toLevel(generateGarden(levelSeedKey(PATH_FINDER_ID, PATH_FINDER_VERSION, `curated/${difficulty}`), difficulty), 'curated', difficulty, 'fallback', `${PATH_FINDER_ID}:fallback-${difficulty}`);
  },
  validateLevel(level): ValidationResult {
    if (level.gameId !== PATH_FINDER_ID) return { valid: false, reasonCode: 'wrong_game' };
    const s = level.initialState;
    if (s.ground.length !== s.width * s.height || s.ground[s.goal] !== 'fountain' || blocks(s.ground[s.start]!)) return { valid: false, reasonCode: 'bad_board' };
    if (s.at !== s.start || s.steps || s.history.length || JSON.stringify(s.ground) !== JSON.stringify(s.initial)) return { valid: false, reasonCode: 'bad_start' };
    const sol = solveGarden(s, s.ground, s.start);
    if (!sol) return { valid: false, reasonCode: 'unsolvable' };
    if (sol.length !== s.par) return { valid: false, reasonCode: 'par_mismatch' };
    if (level.fingerprint !== gardenFingerprint(s)) return { valid: false, reasonCode: 'fingerprint_mismatch' };
    return { valid: true, solutionFingerprint: fingerprint(sol.join(',')) };
  },
  reduce(s, a) {
    if (s.at === s.goal) return s;
    switch (a.type) {
      case 'step': {
        if (!neighbours(s.width, s.height, s.at).includes(a.cell) || !canEnter(s.ground, a.cell)) return s;
        return { ...s, ground: afterStep(s, s.ground, a.cell), at: a.cell, steps: s.steps + 1, history: [...s.history, { ground: s.ground, at: s.at }].slice(-150) };
      }
      case 'undo': {
        const last = s.history[s.history.length - 1];
        return last ? { ...s, ...last, history: s.history.slice(0, -1) } : s;
      }
      case 'reset':
        return s.history.length ? { ...s, ground: s.initial, at: s.start, history: [] } : s;
      default:
        return s;
    }
  },
  isComplete: (s) => s.at === s.goal,
  score(s, { hintsUsed }) {
    const extra = s.steps - s.par;
    return 100 + Math.max(0, (extra <= 0 ? 50 : extra <= 3 ? 35 : extra <= 8 ? 20 : 10) - hintsUsed * 10);
  },
  hint(s, tier: HintTier): GameHint {
    const sol = solveGarden(s, s.ground, s.at);
    if (!sol) return { tier, text: 'The fountain is cut off from here. Undo a few steps.', highlightIds: [] };
    if (tier === 1) return { tier, text: `The fountain is ${sol.length} step${sol.length === 1 ? '' : 's'} away from here.`, highlightIds: [] };
    const next = sol.slice(0, tier === 2 ? 1 : 2);
    return { tier, text: tier === 2 ? 'Step onto the highlighted square.' : 'Step onto the highlighted squares, in order.', highlightIds: next.map(plotId) };
  },
};
