import type { DifficultyBand, GameHint, GameModule, HintTier, PuzzleLevel, ValidationResult } from '@/game-runtime/contracts';
import { fingerprint } from '@/game-runtime/rng';

import { buildRecallState, RECALL_PROFILES, type RecallProfile } from './generator';
import { currentRound, expectedAnswer, sequenceFor, usesSymbols } from './rules';
import { SYMBOLS, type RecallAction, type RecallState, type Round } from './types';

export const SEQUENCE_RECALL_ID = 'W5-G04';
/** Bump when the same seed would produce different sequences or rules change. */
export const SEQUENCE_RECALL_VERSION = '1.0.0';

const BASE_SCORE = 100;

export const placeId = (index: number) => `place-${index}`;
export const symbolId = (index: number) => `symbol-${index}`;

export interface AuthoredRecall {
  id: string;
  difficulty: DifficultyBand;
  intro: string;
  profile: RecallProfile;
}

/** Tutorials: one channel idea each, short and slow. */
export const RECALL_TUTORIALS: readonly AuthoredRecall[] = [
  {
    id: 'tutorial-1',
    difficulty: 'intro',
    intro: 'Watch the pads light up, then tap the same places in the same order.',
    profile: { gridSize: 2, symbols: 3, showMs: 1100, rounds: [{ length: 3, channel: 'places' }] },
  },
  {
    id: 'tutorial-2',
    difficulty: 'easy',
    intro: 'Now switch channels: remember WHICH symbols appeared, and tap them in order on the symbol keys.',
    profile: { gridSize: 2, symbols: 3, showMs: 1100, rounds: [{ length: 3, channel: 'symbols' }] },
  },
  {
    id: 'tutorial-3',
    difficulty: 'standard',
    intro: 'Reverse rounds: tap the places starting from the LAST one that lit up.',
    profile: { gridSize: 3, symbols: 4, showMs: 1000, rounds: [{ length: 4, channel: 'reversePlaces' }] },
  },
];

/** Curated fallbacks reuse the band profile with a fixed, reviewed seed. */
export const RECALL_FALLBACK_SEED = 'curated';

export function recallFingerprint(state: Pick<RecallState, 'gridSize' | 'palette' | 'rounds' | 'seed'>): string {
  return fingerprint(JSON.stringify([state.gridSize, state.palette, state.rounds, state.seed]));
}

function toLevel(state: RecallState, seed: string, difficulty: DifficultyBand, source: PuzzleLevel['source'], levelId: string): PuzzleLevel<RecallState> {
  return {
    gameId: SEQUENCE_RECALL_ID,
    levelId,
    generatorVersion: SEQUENCE_RECALL_VERSION,
    seed,
    difficulty,
    source,
    fingerprint: recallFingerprint(state),
    initialState: state,
    metadata: { rounds: state.rounds.length, longest: Math.max(...state.rounds.map((r) => r.length)), grid: state.gridSize },
  };
}

function hintFor(state: RecallState, tier: HintTier): GameHint {
  const round = currentRound(state);
  if (state.phase !== 'answer' || !round) {
    return { tier, text: 'Watch closely: say each item to yourself as it lights up.', highlightIds: [] };
  }
  const expected = expectedAnswer(state.sequence, round.channel);
  const id = usesSymbols(round.channel) ? symbolId : placeId;
  if (tier === 1) return { tier, text: 'The highlighted key is where your answer starts.', highlightIds: [id(expected[0]!)] };
  const from = state.answer.length;
  const next = expected.slice(from, from + (tier === 2 ? 1 : 2));
  if (next.length === 0) return { tier, text: 'Your answer is complete.', highlightIds: [] };
  return { tier, text: tier === 2 ? 'Tap the highlighted key next.' : 'Tap the highlighted keys next, in order.', highlightIds: next.map(id) };
}

const CHANNELS = new Set(['places', 'symbols', 'reversePlaces', 'reverseSymbols']);
const validRound = (r: Round) => Number.isInteger(r.length) && r.length >= 2 && r.length <= 10 && CHANNELS.has(r.channel);

export const sequenceRecall: GameModule<RecallState, RecallAction> = {
  id: SEQUENCE_RECALL_ID,
  version: SEQUENCE_RECALL_VERSION,

  createLevel(seed, difficulty) {
    const tutorial = RECALL_TUTORIALS.find((t) => t.id === seed);
    if (tutorial) return toLevel(buildRecallState(tutorial.difficulty, seed, tutorial.profile), seed, tutorial.difficulty, 'authored', `${SEQUENCE_RECALL_ID}:${seed}`);
    return toLevel(buildRecallState(difficulty, seed, RECALL_PROFILES[difficulty]), seed, difficulty, 'generated', `${SEQUENCE_RECALL_ID}:${difficulty}:${seed}`);
  },

  fallbackLevel(difficulty) {
    return toLevel(buildRecallState(difficulty, RECALL_FALLBACK_SEED, RECALL_PROFILES[difficulty]), RECALL_FALLBACK_SEED, difficulty, 'fallback', `${SEQUENCE_RECALL_ID}:fallback-${difficulty}`);
  },

  validateLevel(level): ValidationResult {
    if (level.gameId !== SEQUENCE_RECALL_ID) return { valid: false, reasonCode: 'wrong_game' };
    const s = level.initialState;
    if (s.gridSize !== 2 && s.gridSize !== 3) return { valid: false, reasonCode: 'bad_grid' };
    if (s.palette.length < 2 || s.palette.some((p) => !SYMBOLS.includes(p)) || new Set(s.palette).size !== s.palette.length) {
      return { valid: false, reasonCode: 'bad_palette' };
    }
    if (s.rounds.length === 0 || !s.rounds.every(validRound)) return { valid: false, reasonCode: 'bad_rounds' };
    if (!Number.isInteger(s.showMs) || s.showMs < 400 || s.showMs > 3000) return { valid: false, reasonCode: 'bad_timing' };
    if (s.round !== 0 || s.attempt !== 0 || s.phase !== 'ready' || s.answer.length || s.misses || s.done) return { valid: false, reasonCode: 'bad_start' };
    const first = sequenceFor(s, 0, 0);
    if (JSON.stringify(first) !== JSON.stringify(s.sequence)) return { valid: false, reasonCode: 'sequence_mismatch' };
    for (let r = 0; r < s.rounds.length; r += 1) {
      const seq = sequenceFor(s, r, 0);
      if (seq.length !== s.rounds[r]!.length || seq.some((it, i) => i > 0 && (it.place === seq[i - 1]!.place || it.symbol === seq[i - 1]!.symbol))) {
        return { valid: false, reasonCode: 'bad_sequence' };
      }
    }
    if (level.fingerprint !== recallFingerprint(s)) return { valid: false, reasonCode: 'fingerprint_mismatch' };
    return { valid: true, solutionFingerprint: fingerprint(JSON.stringify(first)) };
  },

  reduce(state, action) {
    if (state.done) return state;
    const round = currentRound(state);
    switch (action.type) {
      case 'watch':
        // Also restarts a show that was interrupted (paused or restored mid-show).
        return state.phase === 'ready' || state.phase === 'feedback' || state.phase === 'showing'
          ? { ...state, phase: 'showing', answer: [] }
          : state;
      case 'shown':
        return state.phase === 'showing' ? { ...state, phase: 'answer' } : state;
      case 'input': {
        if (state.phase !== 'answer' || !round || !Number.isInteger(action.value)) return state;
        const limit = usesSymbols(round.channel) ? state.palette.length : state.gridSize * state.gridSize;
        if (action.value < 0 || action.value >= limit) return state;
        const answer = [...state.answer, action.value];
        if (answer.length < round.length) return { ...state, answer };
        const expected = expectedAnswer(state.sequence, round.channel);
        const correct = expected.every((v, i) => v === answer[i]);
        const result = { correct, expected, given: answer };
        if (!correct) {
          const attempt = state.attempt + 1;
          return { ...state, answer, phase: 'feedback', misses: state.misses + 1, attempt, sequence: sequenceFor(state, state.round, attempt), lastResult: result };
        }
        const next = state.round + 1;
        if (next >= state.rounds.length) return { ...state, answer, phase: 'feedback', lastResult: result, done: true };
        return { ...state, answer, phase: 'feedback', round: next, attempt: 0, sequence: sequenceFor(state, next, 0), lastResult: result };
      }
      case 'undoInput':
        return state.phase === 'answer' && state.answer.length > 0 ? { ...state, answer: state.answer.slice(0, -1) } : state;
      default:
        return state;
    }
  },

  isComplete: (state) => state.done,

  /** Completing every round earns the base score; missed rounds and hints reduce only the bonus. */
  score(state, { hintsUsed }) {
    return BASE_SCORE + Math.max(0, 50 - state.misses * 15 - hintsUsed * 10);
  },

  hint: hintFor,
};
