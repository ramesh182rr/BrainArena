import type { DifficultyBand, GameHint, GameModule, HintTier, PuzzleLevel, ValidationResult } from '@/game-runtime/contracts';
import { createRng, fingerprint, levelSeedKey } from '@/game-runtime/rng';

/**
 * Memory Detective (W5-G01): scene reconstruction by relationships.
 *
 * Study a room scene, then rebuild it on a blank, larger map. Only how the
 * objects relate counts: for every pair, which is further left or right and
 * which is higher or lower. Shifting the whole arrangement is fine. Enough
 * correct pairs solves the round; a miss shows which pairs went wrong and
 * brings a fresh scene.
 */

export const OBJECTS = ['cup', 'lamp', 'book', 'plant', 'clock', 'ball', 'key', 'hat'] as const;

export interface SceneItem {
  obj: number;
  cell: number;
}

export interface RoundSpec {
  objects: number;
  studyMs: number;
}

export interface PairResult {
  a: number;
  b: number;
  ok: boolean;
}

export interface DetectiveResult {
  passed: boolean;
  matched: number;
  total: number;
  pairs: PairResult[];
  placed: number[];
}

export interface DetectiveState {
  band: DifficultyBand;
  sceneSize: number;
  mapSize: number;
  rounds: readonly RoundSpec[];
  seed: string;
  round: number;
  attempt: number;
  items: readonly SceneItem[];
  phase: 'ready' | 'study' | 'place' | 'feedback';
  placed: readonly (number | null)[];
  selected: number | null;
  misses: number;
  matchedTotal: number;
  pairTotal: number;
  lastResult: DetectiveResult | null;
  done: boolean;
}

export type DetectiveAction = { type: 'watch' } | { type: 'studied' } | { type: 'select'; item: number } | { type: 'place'; cell: number } | { type: 'check' };

export const MEMORY_DETECTIVE_ID = 'W5-G01';
export const MEMORY_DETECTIVE_VERSION = '1.0.0';
export const PASS_SHARE = 0.75;

const sign = (x: number) => (x > 0 ? 1 : x < 0 ? -1 : 0);

/** Compares every pair's left/right and above/below relation between scene and map. */
export function comparePairs(sceneSize: number, mapSize: number, items: readonly SceneItem[], placed: readonly number[]): PairResult[] {
  const out: PairResult[] = [];
  const rc = (cell: number, size: number) => [Math.floor(cell / size), cell % size] as const;
  for (let a = 0; a < items.length; a += 1)
    for (let b = a + 1; b < items.length; b += 1) {
      const [ra, ca] = rc(items[a]!.cell, sceneSize);
      const [rb, cb] = rc(items[b]!.cell, sceneSize);
      const [pa, qa] = rc(placed[a]!, mapSize);
      const [pb, qb] = rc(placed[b]!, mapSize);
      out.push({ a, b, ok: sign(ca - cb) === sign(qa - qb) && sign(ra - rb) === sign(pa - pb) });
    }
  return out;
}

export function sceneFor(s: Pick<DetectiveState, 'seed' | 'rounds' | 'sceneSize'>, round: number, attempt: number): SceneItem[] {
  const rng = createRng(`${s.seed}/${round}/${attempt}`);
  const spec = s.rounds[round]!;
  const objs = rng.shuffle(Array.from({ length: OBJECTS.length }, (_, i) => i)).slice(0, spec.objects);
  for (;;) {
    const cells = rng.shuffle(Array.from({ length: s.sceneSize * s.sceneSize }, (_, i) => i)).slice(0, spec.objects);
    // Avoid scenes where everything sits in one row or one column.
    const rows = new Set(cells.map((c) => Math.floor(c / s.sceneSize)));
    const cols = new Set(cells.map((c) => c % s.sceneSize));
    if (spec.objects < 3 || (rows.size > 1 && cols.size > 1)) return objs.map((obj, i) => ({ obj, cell: cells[i]! }));
  }
}

interface Profile {
  sceneSize: number;
  rounds: RoundSpec[];
}

export const DETECTIVE_PROFILES: Readonly<Record<DifficultyBand, Profile>> = {
  intro: { sceneSize: 3, rounds: [{ objects: 3, studyMs: 6000 }, { objects: 3, studyMs: 5000 }] },
  easy: { sceneSize: 3, rounds: [{ objects: 4, studyMs: 6000 }, { objects: 4, studyMs: 5000 }] },
  standard: { sceneSize: 4, rounds: [{ objects: 4, studyMs: 5000 }, { objects: 5, studyMs: 5500 }, { objects: 5, studyMs: 5000 }] },
  advanced: { sceneSize: 4, rounds: [{ objects: 5, studyMs: 5000 }, { objects: 6, studyMs: 5500 }, { objects: 6, studyMs: 5000 }] },
  expert: { sceneSize: 5, rounds: [{ objects: 6, studyMs: 5000 }, { objects: 7, studyMs: 5500 }, { objects: 7, studyMs: 5000 }] },
};

export const DETECTIVE_TUTORIALS = [
  { id: 'tutorial-1', difficulty: 'intro' as const, intro: 'Study the room, then put the objects back on the blank map. Only their arrangement matters: what is left, right, above or below what.', profile: { sceneSize: 3, rounds: [{ objects: 2, studyMs: 7000 }] } },
  { id: 'tutorial-2', difficulty: 'easy' as const, intro: 'You may shift the whole arrangement anywhere on the bigger map. Keep each pair the right way round.', profile: { sceneSize: 3, rounds: [{ objects: 3, studyMs: 6000 }] } },
  { id: 'tutorial-3', difficulty: 'standard' as const, intro: 'Objects in the same row or column count too: keep them level with each other.', profile: { sceneSize: 4, rounds: [{ objects: 4, studyMs: 6000 }] } },
];

function load(s: Omit<DetectiveState, 'items' | 'placed' | 'selected'>): Pick<DetectiveState, 'items' | 'placed' | 'selected'> {
  const items = sceneFor(s, s.round, s.attempt);
  return { items, placed: items.map(() => null), selected: null };
}

export function buildDetective(band: DifficultyBand, seed: string, p: Profile): DetectiveState {
  const base = { band, sceneSize: p.sceneSize, mapSize: p.sceneSize + 1, rounds: p.rounds, seed, round: 0, attempt: 0, phase: 'ready' as const, misses: 0, matchedTotal: 0, pairTotal: 0, lastResult: null, done: false };
  return { ...base, ...load(base) };
}

export const detectiveFingerprint = (s: DetectiveState) => fingerprint(JSON.stringify([s.sceneSize, s.rounds, s.seed]));
export const squareId = (i: number) => `square-${i}`;
export const pairCount = (n: number) => (n * (n - 1)) / 2;
export const passMark = (n: number) => Math.ceil(pairCount(n) * PASS_SHARE);

function toLevel(s: DetectiveState, seed: string, difficulty: DifficultyBand, source: PuzzleLevel['source'], levelId: string): PuzzleLevel<DetectiveState> {
  return { gameId: MEMORY_DETECTIVE_ID, levelId, generatorVersion: MEMORY_DETECTIVE_VERSION, seed, difficulty, source, fingerprint: detectiveFingerprint(s), initialState: s, metadata: { rounds: s.rounds.length, scene: s.sceneSize } };
}

export const memoryDetective: GameModule<DetectiveState, DetectiveAction> = {
  id: MEMORY_DETECTIVE_ID,
  version: MEMORY_DETECTIVE_VERSION,
  createLevel(seed, difficulty) {
    const t = DETECTIVE_TUTORIALS.find((x) => x.id === seed);
    if (t) return toLevel(buildDetective(t.difficulty, levelSeedKey(MEMORY_DETECTIVE_ID, MEMORY_DETECTIVE_VERSION, seed), t.profile), seed, t.difficulty, 'authored', `${MEMORY_DETECTIVE_ID}:${seed}`);
    return toLevel(buildDetective(difficulty, levelSeedKey(MEMORY_DETECTIVE_ID, MEMORY_DETECTIVE_VERSION, `${seed}/${difficulty}`), DETECTIVE_PROFILES[difficulty]), seed, difficulty, 'generated', `${MEMORY_DETECTIVE_ID}:${difficulty}:${seed}`);
  },
  fallbackLevel(difficulty) {
    return toLevel(buildDetective(difficulty, levelSeedKey(MEMORY_DETECTIVE_ID, MEMORY_DETECTIVE_VERSION, `curated/${difficulty}`), DETECTIVE_PROFILES[difficulty]), 'curated', difficulty, 'fallback', `${MEMORY_DETECTIVE_ID}:fallback-${difficulty}`);
  },
  validateLevel(level): ValidationResult {
    if (level.gameId !== MEMORY_DETECTIVE_ID) return { valid: false, reasonCode: 'wrong_game' };
    const s = level.initialState;
    if (s.sceneSize < 3 || s.sceneSize > 6 || s.mapSize !== s.sceneSize + 1 || !s.rounds.length) return { valid: false, reasonCode: 'bad_board' };
    for (let r = 0; r < s.rounds.length; r += 1) {
      const spec = s.rounds[r]!;
      if (spec.objects < 2 || spec.objects > Math.min(OBJECTS.length, s.sceneSize * s.sceneSize) || spec.studyMs < 2000 || spec.studyMs > 12_000) return { valid: false, reasonCode: 'bad_rounds' };
      const items = sceneFor(s, r, 0);
      if (new Set(items.map((i) => i.cell)).size !== items.length || new Set(items.map((i) => i.obj)).size !== items.length) return { valid: false, reasonCode: 'bad_scene' };
    }
    if (s.round || s.attempt || s.phase !== 'ready' || s.misses || s.done || s.placed.some((p) => p !== null)) return { valid: false, reasonCode: 'bad_start' };
    if (JSON.stringify(s.items) !== JSON.stringify(sceneFor(s, 0, 0))) return { valid: false, reasonCode: 'scene_mismatch' };
    if (level.fingerprint !== detectiveFingerprint(s)) return { valid: false, reasonCode: 'fingerprint_mismatch' };
    return { valid: true, solutionFingerprint: fingerprint(JSON.stringify(s.items)) };
  },
  reduce(s, a) {
    if (s.done) return s;
    switch (a.type) {
      case 'watch':
        return s.phase === 'place' ? s : { ...s, ...(s.phase === 'feedback' ? load(s) : {}), phase: 'study' };
      case 'studied':
        return s.phase === 'study' ? { ...s, phase: 'place', selected: 0 } : s;
      case 'select':
        if (s.phase !== 'place' || !Number.isInteger(a.item) || a.item < 0 || a.item >= s.items.length) return s;
        return s.selected === a.item ? s : { ...s, selected: a.item };
      case 'place': {
        if (s.phase !== 'place' || !Number.isInteger(a.cell) || a.cell < 0 || a.cell >= s.mapSize * s.mapSize) return s;
        const occupant = s.placed.indexOf(a.cell);
        if (s.selected === null) return occupant >= 0 ? { ...s, selected: occupant } : s;
        const placed = [...s.placed];
        if (occupant >= 0 && occupant !== s.selected) placed[occupant] = null;
        placed[s.selected] = a.cell;
        const nextEmpty = placed.findIndex((p) => p === null);
        return { ...s, placed, selected: nextEmpty >= 0 ? nextEmpty : null };
      }
      case 'check': {
        if (s.phase !== 'place' || s.placed.some((p) => p === null)) return s;
        const placed = s.placed as number[];
        const pairs = comparePairs(s.sceneSize, s.mapSize, s.items, placed);
        const matched = pairs.filter((p) => p.ok).length;
        const passed = matched >= passMark(s.items.length);
        const lastResult = { passed, matched, total: pairs.length, pairs, placed };
        if (!passed) return { ...s, phase: 'feedback', misses: s.misses + 1, attempt: s.attempt + 1, lastResult };
        const next = s.round + 1;
        const totals = { matchedTotal: s.matchedTotal + matched, pairTotal: s.pairTotal + pairs.length };
        if (next >= s.rounds.length) return { ...s, ...totals, phase: 'feedback', lastResult, done: true };
        return { ...s, ...totals, phase: 'feedback', round: next, attempt: 0, lastResult };
      }
      default:
        return s;
    }
  },
  isComplete: (s) => s.done,
  score: (s, { hintsUsed }) => 100 + Math.max(0, Math.round(50 * (s.pairTotal ? s.matchedTotal / s.pairTotal : 0)) - s.misses * 15 - hintsUsed * 10),
  hint(s, tier: HintTier): GameHint {
    if (s.phase !== 'place') return { tier, text: 'While studying, pick one object as an anchor and note where the others sit around it.', highlightIds: [] };
    const anchor = s.items.reduce((best, it, i) => (it.cell < s.items[best]!.cell ? i : best), 0);
    const it = s.items[anchor]!;
    if (tier === 1) return { tier, text: `The ${OBJECTS[it.obj]} was the one nearest the top-left of the room.`, highlightIds: [] };
    // Show where things go if the room is placed in the map's top-left corner.
    const shown = s.items
      .map((x, i) => ({ i, cell: Math.floor(x.cell / s.sceneSize) * s.mapSize + (x.cell % s.sceneSize) }))
      .filter((x) => s.placed[x.i] !== x.cell)
      .slice(0, tier === 2 ? 1 : 2);
    return { tier, text: shown.map((x) => `The ${OBJECTS[s.items[x.i]!.obj]} fits on a highlighted square.`).join(' ') || 'Your arrangement already matches. Press Check.', highlightIds: shown.map((x) => squareId(x.cell)) };
  },
};
