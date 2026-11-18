import type { DifficultyBand, GameHint, GameModule, HintTier, PuzzleLevel, ValidationResult } from '@/game-runtime/contracts';
import { createRng, fingerprint, levelSeedKey, type Rng } from '@/game-runtime/rng';

/**
 * Number Lock (W2-G05): code inference by closeness.
 *
 * A lock hides a code of digits. Each try reports, for every tumbler, whether
 * its digit is exact, one away (±1) or further off. From the advanced band the
 * lock only says how many tumblers are exact / near / far, not which. Expert
 * locks add one opening clue: the sum of the code. Guesses are unlimited; the
 * score rewards cracking it close to the lock's own par.
 */

export type Signal = 'exact' | 'near' | 'far';
export interface Attempt {
  code: number[];
  signals: Signal[];
}

export interface LockState {
  band: DifficultyBand;
  length: number;
  maxDigit: number;
  /** Per-tumbler signals (true) or only counts (false). */
  positional: boolean;
  /** Opening clue: the digits add up to this (expert), else null. */
  sumClue: number | null;
  secret: number[];
  par: number;
  entry: (number | null)[];
  cursor: number;
  attempts: Attempt[];
  solved: boolean;
}

export type LockAction = { type: 'digit'; value: number } | { type: 'select'; index: number } | { type: 'clear' } | { type: 'submit' };

export const NUMBER_LOCK_ID = 'W2-G05';
export const NUMBER_LOCK_VERSION = '1.0.0';

export function signalsFor(secret: readonly number[], code: readonly number[]): Signal[] {
  return code.map((d, i) => (d === secret[i] ? 'exact' : Math.abs(d - secret[i]!) === 1 ? 'near' : 'far'));
}

/** Count form used when the lock is not positional, as "exact,near,far". */
export const countKey = (s: readonly Signal[]) => {
  let e = 0;
  let n = 0;
  for (const x of s) if (x === 'exact') e += 1;
  else if (x === 'near') n += 1;
  return `${e},${n}`;
};
const feedbackKey = (s: readonly Signal[], positional: boolean) => (positional ? s.join(',') : countKey(s));

export function allCodes(length: number, maxDigit: number, sum: number | null): number[][] {
  const out: number[][] = [];
  const cur: number[] = [];
  const go = (i: number, acc: number) => {
    if (i === length) {
      if (sum === null || acc === sum) out.push([...cur]);
      return;
    }
    for (let d = 1; d <= maxDigit; d += 1) {
      cur.push(d);
      go(i + 1, acc + d);
      cur.pop();
    }
  };
  go(0, 0);
  return out;
}

/** Codes still consistent with every attempt (and the sum clue). */
export function remainingCodes(s: Pick<LockState, 'length' | 'maxDigit' | 'sumClue' | 'positional' | 'attempts'>): number[][] {
  return allCodes(s.length, s.maxDigit, s.sumClue).filter((c) => s.attempts.every((a) => feedbackKey(signalsFor(c, a.code), s.positional) === feedbackKey(a.signals, s.positional)));
}

/** Best splitting guess among a sample: minimises the largest group of remaining codes. */
export function bestGuess(candidates: readonly number[][], positional: boolean, pool: readonly number[][]): number[] {
  let best = candidates[0]!;
  let bestWorst = Infinity;
  for (const g of pool) {
    const groups = new Map<string, number>();
    for (const c of candidates) {
      const k = feedbackKey(signalsFor(c, g), positional);
      groups.set(k, (groups.get(k) ?? 0) + 1);
    }
    let worst = 0;
    for (const v of groups.values()) worst = Math.max(worst, v);
    // Prefer guesses that could be the code when equally good.
    const isCand = candidates.some((c) => c.join() === g.join());
    const score = worst - (isCand ? 0.5 : 0);
    if (score < bestWorst) {
      bestWorst = score;
      best = g;
    }
  }
  return best;
}

/** Tries a careful player needs: greedy splitting against this secret (deterministic sample). */
export function parFor(s: Pick<LockState, 'length' | 'maxDigit' | 'sumClue' | 'positional' | 'secret'>, rng: Rng): number {
  const all = allCodes(s.length, s.maxDigit, s.sumClue);
  let candidates = all;
  const attempts: Attempt[] = [];
  for (let n = 1; n <= 20; n += 1) {
    const pool = candidates.length <= 60 ? candidates : [...rng.shuffle(all).slice(0, 80), ...rng.shuffle(candidates).slice(0, 40)];
    const g = candidates.length === 1 ? candidates[0]! : bestGuess(candidates, s.positional, pool);
    const sig = signalsFor(s.secret, g);
    if (sig.every((x) => x === 'exact')) return n;
    attempts.push({ code: g, signals: sig });
    candidates = candidates.filter((c) => feedbackKey(signalsFor(c, g), s.positional) === feedbackKey(sig, s.positional));
  }
  return 20;
}

interface Profile {
  length: number;
  maxDigit: number;
  positional: boolean;
  sum: boolean;
  par: [number, number];
}

export const LOCK_PROFILES: Readonly<Record<DifficultyBand, Profile>> = {
  intro: { length: 3, maxDigit: 5, positional: true, sum: false, par: [2, 4] },
  easy: { length: 3, maxDigit: 6, positional: true, sum: false, par: [3, 4] },
  standard: { length: 4, maxDigit: 6, positional: true, sum: false, par: [3, 5] },
  advanced: { length: 4, maxDigit: 6, positional: false, sum: false, par: [4, 7] },
  expert: { length: 5, maxDigit: 6, positional: false, sum: true, par: [4, 8] },
};

export function buildLock(band: DifficultyBand, p: Profile, secret: number[], par: number): LockState {
  return {
    band,
    length: p.length,
    maxDigit: p.maxDigit,
    positional: p.positional,
    sumClue: p.sum ? secret.reduce((a, b) => a + b, 0) : null,
    secret,
    par,
    entry: secret.map(() => null),
    cursor: 0,
    attempts: [],
    solved: false,
  };
}

export function generateLock(key: string, band: DifficultyBand, p: Profile = LOCK_PROFILES[band]): LockState {
  const rng = createRng(key);
  for (let i = 0; i < 200; i += 1) {
    const secret = Array.from({ length: p.length }, () => rng.int(1, p.maxDigit));
    // Avoid giveaway codes like 1-1-1.
    if (new Set(secret).size === 1) continue;
    const sum = p.sum ? secret.reduce((a, b) => a + b, 0) : null;
    if (sum !== null && allCodes(p.length, p.maxDigit, sum).length < 40) continue;
    const par = parFor({ ...p, sumClue: sum, secret }, rng);
    if (par < p.par[0] || par > p.par[1]) continue;
    return buildLock(band, p, secret, par);
  }
  throw new Error('No acceptable lock within the attempt budget');
}

export const LOCK_TUTORIALS = [
  { id: 'tutorial-1', difficulty: 'intro' as const, intro: 'Enter a code and press Try. Each tumbler lights up: ● exact, ◐ one away, ○ further off.', profile: { ...LOCK_PROFILES.intro, par: [2, 4] as [number, number] } },
  { id: 'tutorial-2', difficulty: 'standard' as const, intro: 'Four tumblers now. Use ◐ to close in: the right digit is one above or one below.', profile: LOCK_PROFILES.standard },
  { id: 'tutorial-3', difficulty: 'advanced' as const, intro: 'This lock only tells you how many tumblers are exact or near, not which ones. Change one digit at a time to find out.', profile: LOCK_PROFILES.advanced },
];

export const lockFingerprint = (s: LockState) => fingerprint(JSON.stringify([s.length, s.maxDigit, s.positional, s.sumClue, s.secret]));
export const tumblerId = (i: number) => `tumbler-${i}`;
export const keyId = (d: number) => `key-${d}`;

function toLevel(s: LockState, seed: string, difficulty: DifficultyBand, source: PuzzleLevel['source'], levelId: string): PuzzleLevel<LockState> {
  return { gameId: NUMBER_LOCK_ID, levelId, generatorVersion: NUMBER_LOCK_VERSION, seed, difficulty, source, fingerprint: lockFingerprint(s), initialState: s, metadata: { length: s.length, par: s.par } };
}

export const numberLock: GameModule<LockState, LockAction> = {
  id: NUMBER_LOCK_ID,
  version: NUMBER_LOCK_VERSION,
  createLevel(seed, difficulty) {
    const t = LOCK_TUTORIALS.find((x) => x.id === seed);
    if (t) return toLevel(generateLock(levelSeedKey(NUMBER_LOCK_ID, NUMBER_LOCK_VERSION, seed), t.difficulty, t.profile), seed, t.difficulty, 'authored', `${NUMBER_LOCK_ID}:${seed}`);
    return toLevel(generateLock(levelSeedKey(NUMBER_LOCK_ID, NUMBER_LOCK_VERSION, `${seed}/${difficulty}`), difficulty), seed, difficulty, 'generated', `${NUMBER_LOCK_ID}:${difficulty}:${seed}`);
  },
  fallbackLevel(difficulty) {
    return toLevel(generateLock(levelSeedKey(NUMBER_LOCK_ID, NUMBER_LOCK_VERSION, `curated/${difficulty}`), difficulty), 'curated', difficulty, 'fallback', `${NUMBER_LOCK_ID}:fallback-${difficulty}`);
  },
  validateLevel(level): ValidationResult {
    if (level.gameId !== NUMBER_LOCK_ID) return { valid: false, reasonCode: 'wrong_game' };
    const s = level.initialState;
    if (s.length < 3 || s.length > 6 || s.maxDigit < 4 || s.maxDigit > 9 || s.secret.length !== s.length || s.secret.some((d) => !Number.isInteger(d) || d < 1 || d > s.maxDigit)) return { valid: false, reasonCode: 'bad_code' };
    if (s.sumClue !== null && s.sumClue !== s.secret.reduce((a, b) => a + b, 0)) return { valid: false, reasonCode: 'bad_clue' };
    if (s.attempts.length || s.solved || s.entry.length !== s.length || s.entry.some((e) => e !== null)) return { valid: false, reasonCode: 'bad_start' };
    if (s.par < 1 || s.par > 12) return { valid: false, reasonCode: 'bad_par' };
    if (level.fingerprint !== lockFingerprint(s)) return { valid: false, reasonCode: 'fingerprint_mismatch' };
    return { valid: true, solutionFingerprint: fingerprint(s.secret.join('')) };
  },
  reduce(s, a) {
    if (s.solved) return s;
    switch (a.type) {
      case 'digit': {
        if (!Number.isInteger(a.value) || a.value < 1 || a.value > s.maxDigit) return s;
        const entry = [...s.entry];
        entry[s.cursor] = a.value;
        const nextEmpty = entry.findIndex((e, i) => i > s.cursor && e === null);
        return { ...s, entry, cursor: nextEmpty >= 0 ? nextEmpty : Math.min(s.cursor + 1, s.length - 1) };
      }
      case 'select':
        return Number.isInteger(a.index) && a.index >= 0 && a.index < s.length && a.index !== s.cursor ? { ...s, cursor: a.index } : s;
      case 'clear':
        return s.entry.some((e) => e !== null) ? { ...s, entry: s.entry.map(() => null), cursor: 0 } : s;
      case 'submit': {
        if (s.entry.some((e) => e === null)) return s;
        const code = s.entry as number[];
        const signals = signalsFor(s.secret, code);
        const solved = signals.every((x) => x === 'exact');
        // Keep the entry so the next try only needs the changed digits.
        return { ...s, attempts: [...s.attempts, { code: [...code], signals }], solved, cursor: 0 };
      }
      default:
        return s;
    }
  },
  isComplete: (s) => s.solved,
  score: (s, { hintsUsed }) => 100 + Math.max(0, 50 - Math.max(0, s.attempts.length - s.par - 1) * 8 - hintsUsed * 10),
  hint(s, tier: HintTier): GameHint {
    const left = remainingCodes(s);
    if (tier === 1) {
      return { tier, text: s.attempts.length ? `${left.length} code${left.length === 1 ? '' : 's'} still fit everything the lock has told you.` : 'Start with a spread of digits: low, middle and high.', highlightIds: [] };
    }
    if (tier === 2) {
      // Reveal one tumbler the player has not pinned down yet.
      const known = s.positional ? s.secret.map((d, i) => s.attempts.some((a) => a.signals[i] === 'exact')) : s.secret.map(() => false);
      const i = known.findIndex((k) => !k);
      const at = i >= 0 ? i : 0;
      return { tier, text: `Tumbler ${at + 1} is ${s.secret[at]}.`, highlightIds: [tumblerId(at)] };
    }
    const g = bestGuess(left, s.positional, left.length <= 80 ? left : left.slice(0, 80));
    return { tier, text: `Try ${g.join(' ')}: it splits the remaining codes well.`, highlightIds: [] };
  },
};
