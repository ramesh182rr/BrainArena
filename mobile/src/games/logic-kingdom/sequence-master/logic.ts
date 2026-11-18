import type { DifficultyBand, GameHint, GameModule, HintTier, PuzzleLevel, ValidationResult } from '@/game-runtime/contracts';
import { createRng, fingerprint, levelSeedKey, type Rng } from '@/game-runtime/rng';

/**
 * Sequence Master (W2-G03): rule composition.
 *
 * Each sequence is built by repeating a short cycle of steps (+n, −n, ×n).
 * Some terms are hidden; the player fills them in. Every blank is proven to be
 * forced: all step cycles allowed for the band that fit the visible terms
 * predict the same values.
 */

export type StepOp = 'add' | 'sub' | 'mul';
export interface Step {
  op: StepOp;
  n: number;
}

export interface SeqRound {
  start: number;
  cycle: readonly Step[];
  length: number;
  /** Indices of hidden terms. */
  blanks: readonly number[];
}

export interface SequenceState {
  band: DifficultyBand;
  rounds: readonly SeqRound[];
  round: number;
  /** Text typed into each blank of the current round. */
  entries: readonly string[];
  active: number;
  showSteps: boolean;
  misses: number;
  /** Per-blank correctness of the latest check, if it failed. */
  wrong: readonly boolean[] | null;
  done: boolean;
}

export type SequenceAction =
  | { type: 'digit'; digit: number }
  | { type: 'backspace' }
  | { type: 'select'; blank: number }
  | { type: 'toggleSteps' }
  | { type: 'check' };

export const SEQUENCE_MASTER_ID = 'W2-G03';
export const SEQUENCE_MASTER_VERSION = '1.0.0';
const MAX_VALUE = 999;

export function applyStep(value: number, s: Step): number {
  return s.op === 'add' ? value + s.n : s.op === 'sub' ? value - s.n : value * s.n;
}

export function terms(r: Pick<SeqRound, 'start' | 'cycle' | 'length'>): number[] {
  const out = [r.start];
  for (let i = 1; i < r.length; i += 1) out.push(applyStep(out[i - 1]!, r.cycle[(i - 1) % r.cycle.length]!));
  return out;
}

export const stepText = (s: Step) => `${s.op === 'add' ? '+' : s.op === 'sub' ? '−' : '×'}${s.n}`;

/** Steps a player might consider between two numbers. */
function stepsBetween(a: number, b: number): Step[] {
  const out: Step[] = [];
  if (b - a >= 1 && b - a <= 12) out.push({ op: 'add', n: b - a });
  if (a - b >= 1 && a - b <= 9) out.push({ op: 'sub', n: a - b });
  if (a !== 0 && b % a === 0 && b / a >= 2 && b / a <= 4) out.push({ op: 'mul', n: b / a });
  return out;
}

const ALL_STEPS: Step[] = [
  ...Array.from({ length: 12 }, (_, i) => ({ op: 'add', n: i + 1 }) as Step),
  ...Array.from({ length: 9 }, (_, i) => ({ op: 'sub', n: i + 1 }) as Step),
  ...[2, 3, 4].map((n) => ({ op: 'mul', n }) as Step),
];

export interface SeqProfile {
  cycleLengths: readonly number[];
  ops: readonly StepOp[];
  length: number;
  blanks: 'end1' | 'end2' | 'mid1end1' | 'mid2';
  rounds: number;
}

export const SEQ_PROFILES: Readonly<Record<DifficultyBand, SeqProfile>> = {
  intro: { cycleLengths: [1], ops: ['add'], length: 6, blanks: 'end1', rounds: 3 },
  easy: { cycleLengths: [1, 2], ops: ['add', 'sub'], length: 7, blanks: 'end1', rounds: 3 },
  standard: { cycleLengths: [2], ops: ['add', 'sub', 'mul'], length: 8, blanks: 'end2', rounds: 3 },
  advanced: { cycleLengths: [2, 3], ops: ['add', 'sub', 'mul'], length: 9, blanks: 'mid1end1', rounds: 3 },
  expert: { cycleLengths: [2, 3], ops: ['add', 'sub', 'mul'], length: 9, blanks: 'mid2', rounds: 3 },
};

/**
 * True when every cycle (of an allowed length) that reproduces the visible
 * terms predicts the same hidden values. Visible neighbouring pairs narrow each
 * position in the cycle to a few candidate steps, so the check is small.
 */
export function blanksForced(r: SeqRound, cycleLengths: readonly number[]): boolean {
  const all = terms(r);
  const hidden = new Set(r.blanks);
  const predictions = new Set<string>();
  for (const L of cycleLengths) {
    const options: Step[][] = Array.from({ length: L }, () => ALL_STEPS);
    for (let i = 0; i + 1 < all.length; i += 1) {
      if (hidden.has(i) || hidden.has(i + 1)) continue;
      const fit = stepsBetween(all[i]!, all[i + 1]!);
      const k = i % L;
      options[k] = options[k]!.filter((s) => fit.some((f) => f.op === s.op && f.n === s.n));
    }
    if (options.some((o) => o.length === 0)) continue;
    const combos = options.reduce<Step[][]>((acc, opts) => acc.flatMap((c) => opts.map((o) => [...c, o])), [[]]);
    if (combos.length > 400) return false;
    for (const cycle of combos) {
      const t = terms({ start: r.start, cycle, length: r.length });
      if (t.some((v, i) => !hidden.has(i) && v !== all[i])) continue;
      predictions.add(r.blanks.map((b) => t[b]).join(','));
    }
  }
  return predictions.size === 1;
}

function blankIndices(kind: SeqProfile['blanks'], length: number, rng: Rng): number[] {
  switch (kind) {
    case 'end1':
      return [length - 1];
    case 'end2':
      return [length - 2, length - 1];
    case 'mid1end1':
      return [rng.int(3, length - 3), length - 1];
    case 'mid2': {
      const a = rng.int(3, length - 4);
      return [a, rng.int(a + 2, length - 1)];
    }
  }
}

function makeRound(rng: Rng, p: SeqProfile): SeqRound | null {
  const L = rng.pick(p.cycleLengths.filter((l) => l > 1).length ? p.cycleLengths.filter((l) => l > 1) : p.cycleLengths);
  const cycle: Step[] = Array.from({ length: L }, () => {
    const op = rng.pick(p.ops);
    return { op, n: op === 'add' ? rng.int(1, 12) : op === 'sub' ? rng.int(1, 9) : rng.int(2, 3) };
  });
  if (L > 1 && cycle.every((s) => s.op === cycle[0]!.op && s.n === cycle[0]!.n)) return null;
  const start = rng.int(1, 20);
  const round = { start, cycle, length: p.length, blanks: blankIndices(p.blanks, p.length, rng) };
  const t = terms(round);
  if (t.some((v) => v < 0 || v > MAX_VALUE)) return null;
  return blanksForced(round, p.cycleLengths) ? round : null;
}

export function buildSequenceState(band: DifficultyBand, rounds: readonly SeqRound[]): SequenceState {
  return {
    band,
    rounds,
    round: 0,
    entries: rounds[0]!.blanks.map(() => ''),
    active: 0,
    showSteps: false,
    misses: 0,
    wrong: null,
    done: false,
  };
}

export function generateSequenceState(key: string, band: DifficultyBand): SequenceState {
  const rng = createRng(key);
  const p = SEQ_PROFILES[band];
  const rounds: SeqRound[] = [];
  for (let attempt = 0; rounds.length < p.rounds && attempt < 400; attempt += 1) {
    const r = makeRound(rng, p);
    if (r) rounds.push(r);
  }
  if (rounds.length < p.rounds) throw new Error('No acceptable sequences within the attempt budget');
  return buildSequenceState(band, rounds);
}

export const SEQ_TUTORIALS = [
  {
    id: 'tutorial-1',
    difficulty: 'intro' as const,
    intro: 'Each number comes from the one before by the same step. Work out the step and type the missing number.',
    rounds: [{ start: 3, cycle: [{ op: 'add', n: 4 }], length: 6, blanks: [5] }] as SeqRound[],
  },
  {
    id: 'tutorial-2',
    difficulty: 'easy' as const,
    intro: 'Now two steps take turns. Switch on "Show gaps" to compare the jumps between numbers.',
    rounds: [{ start: 2, cycle: [{ op: 'add', n: 3 }, { op: 'add', n: 5 }], length: 7, blanks: [6] }] as SeqRound[],
  },
  {
    id: 'tutorial-3',
    difficulty: 'standard' as const,
    intro: 'Steps can multiply too. Two numbers are missing this time.',
    rounds: [{ start: 1, cycle: [{ op: 'mul', n: 2 }, { op: 'add', n: 1 }], length: 8, blanks: [6, 7] }] as SeqRound[],
  },
];

export const seqFingerprint = (s: Pick<SequenceState, 'band' | 'rounds'>) => fingerprint(JSON.stringify([s.band, s.rounds]));
export const blankId = (i: number) => `blank-${i}`;

function toLevel(state: SequenceState, seed: string, difficulty: DifficultyBand, source: PuzzleLevel['source'], levelId: string): PuzzleLevel<SequenceState> {
  return { gameId: SEQUENCE_MASTER_ID, levelId, generatorVersion: SEQUENCE_MASTER_VERSION, seed, difficulty, source, fingerprint: seqFingerprint(state), initialState: state, metadata: { rounds: state.rounds.length } };
}

const currentRound = (s: SequenceState) => s.rounds[s.round]!;

function hintFor(s: SequenceState, tier: HintTier): GameHint {
  const r = s.rounds[s.round];
  if (!r || s.done) return { tier, text: 'All sequences complete.', highlightIds: [] };
  const first = r.blanks[0]!;
  if (tier === 1) return { tier, text: `The pattern repeats every ${r.cycle.length === 1 ? 'single step' : `${r.cycle.length} steps`}.`, highlightIds: [] };
  if (tier === 2) return { tier, text: `The step into the first blank is ${stepText(r.cycle[(first - 1) % r.cycle.length]!)}.`, highlightIds: [blankId(0)] };
  return { tier, text: `The first blank is ${terms(r)[first]}.`, highlightIds: [blankId(0)] };
}

export const sequenceMaster: GameModule<SequenceState, SequenceAction> = {
  id: SEQUENCE_MASTER_ID,
  version: SEQUENCE_MASTER_VERSION,
  createLevel(seed, difficulty) {
    const t = SEQ_TUTORIALS.find((x) => x.id === seed);
    if (t) return toLevel(buildSequenceState(t.difficulty, t.rounds), seed, t.difficulty, 'authored', `${SEQUENCE_MASTER_ID}:${seed}`);
    const key = levelSeedKey(SEQUENCE_MASTER_ID, SEQUENCE_MASTER_VERSION, `${seed}/${difficulty}`);
    return toLevel(generateSequenceState(key, difficulty), seed, difficulty, 'generated', `${SEQUENCE_MASTER_ID}:${difficulty}:${seed}`);
  },
  fallbackLevel(difficulty) {
    const key = levelSeedKey(SEQUENCE_MASTER_ID, SEQUENCE_MASTER_VERSION, `curated/${difficulty}`);
    return toLevel(generateSequenceState(key, difficulty), 'curated', difficulty, 'fallback', `${SEQUENCE_MASTER_ID}:fallback-${difficulty}`);
  },
  validateLevel(level): ValidationResult {
    if (level.gameId !== SEQUENCE_MASTER_ID) return { valid: false, reasonCode: 'wrong_game' };
    const s = level.initialState;
    if (s.rounds.length === 0) return { valid: false, reasonCode: 'no_rounds' };
    if (s.round !== 0 || s.misses || s.done || s.entries.some((e) => e !== '')) return { valid: false, reasonCode: 'bad_start' };
    const lengths = SEQ_PROFILES[s.band].cycleLengths;
    for (const r of s.rounds) {
      const t = terms(r);
      if (r.blanks.length === 0 || r.blanks.some((b) => b < 1 || b >= r.length)) return { valid: false, reasonCode: 'bad_blanks' };
      if (t.some((v) => !Number.isInteger(v) || v < 0 || v > MAX_VALUE)) return { valid: false, reasonCode: 'out_of_range' };
      if (!blanksForced(r, [...new Set([...lengths, r.cycle.length])])) return { valid: false, reasonCode: 'ambiguous' };
    }
    if (level.fingerprint !== seqFingerprint(s)) return { valid: false, reasonCode: 'fingerprint_mismatch' };
    return { valid: true, solutionFingerprint: fingerprint(JSON.stringify(s.rounds.map((r) => r.blanks.map((b) => terms(r)[b])))) };
  },
  reduce(s, a) {
    if (s.done) return s;
    const r = currentRound(s);
    switch (a.type) {
      case 'digit': {
        if (!Number.isInteger(a.digit) || a.digit < 0 || a.digit > 9) return s;
        const cur = s.entries[s.active] ?? '';
        if (cur.length >= 3) return s;
        const entries = [...s.entries];
        entries[s.active] = cur === '0' ? String(a.digit) : cur + a.digit;
        return { ...s, entries, wrong: null };
      }
      case 'backspace': {
        const cur = s.entries[s.active] ?? '';
        if (!cur) return s;
        const entries = [...s.entries];
        entries[s.active] = cur.slice(0, -1);
        return { ...s, entries, wrong: null };
      }
      case 'select':
        return Number.isInteger(a.blank) && a.blank >= 0 && a.blank < r.blanks.length && a.blank !== s.active ? { ...s, active: a.blank } : s;
      case 'toggleSteps':
        return { ...s, showSteps: !s.showSteps };
      case 'check': {
        if (s.entries.some((e) => e === '')) return s;
        const t = terms(r);
        const wrong = r.blanks.map((b, i) => Number(s.entries[i]) !== t[b]);
        if (wrong.some(Boolean)) return { ...s, wrong, misses: s.misses + 1 };
        const next = s.round + 1;
        if (next >= s.rounds.length) return { ...s, wrong: null, done: true };
        return { ...s, round: next, entries: s.rounds[next]!.blanks.map(() => ''), active: 0, wrong: null };
      }
      default:
        return s;
    }
  },
  isComplete: (s) => s.done,
  score: (s, { hintsUsed }) => 100 + Math.max(0, 50 - s.misses * 10 - hintsUsed * 10),
  hint: hintFor,
};
