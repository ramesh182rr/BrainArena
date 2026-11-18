import type { DifficultyBand, GameHint, GameModule, HintTier, PuzzleLevel, ValidationResult } from '@/game-runtime/contracts';
import { createRng, fingerprint, levelSeedKey, type Rng } from '@/game-runtime/rng';

/**
 * What's Changed? (W5-G03): visual change detection from memory.
 *
 * Study a small scene of shapes, then it is hidden and shown again with a few
 * squares altered: something vanished, appeared, moved, swapped or changed
 * colour. Mark every square that differs. A miss explains each change and
 * gives a fresh scene of the same size.
 */

export const SHAPES = ['circle', 'square', 'triangle', 'diamond', 'star', 'hexagon'] as const;
export const HUES = ['red', 'blue', 'green', 'yellow', 'purple'] as const;
export type Shape = (typeof SHAPES)[number];
export type Hue = (typeof HUES)[number];
export interface Obj {
  shape: Shape;
  hue: Hue;
}
export type Scene = readonly (Obj | null)[];

export type ChangeKind = 'vanish' | 'appear' | 'move' | 'recolour' | 'swap';
export interface Change {
  kind: ChangeKind;
  cells: number[];
  text: string;
}

export interface RoundSpec {
  objects: number;
  changes: number;
  kinds: readonly ChangeKind[];
}

export interface ChangeResult {
  correct: boolean;
  changed: number[];
  marks: number[];
}

export interface ChangedState {
  band: DifficultyBand;
  grid: number;
  rounds: readonly RoundSpec[];
  studyMs: number;
  seed: string;
  round: number;
  attempt: number;
  before: Scene;
  after: Scene;
  changes: readonly Change[];
  phase: 'ready' | 'study' | 'spot' | 'feedback';
  marks: readonly number[];
  misses: number;
  lastResult: ChangeResult | null;
  done: boolean;
}

export type ChangedAction = { type: 'watch' } | { type: 'studied' } | { type: 'toggle'; cell: number } | { type: 'check' };

export const WHATS_CHANGED_ID = 'W5-G03';
export const WHATS_CHANGED_VERSION = '1.0.0';

export const objName = (o: Obj) => `${o.hue} ${o.shape}`;
export const changedCells = (changes: readonly Change[]) => [...new Set(changes.flatMap((c) => c.cells))].sort((a, b) => a - b);

function randomObj(rng: Rng, avoid: readonly (Obj | null)[] = []): Obj {
  for (;;) {
    const o = { shape: rng.pick(SHAPES), hue: rng.pick(HUES) };
    if (!avoid.some((a) => a && a.shape === o.shape && a.hue === o.hue)) return o;
  }
}

/** Build one round's scene pair. Every change touches its own squares, so the changed squares are exactly the union. */
export function buildScene(rng: Rng, grid: number, spec: RoundSpec): { before: Scene; after: Scene; changes: Change[] } {
  for (;;) {
    const n = grid * grid;
    const before: (Obj | null)[] = Array.from({ length: n }, () => null);
    const cellsAll = rng.shuffle(Array.from({ length: n }, (_, i) => i));
    for (const c of cellsAll.slice(0, spec.objects)) before[c] = randomObj(rng, before);
    const after = [...before];
    const used = new Set<number>();
    const changes: Change[] = [];
    const freeFull = () => rng.shuffle(before.flatMap((o, i) => (o && !used.has(i) ? [i] : [])));
    const freeEmpty = () => rng.shuffle(before.flatMap((o, i) => (!o && !used.has(i) ? [i] : [])));
    // Every kind appears at least once when there is room for it.
    const kinds = rng.shuffle([...spec.kinds]);
    const plan = Array.from({ length: spec.changes }, (_, i) => kinds[i] ?? rng.pick(spec.kinds));
    let ok = true;
    for (const kind of plan) {
      const full = freeFull();
      const empty = freeEmpty();
      if (kind === 'vanish' && full[0] !== undefined) {
        const c = full[0];
        changes.push({ kind, cells: [c], text: `The ${objName(before[c]!)} vanished.` });
        after[c] = null;
        used.add(c);
      } else if (kind === 'appear' && empty[0] !== undefined) {
        const c = empty[0];
        after[c] = randomObj(rng, [...before, ...after]);
        changes.push({ kind, cells: [c], text: `A ${objName(after[c]!)} appeared.` });
        used.add(c);
      } else if (kind === 'move' && full[0] !== undefined && empty[0] !== undefined) {
        const [a, b] = [full[0], empty[0]];
        after[b] = before[a]!;
        after[a] = null;
        changes.push({ kind, cells: [a, b], text: `The ${objName(before[a]!)} moved.` });
        used.add(a).add(b);
      } else if (kind === 'recolour' && full[0] !== undefined) {
        const c = full[0];
        const o = before[c]!;
        const hues = HUES.filter((h) => h !== o.hue && ![...before, ...after].some((x) => x && x.shape === o.shape && x.hue === h));
        if (!hues.length) {
          ok = false;
          break;
        }
        const hue = rng.pick(hues);
        after[c] = { shape: o.shape, hue };
        changes.push({ kind, cells: [c], text: `The ${objName(o)} turned ${hue}.` });
        used.add(c);
      } else if (kind === 'swap' && full.length >= 2) {
        const a = full[0]!;
        const b = full.find((x) => before[x]!.shape !== before[a]!.shape);
        if (b === undefined) {
          ok = false;
          break;
        }
        after[a] = before[b]!;
        after[b] = before[a]!;
        changes.push({ kind, cells: [a, b], text: `The ${objName(before[a]!)} and the ${objName(before[b]!)} swapped places.` });
        used.add(a).add(b);
      } else {
        ok = false;
        break;
      }
    }
    // Sanity: the changed squares are exactly where the scenes differ.
    const differs = before.flatMap((o, i) => (JSON.stringify(o) !== JSON.stringify(after[i]) ? [i] : []));
    if (ok && differs.join() === changedCells(changes).join()) return { before, after, changes };
  }
}

export function sceneFor(s: Pick<ChangedState, 'seed' | 'grid' | 'rounds'>, round: number, attempt: number) {
  return buildScene(createRng(`${s.seed}/${round}/${attempt}`), s.grid, s.rounds[round]!);
}

interface Profile {
  grid: number;
  studyMs: number;
  rounds: RoundSpec[];
}

const K1: ChangeKind[] = ['vanish', 'appear'];
const K2: ChangeKind[] = ['vanish', 'appear', 'move'];
const K3: ChangeKind[] = ['vanish', 'appear', 'move', 'recolour'];
const K4: ChangeKind[] = ['vanish', 'appear', 'move', 'recolour', 'swap'];

export const CHANGED_PROFILES: Readonly<Record<DifficultyBand, Profile>> = {
  intro: { grid: 3, studyMs: 5000, rounds: [{ objects: 3, changes: 1, kinds: K1 }, { objects: 4, changes: 1, kinds: K1 }] },
  easy: { grid: 3, studyMs: 4500, rounds: [{ objects: 4, changes: 1, kinds: K2 }, { objects: 5, changes: 2, kinds: K2 }] },
  standard: { grid: 4, studyMs: 4500, rounds: [{ objects: 6, changes: 2, kinds: K3 }, { objects: 7, changes: 2, kinds: K3 }, { objects: 7, changes: 3, kinds: K3 }] },
  advanced: { grid: 4, studyMs: 4000, rounds: [{ objects: 7, changes: 2, kinds: K4 }, { objects: 8, changes: 3, kinds: K4 }, { objects: 9, changes: 3, kinds: K4 }] },
  expert: { grid: 5, studyMs: 4000, rounds: [{ objects: 10, changes: 3, kinds: K4 }, { objects: 11, changes: 4, kinds: K4 }, { objects: 12, changes: 4, kinds: K4 }] },
};

export const CHANGED_TUTORIALS = [
  { id: 'tutorial-1', difficulty: 'intro' as const, intro: 'Study the shapes, then spot the one square that changed: something vanished or appeared.', profile: { grid: 3, studyMs: 6000, rounds: [{ objects: 3, changes: 1, kinds: K1 }] } },
  { id: 'tutorial-2', difficulty: 'easy' as const, intro: 'A shape that moves changes TWO squares: where it was and where it went. Mark both.', profile: { grid: 3, studyMs: 5000, rounds: [{ objects: 4, changes: 1, kinds: ['move'] as ChangeKind[] }] } },
  { id: 'tutorial-3', difficulty: 'advanced' as const, intro: 'Look closely at colours too, and at shapes that trade places.', profile: { grid: 4, studyMs: 5000, rounds: [{ objects: 6, changes: 2, kinds: ['recolour', 'swap'] as ChangeKind[] }] } },
];

export function buildChangedState(band: DifficultyBand, seed: string, p: Profile): ChangedState {
  const base = { band, grid: p.grid, rounds: p.rounds, studyMs: p.studyMs, seed };
  const first = sceneFor(base, 0, 0);
  return { ...base, round: 0, attempt: 0, ...first, phase: 'ready', marks: [], misses: 0, lastResult: null, done: false };
}

export const changedFingerprint = (s: ChangedState) => fingerprint(JSON.stringify([s.grid, s.rounds, s.studyMs, s.seed]));
export const squareId = (i: number) => `square-${i}`;

function toLevel(s: ChangedState, seed: string, difficulty: DifficultyBand, source: PuzzleLevel['source'], levelId: string): PuzzleLevel<ChangedState> {
  return { gameId: WHATS_CHANGED_ID, levelId, generatorVersion: WHATS_CHANGED_VERSION, seed, difficulty, source, fingerprint: changedFingerprint(s), initialState: s, metadata: { rounds: s.rounds.length, grid: s.grid } };
}

export const whatsChanged: GameModule<ChangedState, ChangedAction> = {
  id: WHATS_CHANGED_ID,
  version: WHATS_CHANGED_VERSION,
  createLevel(seed, difficulty) {
    const t = CHANGED_TUTORIALS.find((x) => x.id === seed);
    if (t) return toLevel(buildChangedState(t.difficulty, levelSeedKey(WHATS_CHANGED_ID, WHATS_CHANGED_VERSION, seed), t.profile), seed, t.difficulty, 'authored', `${WHATS_CHANGED_ID}:${seed}`);
    return toLevel(buildChangedState(difficulty, levelSeedKey(WHATS_CHANGED_ID, WHATS_CHANGED_VERSION, `${seed}/${difficulty}`), CHANGED_PROFILES[difficulty]), seed, difficulty, 'generated', `${WHATS_CHANGED_ID}:${difficulty}:${seed}`);
  },
  fallbackLevel(difficulty) {
    return toLevel(buildChangedState(difficulty, levelSeedKey(WHATS_CHANGED_ID, WHATS_CHANGED_VERSION, `curated/${difficulty}`), CHANGED_PROFILES[difficulty]), 'curated', difficulty, 'fallback', `${WHATS_CHANGED_ID}:fallback-${difficulty}`);
  },
  validateLevel(level): ValidationResult {
    if (level.gameId !== WHATS_CHANGED_ID) return { valid: false, reasonCode: 'wrong_game' };
    const s = level.initialState;
    if (s.grid < 3 || s.grid > 5 || s.before.length !== s.grid * s.grid || s.after.length !== s.before.length) return { valid: false, reasonCode: 'bad_grid' };
    if (!s.rounds.length || s.rounds.some((r) => r.objects + r.changes > s.grid * s.grid || r.changes < 1 || !r.kinds.length)) return { valid: false, reasonCode: 'bad_rounds' };
    if (s.studyMs < 1500 || s.studyMs > 10_000) return { valid: false, reasonCode: 'bad_timing' };
    if (s.round || s.attempt || s.phase !== 'ready' || s.marks.length || s.misses || s.done) return { valid: false, reasonCode: 'bad_start' };
    if (JSON.stringify(sceneFor(s, 0, 0)) !== JSON.stringify({ before: s.before, after: s.after, changes: s.changes })) return { valid: false, reasonCode: 'scene_mismatch' };
    for (let r = 0; r < s.rounds.length; r += 1) {
      const sc = sceneFor(s, r, 0);
      if (sc.changes.length !== s.rounds[r]!.changes || sc.before.filter(Boolean).length !== s.rounds[r]!.objects) return { valid: false, reasonCode: 'bad_scene' };
    }
    if (level.fingerprint !== changedFingerprint(s)) return { valid: false, reasonCode: 'fingerprint_mismatch' };
    return { valid: true, solutionFingerprint: fingerprint(JSON.stringify(changedCells(s.changes))) };
  },
  reduce(s, a) {
    if (s.done) return s;
    switch (a.type) {
      case 'watch':
        // Loads this round/attempt's scene (fresh after a miss); also restarts an interrupted study.
        return s.phase === 'spot' ? s : { ...s, ...sceneFor(s, s.round, s.attempt), phase: 'study', marks: [] };
      case 'studied':
        return s.phase === 'study' ? { ...s, phase: 'spot' } : s;
      case 'toggle': {
        if (s.phase !== 'spot' || !Number.isInteger(a.cell) || a.cell < 0 || a.cell >= s.before.length) return s;
        return { ...s, marks: s.marks.includes(a.cell) ? s.marks.filter((m) => m !== a.cell) : [...s.marks, a.cell] };
      }
      case 'check': {
        const changed = changedCells(s.changes);
        if (s.phase !== 'spot' || s.marks.length !== changed.length) return s;
        const marks = [...s.marks].sort((x, y) => x - y);
        const correct = marks.join() === changed.join();
        const lastResult = { correct, changed, marks };
        if (!correct) {
          // Keep this scene on screen for the explanation; the fresh one is loaded on the next Watch.
          return { ...s, phase: 'feedback', misses: s.misses + 1, attempt: s.attempt + 1, lastResult };
        }
        const next = s.round + 1;
        if (next >= s.rounds.length) return { ...s, phase: 'feedback', lastResult, done: true };
        return { ...s, phase: 'feedback', round: next, attempt: 0, lastResult };
      }
      default:
        return s;
    }
  },
  isComplete: (s) => s.done,
  score: (s, { hintsUsed }) => 100 + Math.max(0, 50 - s.misses * 15 - hintsUsed * 10),
  hint(s, tier: HintTier): GameHint {
    if (s.phase !== 'spot') return { tier, text: 'While studying, name each shape and its colour to yourself, row by row.', highlightIds: [] };
    const changed = changedCells(s.changes);
    if (tier === 1) {
      const counts = new Map<ChangeKind, number>();
      for (const c of s.changes) counts.set(c.kind, (counts.get(c.kind) ?? 0) + 1);
      const words: Record<ChangeKind, string> = { vanish: 'vanished', appear: 'appeared', move: 'moved', recolour: 'changed colour', swap: 'swapped' };
      return { tier, text: `What happened: ${[...counts].map(([k, n]) => `${n} ${words[k]}`).join(', ')}.`, highlightIds: [] };
    }
    const missing = changed.filter((c) => !s.marks.includes(c));
    const show = missing.slice(0, tier === 2 ? 1 : 2);
    return { tier, text: show.length ? 'The highlighted square changed.' : 'Your marks are right. Press Check.', highlightIds: show.map(squareId) };
  },
};

