import type { DifficultyBand, GameHint, GameModule, HintTier, PuzzleLevel, ValidationResult } from '@/game-runtime/contracts';
import { createRng, fingerprint, levelSeedKey } from '@/game-runtime/rng';

import { HUES, SHAPES, type Obj } from '../whats-changed/logic';

/**
 * Snapshot Memory (W5-G05): spatial map memory from partial views.
 *
 * A room is never shown whole. A small camera window sweeps across it, frame
 * by frame, while a mini-map shows where the window is. Afterwards the player
 * places each object on the blank room map. Exact squares score 2, a
 * neighbouring square scores 1; enough points passes the round.
 */

export interface Item {
  obj: Obj;
  cell: number;
}

export interface RoomSpec {
  size: number;
  view: number;
  objects: number;
  frameMs: number;
}

export interface SnapshotResult {
  passed: boolean;
  points: number;
  max: number;
  placed: number[];
}

export interface SnapshotState {
  band: DifficultyBand;
  rounds: readonly RoomSpec[];
  seed: string;
  round: number;
  attempt: number;
  items: readonly Item[];
  frames: readonly number[];
  phase: 'ready' | 'show' | 'place' | 'feedback';
  placed: readonly (number | null)[];
  selected: number | null;
  misses: number;
  earned: number;
  possible: number;
  lastResult: SnapshotResult | null;
  done: boolean;
}

export type SnapshotAction =
  | { type: 'watch' }
  | { type: 'shown' }
  | { type: 'select'; item: number }
  | { type: 'place'; cell: number }
  | { type: 'check' };

export const SNAPSHOT_MEMORY_ID = 'W5-G05';
export const SNAPSHOT_MEMORY_VERSION = '1.0.0';
export const PASS_SHARE = 0.6;

/** Window top-left corners, sweeping row by row in a snake so neighbouring frames touch. */
export function sweep(size: number, view: number): number[] {
  const steps: number[] = [];
  for (let p = 0; p < size - view; p += view) steps.push(p);
  steps.push(size - view);
  const out: number[] = [];
  steps.forEach((r, k) => {
    const cols = k % 2 ? [...steps].reverse() : steps;
    for (const c of cols) out.push(r * size + c);
  });
  return out;
}

export function frameCells(size: number, view: number, corner: number): number[] {
  const r0 = Math.floor(corner / size);
  const c0 = corner % size;
  const out: number[] = [];
  for (let r = 0; r < view; r += 1) for (let c = 0; c < view; c += 1) out.push((r0 + r) * size + c0 + c);
  return out;
}

export function distance(size: number, a: number, b: number): number {
  return Math.max(Math.abs(Math.floor(a / size) - Math.floor(b / size)), Math.abs((a % size) - (b % size)));
}

export const pointsFor = (size: number, truth: number, guess: number) => (truth === guess ? 2 : distance(size, truth, guess) === 1 ? 1 : 0);

export function roomFor(s: Pick<SnapshotState, 'seed' | 'rounds'>, round: number, attempt: number): Item[] {
  const spec = s.rounds[round]!;
  const rng = createRng(`${s.seed}/${round}/${attempt}`);
  const objs = rng.shuffle(SHAPES.flatMap((shape) => HUES.map((hue) => ({ shape, hue }))));
  // Distinct shapes first so objects are easy to tell apart, then distinct colours.
  const chosen: Obj[] = [];
  for (const o of objs) if (chosen.length < spec.objects && !chosen.some((x) => x.shape === o.shape || x.hue === o.hue)) chosen.push(o);
  for (const o of objs) if (chosen.length < spec.objects && !chosen.some((x) => x.shape === o.shape && x.hue === o.hue)) chosen.push(o);
  const cells = rng.shuffle(Array.from({ length: spec.size * spec.size }, (_, i) => i)).slice(0, spec.objects);
  return chosen.map((obj, i) => ({ obj, cell: cells[i]! }));
}

interface Profile {
  rounds: RoomSpec[];
}

export const SNAPSHOT_PROFILES: Readonly<Record<DifficultyBand, Profile>> = {
  intro: { rounds: [{ size: 4, view: 2, objects: 3, frameMs: 1800 }, { size: 4, view: 2, objects: 3, frameMs: 1600 }] },
  easy: { rounds: [{ size: 4, view: 2, objects: 4, frameMs: 1600 }, { size: 4, view: 2, objects: 5, frameMs: 1500 }] },
  standard: { rounds: [{ size: 5, view: 3, objects: 5, frameMs: 1800 }, { size: 5, view: 3, objects: 5, frameMs: 1600 }, { size: 5, view: 3, objects: 6, frameMs: 1600 }] },
  advanced: { rounds: [{ size: 6, view: 3, objects: 6, frameMs: 1700 }, { size: 6, view: 3, objects: 7, frameMs: 1600 }, { size: 6, view: 3, objects: 7, frameMs: 1500 }] },
  expert: { rounds: [{ size: 6, view: 2, objects: 7, frameMs: 1300 }, { size: 6, view: 2, objects: 8, frameMs: 1200 }, { size: 6, view: 2, objects: 8, frameMs: 1100 }] },
};

export const SNAPSHOT_TUTORIALS = [
  { id: 'tutorial-1', difficulty: 'intro' as const, intro: 'You only see part of the room at a time. Watch the mini-map to know where the window is.', profile: { rounds: [{ size: 4, view: 2, objects: 2, frameMs: 2200 }] } },
  { id: 'tutorial-2', difficulty: 'easy' as const, intro: 'Place every object on the map. Right square: 2 points. One square off: 1 point.', profile: { rounds: [{ size: 4, view: 2, objects: 4, frameMs: 1800 }] } },
  { id: 'tutorial-3', difficulty: 'standard' as const, intro: 'Bigger rooms, bigger windows. Link each view to the one before it.', profile: { rounds: [{ size: 5, view: 3, objects: 5, frameMs: 2000 }] } },
];

function loadRoom(s: Omit<SnapshotState, 'items' | 'frames' | 'placed'>): Pick<SnapshotState, 'items' | 'frames' | 'placed' | 'selected'> {
  const spec = s.rounds[s.round]!;
  const items = roomFor(s, s.round, s.attempt);
  return { items, frames: sweep(spec.size, spec.view), placed: items.map(() => null), selected: null };
}

export function buildSnapshotState(band: DifficultyBand, seed: string, p: Profile): SnapshotState {
  const base = { band, rounds: p.rounds, seed, round: 0, attempt: 0, phase: 'ready' as const, misses: 0, earned: 0, possible: 0, lastResult: null, done: false, selected: null };
  return { ...base, ...loadRoom(base) };
}

export const snapshotFingerprint = (s: SnapshotState) => fingerprint(JSON.stringify([s.rounds, s.seed]));
export const squareId = (i: number) => `square-${i}`;
export const specOf = (s: SnapshotState) => s.rounds[Math.min(s.round, s.rounds.length - 1)]!;
export const passMark = (objects: number) => Math.ceil(objects * 2 * PASS_SHARE);

function toLevel(s: SnapshotState, seed: string, difficulty: DifficultyBand, source: PuzzleLevel['source'], levelId: string): PuzzleLevel<SnapshotState> {
  return { gameId: SNAPSHOT_MEMORY_ID, levelId, generatorVersion: SNAPSHOT_MEMORY_VERSION, seed, difficulty, source, fingerprint: snapshotFingerprint(s), initialState: s, metadata: { rounds: s.rounds.length, size: s.rounds[0]!.size } };
}

export const snapshotMemory: GameModule<SnapshotState, SnapshotAction> = {
  id: SNAPSHOT_MEMORY_ID,
  version: SNAPSHOT_MEMORY_VERSION,
  createLevel(seed, difficulty) {
    const t = SNAPSHOT_TUTORIALS.find((x) => x.id === seed);
    if (t) return toLevel(buildSnapshotState(t.difficulty, levelSeedKey(SNAPSHOT_MEMORY_ID, SNAPSHOT_MEMORY_VERSION, seed), t.profile), seed, t.difficulty, 'authored', `${SNAPSHOT_MEMORY_ID}:${seed}`);
    return toLevel(buildSnapshotState(difficulty, levelSeedKey(SNAPSHOT_MEMORY_ID, SNAPSHOT_MEMORY_VERSION, `${seed}/${difficulty}`), SNAPSHOT_PROFILES[difficulty]), seed, difficulty, 'generated', `${SNAPSHOT_MEMORY_ID}:${difficulty}:${seed}`);
  },
  fallbackLevel(difficulty) {
    return toLevel(buildSnapshotState(difficulty, levelSeedKey(SNAPSHOT_MEMORY_ID, SNAPSHOT_MEMORY_VERSION, `curated/${difficulty}`), SNAPSHOT_PROFILES[difficulty]), 'curated', difficulty, 'fallback', `${SNAPSHOT_MEMORY_ID}:fallback-${difficulty}`);
  },
  validateLevel(level): ValidationResult {
    if (level.gameId !== SNAPSHOT_MEMORY_ID) return { valid: false, reasonCode: 'wrong_game' };
    const s = level.initialState;
    if (!s.rounds.length) return { valid: false, reasonCode: 'bad_rounds' };
    for (let r = 0; r < s.rounds.length; r += 1) {
      const spec = s.rounds[r]!;
      if (spec.view < 2 || spec.view >= spec.size || spec.size > 7 || spec.objects < 2 || spec.objects > spec.size * spec.size / 2) return { valid: false, reasonCode: 'bad_rounds' };
      if (spec.frameMs < 600 || spec.frameMs > 4000) return { valid: false, reasonCode: 'bad_timing' };
      const items = roomFor(s, r, 0);
      if (new Set(items.map((i) => i.cell)).size !== items.length || new Set(items.map((i) => `${i.obj.shape}/${i.obj.hue}`)).size !== items.length) return { valid: false, reasonCode: 'bad_room' };
      // Every square is seen in at least one frame.
      const seen = new Set(sweep(spec.size, spec.view).flatMap((c) => frameCells(spec.size, spec.view, c)));
      if (seen.size !== spec.size * spec.size) return { valid: false, reasonCode: 'bad_sweep' };
    }
    if (s.round || s.attempt || s.phase !== 'ready' || s.placed.some((p) => p !== null) || s.misses || s.done) return { valid: false, reasonCode: 'bad_start' };
    if (JSON.stringify(s.items) !== JSON.stringify(roomFor(s, 0, 0))) return { valid: false, reasonCode: 'room_mismatch' };
    if (level.fingerprint !== snapshotFingerprint(s)) return { valid: false, reasonCode: 'fingerprint_mismatch' };
    return { valid: true, solutionFingerprint: fingerprint(JSON.stringify(s.items)) };
  },
  reduce(s, a) {
    if (s.done) return s;
    switch (a.type) {
      case 'watch':
        if (s.phase === 'place') return s;
        return { ...s, ...(s.phase === 'feedback' ? loadRoom(s) : {}), phase: 'show' };
      case 'shown':
        return s.phase === 'show' ? { ...s, phase: 'place', selected: 0 } : s;
      case 'select':
        if (s.phase !== 'place' || !Number.isInteger(a.item) || a.item < 0 || a.item >= s.items.length) return s;
        return s.selected === a.item ? { ...s, selected: null } : { ...s, selected: a.item };
      case 'place': {
        const size = specOf(s).size;
        if (s.phase !== 'place' || !Number.isInteger(a.cell) || a.cell < 0 || a.cell >= size * size) return s;
        const occupant = s.placed.indexOf(a.cell);
        if (s.selected === null) {
          // Tapping a placed object picks it up again.
          return occupant >= 0 ? { ...s, selected: occupant } : s;
        }
        const placed = [...s.placed];
        if (occupant >= 0 && occupant !== s.selected) placed[occupant] = null;
        placed[s.selected] = a.cell;
        const nextEmpty = placed.findIndex((p) => p === null);
        return { ...s, placed, selected: nextEmpty >= 0 ? nextEmpty : null };
      }
      case 'check': {
        if (s.phase !== 'place' || s.placed.some((p) => p === null)) return s;
        const size = specOf(s).size;
        const placed = s.placed as number[];
        const points = s.items.reduce((sum, it, i) => sum + pointsFor(size, it.cell, placed[i]!), 0);
        const max = s.items.length * 2;
        const passed = points >= passMark(s.items.length);
        const lastResult = { passed, points, max, placed };
        if (!passed) return { ...s, phase: 'feedback', misses: s.misses + 1, attempt: s.attempt + 1, lastResult };
        const earned = s.earned + points;
        const possible = s.possible + max;
        const next = s.round + 1;
        if (next >= s.rounds.length) return { ...s, phase: 'feedback', earned, possible, lastResult, done: true };
        return { ...s, phase: 'feedback', earned, possible, round: next, attempt: 0, lastResult };
      }
      default:
        return s;
    }
  },
  isComplete: (s) => s.done,
  /** Base 100 for clearing every room; the bonus reflects accuracy on passed rooms, minus misses and hints. */
  score: (s, { hintsUsed }) => 100 + Math.max(0, Math.round(50 * (s.possible ? s.earned / s.possible : 0)) - s.misses * 15 - hintsUsed * 10),
  hint(s, tier: HintTier): GameHint {
    if (s.phase !== 'place') return { tier, text: 'Name each object and the corner of the room it sits in as the window passes.', highlightIds: [] };
    const size = specOf(s).size;
    const wrong = s.items.flatMap((it, i) => (s.placed[i] !== it.cell ? [i] : []));
    if (!wrong.length) return { tier, text: 'Everything is in place. Press Check.', highlightIds: [] };
    const first = s.items[wrong[0]!]!;
    if (tier === 1) {
      const r = Math.floor(first.cell / size) < size / 2 ? 'top' : 'bottom';
      const c = first.cell % size < size / 2 ? 'left' : 'right';
      return { tier, text: `The ${first.obj.hue} ${first.obj.shape} is in the ${r}-${c} part of the room.`, highlightIds: [] };
    }
    const show = wrong.slice(0, tier === 2 ? 1 : 2).map((i) => s.items[i]!);
    return { tier, text: show.map((it) => `The ${it.obj.hue} ${it.obj.shape} belongs on a highlighted square.`).join(' '), highlightIds: show.map((it) => squareId(it.cell)) };
  },
};
