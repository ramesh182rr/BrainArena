import type { DifficultyBand, GameHint, GameModule, HintTier, PuzzleLevel, ValidationResult } from '@/game-runtime/contracts';
import { createRng, fingerprint, levelSeedKey, type Rng } from '@/game-runtime/rng';

/**
 * Impossible Answer (W1-G02): constraint reframing.
 *
 * A goal seems impossible: "Leave exactly 4 sparks" when you hold 9 and the
 * only move removes 2. Every rule card has two readings, a literal one and a
 * reframed one ("remove 2" / "remove 2 *from each pile*"). Flip cards to change
 * how the rules are read, then make the moves. Exactly one set of card readings
 * makes the goal reachable within the move limit.
 */

/** One rule: reading A (literal) and reading B (reframed). */
export type Rule = { k: 'take'; n: number } | { k: 'takeEach'; n: number } | { k: 'split' } | { k: 'merge' } | { k: 'double' } | { k: 'add'; n: number };

export interface RuleCard {
  a: Rule;
  b: Rule;
}

export type Goal = { k: 'exact'; total: number } | { k: 'piles'; count: number } | { k: 'equal' };

export interface ReframeState {
  band: DifficultyBand;
  piles0: readonly number[];
  cards: readonly RuleCard[];
  goal: Goal;
  maxMoves: number;
  flipped: boolean[];
  piles: number[];
  moves: { card: number; pile: number }[];
  locked: boolean;
  flips: number;
  solved: boolean;
}

export type ReframeAction = { type: 'flip'; card: number } | { type: 'use'; card: number; pile: number } | { type: 'reset' };

export const IMPOSSIBLE_ANSWER_ID = 'W1-G02';
export const IMPOSSIBLE_ANSWER_VERSION = '1.0.0';

export function ruleText(r: Rule): string {
  switch (r.k) {
    case 'take':
      return `Remove ${r.n} sparks from one pile.`;
    case 'takeEach':
      return `Remove ${r.n} from every pile.`;
    case 'split':
      return 'Split one pile into two halves.';
    case 'merge':
      return 'Merge one pile into the next one.';
    case 'double':
      return 'Double one pile.';
    case 'add':
      return `Add ${r.n} sparks to one pile.`;
  }
}

export function goalText(g: Goal): string {
  if (g.k === 'exact') return `Leave exactly ${g.total} spark${g.total === 1 ? '' : 's'} in total.`;
  if (g.k === 'piles') return `End with exactly ${g.count} piles.`;
  return 'Make every pile the same size (at least two piles).';
}

/** Applies a rule to a pile; null when it is not allowed (negative counts, odd split, nothing to merge). */
export function applyRule(r: Rule, piles: readonly number[], i: number): number[] | null {
  if (i < 0 || i >= piles.length) return null;
  const p = [...piles];
  switch (r.k) {
    case 'take':
      if (p[i]! < r.n) return null;
      p[i]! -= r.n;
      break;
    case 'takeEach':
      if (p.some((x) => x < r.n)) return null;
      return p.map((x) => x - r.n);
    case 'split':
      if (p[i]! < 2 || p[i]! % 2) return null;
      p.splice(i, 1, p[i]! / 2, p[i]! / 2);
      return p;
    case 'merge':
      if (i + 1 >= p.length) return null;
      p.splice(i, 2, p[i]! + p[i + 1]!);
      return p;
    case 'double':
      if (p[i]! === 0) return null;
      p[i]! *= 2;
      break;
    case 'add':
      p[i]! += r.n;
      break;
  }
  return p;
}

export function goalMet(g: Goal, piles: readonly number[]): boolean {
  if (g.k === 'exact') return piles.reduce((a, b) => a + b, 0) === g.total;
  if (g.k === 'piles') return piles.length === g.count;
  return piles.length >= 2 && piles.every((x) => x === piles[0]);
}

const ruleOf = (c: RuleCard, flipped: boolean) => (flipped ? c.b : c.a);

/** Whether the goal is reachable within `moves` moves using the given readings (BFS). */
export function reachable(piles0: readonly number[], rules: readonly Rule[], goal: Goal, moves: number): { card: number; pile: number }[] | null {
  if (goalMet(goal, piles0)) return [];
  const key = (p: readonly number[]) => p.join(',');
  const prev = new Map<string, { from: string; card: number; pile: number } | null>([[key(piles0), null]]);
  let frontier: number[][] = [[...piles0]];
  for (let d = 0; d < moves; d += 1) {
    const next: number[][] = [];
    for (const p of frontier) {
      for (let c = 0; c < rules.length; c += 1)
        for (let i = 0; i < p.length; i += 1) {
          const q = applyRule(rules[c]!, p, i);
          if (!q || q.length > 6 || q.some((x) => x > 40)) continue;
          const k = key(q);
          if (prev.has(k)) continue;
          prev.set(k, { from: key(p), card: c, pile: i });
          if (goalMet(goal, q)) {
            const path: { card: number; pile: number }[] = [];
            let cur: string | undefined = k;
            while (cur) {
              const e = prev.get(cur);
              if (!e) break;
              path.unshift({ card: e.card, pile: e.pile });
              cur = e.from;
            }
            return path;
          }
          next.push(q);
        }
    }
    frontier = next;
  }
  return null;
}

/** All card readings (as flip masks) that make the goal reachable. */
export function workingReadings(s: Pick<ReframeState, 'piles0' | 'cards' | 'goal' | 'maxMoves'>): number[] {
  const out: number[] = [];
  for (let mask = 0; mask < 1 << s.cards.length; mask += 1) {
    const rules = s.cards.map((c, i) => ruleOf(c, (mask & (1 << i)) !== 0));
    if (reachable(s.piles0, rules, s.goal, s.maxMoves)) out.push(mask);
  }
  return out;
}

interface Profile {
  cards: number;
  piles: [number, number];
  maxMoves: number;
  goals: readonly Goal['k'][];
}

export const REFRAME_PROFILES: Readonly<Record<DifficultyBand, Profile>> = {
  intro: { cards: 1, piles: [1, 1], maxMoves: 2, goals: ['exact'] },
  easy: { cards: 2, piles: [1, 2], maxMoves: 3, goals: ['exact', 'piles'] },
  standard: { cards: 2, piles: [2, 2], maxMoves: 3, goals: ['exact', 'piles', 'equal'] },
  advanced: { cards: 3, piles: [2, 3], maxMoves: 3, goals: ['exact', 'piles', 'equal'] },
  expert: { cards: 3, piles: [3, 3], maxMoves: 4, goals: ['exact', 'piles', 'equal'] },
};

const PAIRS: ((rng: Rng) => RuleCard)[] = [
  (rng) => {
    const n = rng.int(1, 3);
    return { a: { k: 'take', n }, b: { k: 'takeEach', n } };
  },
  () => ({ a: { k: 'merge' }, b: { k: 'split' } }),
  (rng) => ({ a: { k: 'add', n: rng.int(1, 3) }, b: { k: 'double' } }),
  (rng) => {
    const n = rng.int(1, 3);
    return { a: { k: 'add', n }, b: { k: 'take', n } };
  },
  () => ({ a: { k: 'double' }, b: { k: 'split' } }),
];

function tryBuild(rng: Rng, band: DifficultyBand, p: Profile): ReframeState | null {
  const cards = Array.from({ length: p.cards }, () => rng.pick(PAIRS)(rng));
  const pileCount = rng.int(p.piles[0], p.piles[1]);
  const piles0 = Array.from({ length: pileCount }, () => rng.int(2, 9));
  const kind = rng.pick(p.goals);
  const total = piles0.reduce((a, b) => a + b, 0);
  const goal: Goal = kind === 'exact' ? { k: 'exact', total: rng.int(0, total + 4) } : kind === 'piles' ? { k: 'piles', count: rng.int(1, pileCount + 2) } : { k: 'equal' };
  const base = { piles0, cards, goal, maxMoves: p.maxMoves };
  if (goalMet(goal, piles0)) return null;
  const working = workingReadings(base);
  // The literal reading (no flips) must fail, and exactly one reading must work.
  if (working.length !== 1 || working[0] === 0) return null;
  return { band, piles0, cards, goal, maxMoves: p.maxMoves, flipped: cards.map(() => false), piles: [...piles0], moves: [], locked: false, flips: 0, solved: false };
}

export function generateReframe(key: string, band: DifficultyBand, p: Profile = REFRAME_PROFILES[band]): ReframeState {
  const rng = createRng(key);
  for (let i = 0; i < 6000; i += 1) {
    const s = tryBuild(rng, band, p);
    if (s) return s;
  }
  throw new Error('No acceptable puzzle within the attempt budget');
}

export const REFRAME_TUTORIALS = [
  { id: 'tutorial-1', difficulty: 'intro' as const, intro: 'Read literally, the rule card cannot reach the goal. Flip it to read it another way, then use it.', profile: REFRAME_PROFILES.intro },
  { id: 'tutorial-2', difficulty: 'easy' as const, intro: 'Two cards: only one needs a new reading. Flipping back is free until you make a move.', profile: REFRAME_PROFILES.easy },
  { id: 'tutorial-3', difficulty: 'advanced' as const, intro: 'Three cards and a strange goal. Which readings make it possible at all?', profile: REFRAME_PROFILES.advanced },
];

export const reframeFingerprint = (s: ReframeState) => fingerprint(JSON.stringify([s.piles0, s.cards, s.goal, s.maxMoves]));
export const cardId = (i: number) => `card-${i}`;
export const pileId = (i: number) => `pile-${i}`;
export const currentRules = (s: ReframeState) => s.cards.map((c, i) => ruleOf(c, s.flipped[i]!));

function toLevel(s: ReframeState, seed: string, difficulty: DifficultyBand, source: PuzzleLevel['source'], levelId: string): PuzzleLevel<ReframeState> {
  return { gameId: IMPOSSIBLE_ANSWER_ID, levelId, generatorVersion: IMPOSSIBLE_ANSWER_VERSION, seed, difficulty, source, fingerprint: reframeFingerprint(s), initialState: s, metadata: { cards: s.cards.length, goal: s.goal.k } };
}

export const impossibleAnswer: GameModule<ReframeState, ReframeAction> = {
  id: IMPOSSIBLE_ANSWER_ID,
  version: IMPOSSIBLE_ANSWER_VERSION,
  createLevel(seed, difficulty) {
    const t = REFRAME_TUTORIALS.find((x) => x.id === seed);
    if (t) return toLevel(generateReframe(levelSeedKey(IMPOSSIBLE_ANSWER_ID, IMPOSSIBLE_ANSWER_VERSION, seed), t.difficulty, t.profile), seed, t.difficulty, 'authored', `${IMPOSSIBLE_ANSWER_ID}:${seed}`);
    return toLevel(generateReframe(levelSeedKey(IMPOSSIBLE_ANSWER_ID, IMPOSSIBLE_ANSWER_VERSION, `${seed}/${difficulty}`), difficulty), seed, difficulty, 'generated', `${IMPOSSIBLE_ANSWER_ID}:${difficulty}:${seed}`);
  },
  fallbackLevel(difficulty) {
    return toLevel(generateReframe(levelSeedKey(IMPOSSIBLE_ANSWER_ID, IMPOSSIBLE_ANSWER_VERSION, `curated/${difficulty}`), difficulty), 'curated', difficulty, 'fallback', `${IMPOSSIBLE_ANSWER_ID}:fallback-${difficulty}`);
  },
  validateLevel(level): ValidationResult {
    if (level.gameId !== IMPOSSIBLE_ANSWER_ID) return { valid: false, reasonCode: 'wrong_game' };
    const s = level.initialState;
    if (!s.cards.length || s.cards.length > 4 || !s.piles0.length || s.maxMoves < 1 || s.maxMoves > 6) return { valid: false, reasonCode: 'bad_puzzle' };
    if (s.flipped.some(Boolean) || s.moves.length || s.locked || s.flips || s.solved || JSON.stringify(s.piles) !== JSON.stringify(s.piles0)) return { valid: false, reasonCode: 'bad_start' };
    const working = workingReadings(s);
    if (working.length !== 1 || working[0] === 0) return { valid: false, reasonCode: working.length ? 'literal_works_or_ambiguous' : 'unsolvable' };
    if (level.fingerprint !== reframeFingerprint(s)) return { valid: false, reasonCode: 'fingerprint_mismatch' };
    return { valid: true, solutionFingerprint: fingerprint(String(working[0])) };
  },
  reduce(s, a) {
    if (s.solved) return s;
    switch (a.type) {
      case 'flip': {
        // Readings are settled once moves begin; Reset unlocks them again.
        if (s.locked || !s.cards[a.card]) return s;
        const flipped = [...s.flipped];
        flipped[a.card] = !flipped[a.card];
        return { ...s, flipped, flips: s.flips + 1 };
      }
      case 'use': {
        if (!s.cards[a.card] || s.moves.length >= s.maxMoves) return s;
        const piles = applyRule(currentRules(s)[a.card]!, s.piles, a.pile);
        if (!piles) return s;
        const moves = [...s.moves, { card: a.card, pile: a.pile }];
        return { ...s, piles, moves, locked: true, solved: goalMet(s.goal, piles) };
      }
      case 'reset':
        return s.moves.length || s.locked ? { ...s, piles: [...s.piles0], moves: [], locked: false } : s;
      default:
        return s;
    }
  },
  isComplete: (s) => s.solved,
  score: (s, { hintsUsed }) => 100 + Math.max(0, 50 - Math.max(0, s.flips - s.cards.length) * 4 - hintsUsed * 10),
  hint(s, tier: HintTier): GameHint {
    const mask = workingReadings(s)[0]!;
    const want = s.cards.map((_, i) => (mask & (1 << i)) !== 0);
    const wrong = want.flatMap((w, i) => (w !== s.flipped[i] ? [i] : []));
    if (tier === 1) return { tier, text: wrong.length ? `${wrong.length} card${wrong.length === 1 ? '' : 's'} need a different reading.` : 'Your readings are right. Now find the moves.', highlightIds: [] };
    if (wrong.length) return { tier, text: 'Flip the highlighted card.', highlightIds: [cardId(wrong[0]!)] };
    const plan = reachable(s.piles0, s.cards.map((c, i) => ruleOf(c, want[i]!)), s.goal, s.maxMoves)!;
    const m = plan[0]!;
    return { tier, text: `${s.moves.length ? 'Reset, then use' : 'Use'} the highlighted card on pile ${m.pile + 1}.`, highlightIds: [cardId(m.card), pileId(m.pile)] };
  },
};
