import type { DifficultyBand, GameHint, GameModule, HintTier, PuzzleLevel, ValidationResult } from '@/game-runtime/contracts';
import { createRng, fingerprint, levelSeedKey, type Rng } from '@/game-runtime/rng';

/**
 * Object Illusion (W6-G03): property transformation.
 *
 * Objects sit on the two pans of a scale. Each has a weight (1–3) and a warmth
 * (cold, mild, hot). One change alters one property of one object by one step
 * (or, from the advanced band, moves it to the other pan). Meet every scene
 * goal within the change budget. Breadth-first search proves the minimum.
 */

export const ITEMS = ['kettle', 'ice cube', 'feather', 'stone', 'teapot', 'snowball'] as const;
export const WARMTH = ['cold', 'mild', 'hot'] as const;

export interface Thing {
  item: number;
  weight: number;
  warmth: number;
  left: boolean;
}

export type Goal =
  | { k: 'tilt'; side: 'left' | 'right' | 'level' }
  | { k: 'noneHot'; side: 'left' | 'right' }
  | { k: 'countWarmth'; warmth: number; count: number }
  | { k: 'heaviest'; item: number };

export type Change = { k: 'weight' | 'warmth'; obj: number; delta: 1 | -1 } | { k: 'move'; obj: number };

export interface IllusionState {
  band: DifficultyBand;
  things0: readonly Thing[];
  goals: readonly Goal[];
  allowMove: boolean;
  par: number;
  budget: number;
  things: Thing[];
  changes: number;
  history: Thing[][];
}

export type IllusionAction = { type: 'change'; change: Change } | { type: 'undo' } | { type: 'reset' };

export const OBJECT_ILLUSION_ID = 'W6-G03';
export const OBJECT_ILLUSION_VERSION = '1.0.0';

export function applyChange(things: readonly Thing[], ch: Change): Thing[] | null {
  const t = things[ch.obj];
  if (!t) return null;
  const out = things.map((x) => ({ ...x }));
  const o = out[ch.obj]!;
  if (ch.k === 'move') o.left = !o.left;
  else if (ch.k === 'weight') {
    o.weight += ch.delta;
    if (o.weight < 1 || o.weight > 3) return null;
  } else {
    o.warmth += ch.delta;
    if (o.warmth < 0 || o.warmth > 2) return null;
  }
  return out;
}

const pan = (things: readonly Thing[], left: boolean) => things.filter((t) => t.left === left).reduce((a, t) => a + t.weight, 0);

export function goalMet(g: Goal, things: readonly Thing[]): boolean {
  switch (g.k) {
    case 'tilt': {
      const d = pan(things, true) - pan(things, false);
      return g.side === 'left' ? d > 0 : g.side === 'right' ? d < 0 : d === 0;
    }
    case 'noneHot':
      return !things.some((t) => t.left === (g.side === 'left') && t.warmth === 2);
    case 'countWarmth':
      return things.filter((t) => t.warmth === g.warmth).length === g.count;
    case 'heaviest': {
      const t = things.find((x) => x.item === g.item);
      return !!t && things.every((x) => x === t || x.weight < t.weight);
    }
  }
}

export const allMet = (goals: readonly Goal[], things: readonly Thing[]) => goals.every((g) => goalMet(g, things));

export function goalText(g: Goal): string {
  switch (g.k) {
    case 'tilt':
      return g.side === 'level' ? 'The scale must balance.' : `The ${g.side} pan must be heavier.`;
    case 'noneHot':
      return `Nothing hot on the ${g.side} pan.`;
    case 'countWarmth':
      return `Exactly ${g.count} ${WARMTH[g.warmth]} object${g.count === 1 ? '' : 's'}.`;
    case 'heaviest':
      return `The ${ITEMS[g.item]} must be the heaviest of all.`;
  }
}

export function allChanges(things: readonly Thing[], allowMove: boolean): Change[] {
  const out: Change[] = [];
  things.forEach((_, obj) => {
    for (const delta of [1, -1] as const) {
      out.push({ k: 'weight', obj, delta });
      out.push({ k: 'warmth', obj, delta });
    }
    if (allowMove) out.push({ k: 'move', obj });
  });
  return out;
}

const key = (things: readonly Thing[]) => things.map((t) => `${t.weight}${t.warmth}${t.left ? 'L' : 'R'}`).join('');

/** Fewest changes to meet every goal (BFS, depth-limited). */
export function solveIllusion(things0: readonly Thing[], goals: readonly Goal[], allowMove: boolean, maxDepth = 7): Change[] | null {
  if (allMet(goals, things0)) return [];
  const prev = new Map<string, { from: string; ch: Change } | null>([[key(things0), null]]);
  let frontier: Thing[][] = [[...things0]];
  for (let d = 0; d < maxDepth; d += 1) {
    const next: Thing[][] = [];
    for (const t of frontier) {
      for (const ch of allChanges(t, allowMove)) {
        const n = applyChange(t, ch);
        if (!n) continue;
        const k = key(n);
        if (prev.has(k)) continue;
        prev.set(k, { from: key(t), ch });
        if (allMet(goals, n)) {
          const path: Change[] = [];
          let cur: string | undefined = k;
          while (cur) {
            const e = prev.get(cur);
            if (!e) break;
            path.unshift(e.ch);
            cur = e.from;
          }
          return path;
        }
        next.push(n);
      }
    }
    frontier = next;
  }
  return null;
}

interface Profile {
  objects: number;
  goals: number;
  allowMove: boolean;
  par: [number, number];
  slack: number;
}

export const ILLUSION_PROFILES: Readonly<Record<DifficultyBand, Profile>> = {
  intro: { objects: 2, goals: 1, allowMove: false, par: [1, 2], slack: 1 },
  easy: { objects: 3, goals: 2, allowMove: false, par: [2, 3], slack: 1 },
  standard: { objects: 3, goals: 2, allowMove: false, par: [3, 4], slack: 0 },
  advanced: { objects: 4, goals: 2, allowMove: true, par: [3, 5], slack: 0 },
  expert: { objects: 4, goals: 3, allowMove: true, par: [4, 6], slack: 0 },
};

function randomGoal(rng: Rng, things: readonly Thing[]): Goal {
  switch (rng.int(0, 3)) {
    case 0:
      return { k: 'tilt', side: rng.pick(['left', 'right', 'level'] as const) };
    case 1:
      return { k: 'noneHot', side: rng.pick(['left', 'right'] as const) };
    case 2:
      return { k: 'countWarmth', warmth: rng.int(0, 2), count: rng.int(1, Math.min(2, things.length)) };
    default:
      return { k: 'heaviest', item: rng.pick(things).item };
  }
}

function tryBuild(rng: Rng, band: DifficultyBand, p: Profile): IllusionState | null {
  const items = rng.shuffle(Array.from({ length: ITEMS.length }, (_, i) => i)).slice(0, p.objects);
  const things0: Thing[] = items.map((item, i) => ({ item, weight: rng.int(1, 3), warmth: rng.int(0, 2), left: i % 2 === 0 }));
  const goals: Goal[] = [];
  for (let i = 0; i < 20 && goals.length < p.goals; i += 1) {
    const g = randomGoal(rng, things0);
    if (goals.some((x) => x.k === g.k)) continue;
    goals.push(g);
  }
  if (goals.length < p.goals) return null;
  // Each goal must start unmet or the puzzle must need real work.
  if (goals.some((g) => goalMet(g, things0))) return null;
  const sol = solveIllusion(things0, goals, p.allowMove, p.par[1]);
  if (!sol || sol.length < p.par[0]) return null;
  return { band, things0, goals, allowMove: p.allowMove, par: sol.length, budget: sol.length + p.slack, things: things0.map((t) => ({ ...t })), changes: 0, history: [] };
}

export function generateIllusion(seedKey: string, band: DifficultyBand, p: Profile = ILLUSION_PROFILES[band]): IllusionState {
  const rng = createRng(seedKey);
  for (let i = 0; i < 5000; i += 1) {
    const s = tryBuild(rng, band, p);
    if (s) return s;
  }
  throw new Error('No acceptable scene within the attempt budget');
}

export const ILLUSION_TUTORIALS = [
  { id: 'tutorial-1', difficulty: 'intro' as const, intro: 'Tap an object, then change one thing about it: heavier, lighter, warmer or cooler. Meet the goal.', profile: ILLUSION_PROFILES.intro },
  { id: 'tutorial-2', difficulty: 'easy' as const, intro: 'Two goals at once. One change can help both, or break one.', profile: ILLUSION_PROFILES.easy },
  { id: 'tutorial-3', difficulty: 'advanced' as const, intro: 'Now you can also move an object to the other pan. Every change counts.', profile: ILLUSION_PROFILES.advanced },
];

export const illusionFingerprint = (s: IllusionState) => fingerprint(JSON.stringify([s.things0, s.goals, s.allowMove, s.budget]));
export const thingId = (i: number) => `thing-${i}`;

function toLevel(s: IllusionState, seed: string, difficulty: DifficultyBand, source: PuzzleLevel['source'], levelId: string): PuzzleLevel<IllusionState> {
  return { gameId: OBJECT_ILLUSION_ID, levelId, generatorVersion: OBJECT_ILLUSION_VERSION, seed, difficulty, source, fingerprint: illusionFingerprint(s), initialState: s, metadata: { objects: s.things0.length, goals: s.goals.length, par: s.par } };
}

export const objectIllusion: GameModule<IllusionState, IllusionAction> = {
  id: OBJECT_ILLUSION_ID,
  version: OBJECT_ILLUSION_VERSION,
  createLevel(seed, difficulty) {
    const t = ILLUSION_TUTORIALS.find((x) => x.id === seed);
    if (t) return toLevel(generateIllusion(levelSeedKey(OBJECT_ILLUSION_ID, OBJECT_ILLUSION_VERSION, seed), t.difficulty, t.profile), seed, t.difficulty, 'authored', `${OBJECT_ILLUSION_ID}:${seed}`);
    return toLevel(generateIllusion(levelSeedKey(OBJECT_ILLUSION_ID, OBJECT_ILLUSION_VERSION, `${seed}/${difficulty}`), difficulty), seed, difficulty, 'generated', `${OBJECT_ILLUSION_ID}:${difficulty}:${seed}`);
  },
  fallbackLevel(difficulty) {
    return toLevel(generateIllusion(levelSeedKey(OBJECT_ILLUSION_ID, OBJECT_ILLUSION_VERSION, `curated/${difficulty}`), difficulty), 'curated', difficulty, 'fallback', `${OBJECT_ILLUSION_ID}:fallback-${difficulty}`);
  },
  validateLevel(level): ValidationResult {
    if (level.gameId !== OBJECT_ILLUSION_ID) return { valid: false, reasonCode: 'wrong_game' };
    const s = level.initialState;
    if (!s.things0.length || !s.goals.length || s.things0.some((t) => t.weight < 1 || t.weight > 3 || t.warmth < 0 || t.warmth > 2)) return { valid: false, reasonCode: 'bad_scene' };
    if (s.changes || s.history.length || JSON.stringify(s.things) !== JSON.stringify(s.things0)) return { valid: false, reasonCode: 'bad_start' };
    if (allMet(s.goals, s.things0)) return { valid: false, reasonCode: 'already_solved' };
    const sol = solveIllusion(s.things0, s.goals, s.allowMove, s.budget);
    if (!sol) return { valid: false, reasonCode: 'unsolvable' };
    if (sol.length !== s.par || s.budget < s.par) return { valid: false, reasonCode: 'par_mismatch' };
    if (level.fingerprint !== illusionFingerprint(s)) return { valid: false, reasonCode: 'fingerprint_mismatch' };
    return { valid: true, solutionFingerprint: fingerprint(JSON.stringify(sol)) };
  },
  reduce(s, a) {
    if (allMet(s.goals, s.things)) return s;
    switch (a.type) {
      case 'change': {
        if (s.changes >= s.budget || (a.change.k === 'move' && !s.allowMove)) return s;
        const things = applyChange(s.things, a.change);
        if (!things) return s;
        return { ...s, things, changes: s.changes + 1, history: [...s.history, s.things] };
      }
      case 'undo': {
        const last = s.history[s.history.length - 1];
        return last ? { ...s, things: last, changes: s.changes - 1, history: s.history.slice(0, -1) } : s;
      }
      case 'reset':
        return s.history.length ? { ...s, things: s.things0.map((t) => ({ ...t })), changes: 0, history: [] } : s;
      default:
        return s;
    }
  },
  isComplete: (s) => allMet(s.goals, s.things),
  score: (s, { hintsUsed }) => 100 + Math.max(0, 50 - Math.max(0, s.changes - s.par) * 10 - hintsUsed * 10),
  hint(s, tier: HintTier): GameHint {
    const sol = solveIllusion(s.things, s.goals, s.allowMove, Math.max(1, s.budget - s.changes));
    if (!sol) return { tier, text: 'Not enough changes left from here. Undo or reset.', highlightIds: [] };
    const unmet = s.goals.filter((g) => !goalMet(g, s.things));
    if (tier === 1) return { tier, text: `${unmet.length} goal${unmet.length === 1 ? '' : 's'} still unmet; ${sol.length} change${sol.length === 1 ? '' : 's'} can fix ${unmet.length === 1 ? 'it' : 'them'}.`, highlightIds: [] };
    const ch = sol[0]!;
    const what = ch.k === 'move' ? 'move it to the other pan' : ch.k === 'weight' ? (ch.delta > 0 ? 'make it heavier' : 'make it lighter') : ch.delta > 0 ? 'make it warmer' : 'make it cooler';
    return { tier, text: `Take the highlighted ${ITEMS[s.things[ch.obj]!.item]} and ${what}.`, highlightIds: [thingId(ch.obj)] };
  },
};
