import type { DifficultyBand, GameHint, GameModule, HintTier, PuzzleLevel, ValidationResult } from '@/game-runtime/contracts';
import { createRng, fingerprint, levelSeedKey, type Rng } from '@/game-runtime/rng';

/**
 * Logic Grid (W2-G04): multi-attribute deduction.
 *
 * Each traveller carries one item and sets out at one time of day. Clue tiles
 * relate them. The player fills one row per traveller; clues light up live and
 * the conflict detector marks exactly the clues the current entries break.
 * Every puzzle has one solution, proven by exhaustive search.
 */

export const PEOPLE = ['Ada', 'Bo', 'Cyra', 'Dax', 'Eli'] as const;
export const ITEMS = ['lantern', 'compass', 'map', 'key', 'flute'] as const;
export const TIMES = ['Dawn', 'Morning', 'Noon', 'Dusk', 'Night'] as const;

export type Clue =
  | { k: 'has'; p: number; item: number; yes: boolean }
  | { k: 'at'; p: number; time: number; yes: boolean }
  | { k: 'itemAt'; item: number; time: number; yes: boolean }
  | { k: 'before'; a: Ref; b: Ref }
  | { k: 'next'; a: Ref; b: Ref };
/** A traveller, referred to directly or by the item they carry. */
export type Ref = { p: number } | { item: number };

export interface Solution {
  item: number[];
  time: number[];
}

export interface GridState {
  band: DifficultyBand;
  n: number;
  useTimes: boolean;
  clues: Clue[];
  solution: Solution;
  /** Player entries: item and time per traveller, or null. */
  item: (number | null)[];
  time: (number | null)[];
  selected: { p: number; col: 'item' | 'time' } | null;
  checks: number;
}

export type GridAction = { type: 'select'; p: number; col: 'item' | 'time' } | { type: 'set'; value: number | null } | { type: 'reset' };

export const LOGIC_GRID_ID = 'W2-G04';
export const LOGIC_GRID_VERSION = '1.0.0';

const personOf = (r: Ref, s: Solution) => ('p' in r ? r.p : s.item.indexOf(r.item));

/** True / false for a full solution. */
export function holds(c: Clue, s: Solution): boolean {
  switch (c.k) {
    case 'has':
      return (s.item[c.p] === c.item) === c.yes;
    case 'at':
      return (s.time[c.p] === c.time) === c.yes;
    case 'itemAt':
      return (s.time[s.item.indexOf(c.item)] === c.time) === c.yes;
    case 'before':
      return s.time[personOf(c.a, s)]! < s.time[personOf(c.b, s)]!;
    case 'next':
      return s.time[personOf(c.b, s)]! === s.time[personOf(c.a, s)]! + 1;
  }
}

/** Live status against partial entries: true / false when decidable, null when still open. */
export function clueStatus(c: Clue, st: Pick<GridState, 'item' | 'time'>): boolean | null {
  const ref = (r: Ref): number | null => ('p' in r ? r.p : (() => {
    const i = st.item.indexOf(r.item);
    return i >= 0 ? i : null;
  })());
  switch (c.k) {
    case 'has': {
      const v = st.item[c.p];
      if (v !== null && v !== undefined) return (v === c.item) === c.yes;
      // Someone else already carries it: decided.
      if (st.item.includes(c.item)) return !c.yes;
      return null;
    }
    case 'at': {
      const v = st.time[c.p];
      if (v !== null && v !== undefined) return (v === c.time) === c.yes;
      if (st.time.includes(c.time)) return !c.yes;
      return null;
    }
    case 'itemAt': {
      const p = st.item.indexOf(c.item);
      if (p < 0) return null;
      const t = st.time[p];
      return t === null || t === undefined ? null : (t === c.time) === c.yes;
    }
    case 'before':
    case 'next': {
      const a = ref(c.a);
      const b = ref(c.b);
      if (a === null || b === null) return null;
      const ta = st.time[a];
      const tb = st.time[b];
      if (ta === null || ta === undefined || tb === null || tb === undefined) return null;
      return c.k === 'before' ? ta < tb : tb === ta + 1;
    }
  }
}

function permutations(n: number): number[][] {
  if (n === 0) return [[]];
  return permutations(n - 1).flatMap((p) => Array.from({ length: n }, (_, i) => [...p.slice(0, i), n - 1, ...p.slice(i)]));
}
const PERMS = new Map<number, number[][]>();
const perms = (n: number) => {
  let p = PERMS.get(n);
  if (!p) {
    p = permutations(n);
    PERMS.set(n, p);
  }
  return p;
};

/** Every solution consistent with the clues (stops after `limit`). */
export function solveGrid(n: number, useTimes: boolean, clues: readonly Clue[], limit = 2): Solution[] {
  const out: Solution[] = [];
  const identity = Array.from({ length: n }, (_, i) => i);
  for (const item of perms(n)) {
    // Prune with item-only clues first.
    if (!clues.every((c) => c.k !== 'has' || holds(c, { item, time: identity }))) continue;
    for (const time of useTimes ? perms(n) : [identity]) {
      if (clues.every((c) => holds(c, { item, time }))) {
        out.push({ item, time });
        if (out.length >= limit) return out;
      }
    }
  }
  return out;
}

const refText = (r: Ref) => ('p' in r ? PEOPLE[r.p]! : `the ${ITEMS[r.item]} carrier`);
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

export function clueText(c: Clue): string {
  switch (c.k) {
    case 'has':
      return `${PEOPLE[c.p]} ${c.yes ? 'carries' : 'does not carry'} the ${ITEMS[c.item]}.`;
    case 'at':
      return `${PEOPLE[c.p]} ${c.yes ? 'sets out' : 'does not set out'} at ${TIMES[c.time]}.`;
    case 'itemAt':
      return `The ${ITEMS[c.item]} ${c.yes ? 'leaves' : 'does not leave'} at ${TIMES[c.time]}.`;
    case 'before':
      return `${cap(refText(c.a))} sets out earlier than ${refText(c.b)}.`;
    case 'next':
      return `${cap(refText(c.b))} sets out right after ${refText(c.a)}.`;
  }
}

interface Profile {
  n: number;
  useTimes: boolean;
  /** Relative weights of clue kinds. */
  kinds: Partial<Record<Clue['k'] | 'refByItem', number>>;
  minClues: number;
}

export const GRID_PROFILES: Readonly<Record<DifficultyBand, Profile>> = {
  intro: { n: 3, useTimes: false, kinds: { has: 3 }, minClues: 2 },
  easy: { n: 3, useTimes: true, kinds: { has: 3, at: 3, itemAt: 1 }, minClues: 3 },
  standard: { n: 4, useTimes: true, kinds: { has: 3, at: 2, itemAt: 2, before: 2 }, minClues: 5 },
  advanced: { n: 4, useTimes: true, kinds: { has: 2, at: 1, itemAt: 2, before: 3, next: 2, refByItem: 1 }, minClues: 6 },
  expert: { n: 5, useTimes: true, kinds: { has: 2, at: 1, itemAt: 2, before: 3, next: 3, refByItem: 2 }, minClues: 7 },
};

function randomClue(rng: Rng, p: Profile, sol: Solution): Clue {
  const kinds = Object.entries(p.kinds).filter(([k]) => k !== 'refByItem') as [Clue['k'], number][];
  const total = kinds.reduce((a, [, w]) => a + w, 0);
  let roll = rng.next() * total;
  let kind: Clue['k'] = kinds[0]![0];
  for (const [k, w] of kinds) {
    roll -= w;
    if (roll < 0) {
      kind = k;
      break;
    }
  }
  const n = p.n;
  const yes = rng.chance(0.5);
  const person = rng.int(0, n - 1);
  const ref = (q: number): Ref => (p.kinds.refByItem && rng.chance(0.4) ? { item: sol.item[q]! } : { p: q });
  switch (kind) {
    case 'has':
      return { k: 'has', p: person, item: yes ? sol.item[person]! : rng.int(0, n - 1), yes };
    case 'at':
      return { k: 'at', p: person, time: yes ? sol.time[person]! : rng.int(0, n - 1), yes };
    case 'itemAt': {
      const item = rng.int(0, n - 1);
      return { k: 'itemAt', item, time: yes ? sol.time[sol.item.indexOf(item)]! : rng.int(0, n - 1), yes };
    }
    case 'before': {
      const [a, b] = rng.shuffle(Array.from({ length: n }, (_, i) => i)).slice(0, 2) as [number, number];
      const [early, late] = sol.time[a]! < sol.time[b]! ? [a, b] : [b, a];
      return { k: 'before', a: ref(early), b: ref(late) };
    }
    case 'next': {
      const a = rng.int(0, n - 1);
      const b = sol.time.indexOf(sol.time[a]! + 1);
      if (b < 0) return { k: 'has', p: a, item: sol.item[a]!, yes: true };
      return { k: 'next', a: ref(a), b: ref(b) };
    }
  }
}

const key = (c: Clue) => JSON.stringify(c);

export function buildGrid(band: DifficultyBand, p: Profile, clues: Clue[], solution: Solution): GridState {
  return { band, n: p.n, useTimes: p.useTimes, clues, solution, item: Array(p.n).fill(null), time: Array(p.n).fill(null), selected: null, checks: 0 };
}

export function generateGrid(seedKey: string, band: DifficultyBand, p: Profile = GRID_PROFILES[band]): GridState {
  const rng = createRng(seedKey);
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const ps = perms(p.n);
    const identity = Array.from({ length: p.n }, (_, i) => i);
    const solution = { item: rng.pick(ps), time: p.useTimes ? rng.pick(ps) : identity };
    const clues: Clue[] = [];
    const seen = new Set<string>();
    for (let i = 0; i < 60 && solveGrid(p.n, p.useTimes, clues).length > 1; i += 1) {
      const c = randomClue(rng, p, solution);
      if (!holds(c, solution) || seen.has(key(c))) continue;
      // Skip negative clues that are already implied by a positive one.
      seen.add(key(c));
      clues.push(c);
    }
    if (solveGrid(p.n, p.useTimes, clues).length !== 1) continue;
    // Prune clues that are not needed, keeping the puzzle unique.
    for (const c of rng.shuffle([...clues])) {
      const without = clues.filter((x) => x !== c);
      if (without.length >= p.minClues && solveGrid(p.n, p.useTimes, without).length === 1) clues.splice(clues.indexOf(c), 1);
    }
    if (clues.length < p.minClues) continue;
    // The answer must not be given away by direct "carries"/"sets out" clues alone.
    const direct = clues.filter((c) => (c.k === 'has' || c.k === 'at') && c.yes).length;
    if (direct >= p.n * (p.useTimes ? 2 : 1) - 1) continue;
    return buildGrid(band, p, clues, solution);
  }
  throw new Error('No acceptable grid within the attempt budget');
}

export const GRID_TUTORIALS = [
  { id: 'tutorial-1', difficulty: 'intro' as const, intro: 'Give each traveller the item the clues point to. A "does not" clue rules things out.', profile: GRID_PROFILES.intro },
  { id: 'tutorial-2', difficulty: 'easy' as const, intro: 'Now each traveller also sets out at a time of day. Fill both columns.', profile: GRID_PROFILES.easy },
  { id: 'tutorial-3', difficulty: 'advanced' as const, intro: 'Some clues compare times: "earlier than" and "right after". Clues can name a traveller by the item they carry.', profile: GRID_PROFILES.advanced },
];

export const gridFingerprint = (s: GridState) => fingerprint(JSON.stringify([s.n, s.useTimes, s.clues]));
export const cellId = (p: number, col: 'item' | 'time') => `cell-${p}-${col}`;
export const clueId = (i: number) => `clue-${i}`;

function toLevel(s: GridState, seed: string, difficulty: DifficultyBand, source: PuzzleLevel['source'], levelId: string): PuzzleLevel<GridState> {
  return { gameId: LOGIC_GRID_ID, levelId, generatorVersion: LOGIC_GRID_VERSION, seed, difficulty, source, fingerprint: gridFingerprint(s), initialState: s, metadata: { n: s.n, clues: s.clues.length } };
}

const filled = (s: GridState) => s.item.every((v) => v !== null) && (!s.useTimes || s.time.every((v) => v !== null));
export const isSolved = (s: GridState) => filled(s) && s.item.every((v, i) => v === s.solution.item[i]) && (!s.useTimes || s.time.every((v, i) => v === s.solution.time[i]));
export const brokenClues = (s: GridState) => s.clues.flatMap((c, i) => (clueStatus(c, s) === false ? [i] : []));

export const logicGrid: GameModule<GridState, GridAction> = {
  id: LOGIC_GRID_ID,
  version: LOGIC_GRID_VERSION,
  createLevel(seed, difficulty) {
    const t = GRID_TUTORIALS.find((x) => x.id === seed);
    if (t) return toLevel(generateGrid(levelSeedKey(LOGIC_GRID_ID, LOGIC_GRID_VERSION, seed), t.difficulty, t.profile), seed, t.difficulty, 'authored', `${LOGIC_GRID_ID}:${seed}`);
    return toLevel(generateGrid(levelSeedKey(LOGIC_GRID_ID, LOGIC_GRID_VERSION, `${seed}/${difficulty}`), difficulty), seed, difficulty, 'generated', `${LOGIC_GRID_ID}:${difficulty}:${seed}`);
  },
  fallbackLevel(difficulty) {
    return toLevel(generateGrid(levelSeedKey(LOGIC_GRID_ID, LOGIC_GRID_VERSION, `curated/${difficulty}`), difficulty), 'curated', difficulty, 'fallback', `${LOGIC_GRID_ID}:fallback-${difficulty}`);
  },
  validateLevel(level): ValidationResult {
    if (level.gameId !== LOGIC_GRID_ID) return { valid: false, reasonCode: 'wrong_game' };
    const s = level.initialState;
    if (s.n < 3 || s.n > 5 || s.item.length !== s.n || s.time.length !== s.n) return { valid: false, reasonCode: 'bad_grid' };
    if (s.item.some((v) => v !== null) || s.time.some((v) => v !== null) || s.checks) return { valid: false, reasonCode: 'bad_start' };
    const sols = solveGrid(s.n, s.useTimes, s.clues);
    if (sols.length !== 1) return { valid: false, reasonCode: sols.length ? 'ambiguous' : 'unsolvable' };
    if (JSON.stringify(sols[0]) !== JSON.stringify(s.solution)) return { valid: false, reasonCode: 'solution_mismatch' };
    if (level.fingerprint !== gridFingerprint(s)) return { valid: false, reasonCode: 'fingerprint_mismatch' };
    return { valid: true, solutionFingerprint: fingerprint(JSON.stringify(s.solution)) };
  },
  reduce(s, a) {
    if (isSolved(s)) return s;
    switch (a.type) {
      case 'select': {
        if (!Number.isInteger(a.p) || a.p < 0 || a.p >= s.n || (a.col === 'time' && !s.useTimes)) return s;
        if (s.selected?.p === a.p && s.selected.col === a.col) return s;
        return { ...s, selected: { p: a.p, col: a.col } };
      }
      case 'set': {
        if (!s.selected || (a.value !== null && (!Number.isInteger(a.value) || a.value < 0 || a.value >= s.n))) return s;
        const col = s.selected.col;
        const values = [...s[col]];
        // A value belongs to one traveller: setting it here clears it elsewhere.
        if (a.value !== null) values.forEach((v, i) => v === a.value && (values[i] = null));
        values[s.selected.p] = a.value;
        const next = { ...s, [col]: values };
        // Move to the next empty cell in this column for quick entry.
        const empty = values.findIndex((v) => v === null);
        return { ...next, selected: empty >= 0 ? { p: empty, col } : null, checks: s.checks + 1 };
      }
      case 'reset':
        return s.item.some((v) => v !== null) || s.time.some((v) => v !== null) ? { ...s, item: s.item.map(() => null), time: s.time.map(() => null), selected: null } : s;
      default:
        return s;
    }
  },
  isComplete: isSolved,
  score: (s, { hintsUsed }) => 100 + Math.max(0, 50 - Math.max(0, s.checks - s.n * (s.useTimes ? 2 : 1) * 2) * 2 - hintsUsed * 10),
  hint(s, tier: HintTier): GameHint {
    const broken = brokenClues(s);
    if (broken.length) return { tier, text: 'The highlighted clue is broken by your entries.', highlightIds: broken.slice(0, 1).map(clueId) };
    if (tier === 1) {
      const i = s.clues.findIndex((c, k) => (c.k === 'has' || c.k === 'at') && c.yes && clueStatus(s.clues[k]!, s) === null);
      return { tier, text: i >= 0 ? 'Start with the highlighted clue: it fixes one entry directly.' : 'Look for a clue that leaves only one option for someone.', highlightIds: i >= 0 ? [clueId(i)] : [] };
    }
    const wrong: { p: number; col: 'item' | 'time' }[] = [];
    for (let p = 0; p < s.n; p += 1) {
      if (s.item[p] !== s.solution.item[p]) wrong.push({ p, col: 'item' });
      if (s.useTimes && s.time[p] !== s.solution.time[p]) wrong.push({ p, col: 'time' });
    }
    const show = wrong.slice(0, tier === 2 ? 1 : 2);
    return {
      tier,
      text: show.map((w) => (w.col === 'item' ? `${PEOPLE[w.p]} carries the ${ITEMS[s.solution.item[w.p]!]}.` : `${PEOPLE[w.p]} sets out at ${TIMES[s.solution.time[w.p]!]}.`)).join(' '),
      highlightIds: show.map((w) => cellId(w.p, w.col)),
    };
  },
};
