import type { DifficultyBand } from '@/game-runtime/contracts';

import { sequenceFor } from './rules';
import { SYMBOLS, type RecallState, type Round } from './types';

export interface RecallProfile {
  gridSize: 2 | 3;
  symbols: number;
  rounds: readonly Round[];
  showMs: number;
}

/** Longer sequences, more places and symbols, and harder channels per band. */
export const RECALL_PROFILES: Readonly<Record<DifficultyBand, RecallProfile>> = {
  intro: { gridSize: 2, symbols: 3, showMs: 1000, rounds: [{ length: 3, channel: 'places' }, { length: 3, channel: 'symbols' }, { length: 4, channel: 'places' }] },
  easy: { gridSize: 2, symbols: 4, showMs: 900, rounds: [{ length: 4, channel: 'symbols' }, { length: 4, channel: 'places' }, { length: 5, channel: 'symbols' }] },
  standard: { gridSize: 3, symbols: 4, showMs: 850, rounds: [{ length: 4, channel: 'places' }, { length: 5, channel: 'symbols' }, { length: 5, channel: 'reversePlaces' }] },
  advanced: { gridSize: 3, symbols: 5, showMs: 800, rounds: [{ length: 5, channel: 'symbols' }, { length: 5, channel: 'reversePlaces' }, { length: 6, channel: 'places' }] },
  expert: { gridSize: 3, symbols: 6, showMs: 750, rounds: [{ length: 6, channel: 'reversePlaces' }, { length: 6, channel: 'symbols' }, { length: 7, channel: 'reverseSymbols' }] },
};

export function buildRecallState(band: DifficultyBand, seed: string, profile: RecallProfile): RecallState {
  const base: RecallState = {
    band,
    gridSize: profile.gridSize,
    palette: SYMBOLS.slice(0, profile.symbols),
    rounds: profile.rounds,
    showMs: profile.showMs,
    seed,
    round: 0,
    attempt: 0,
    sequence: [],
    phase: 'ready',
    answer: [],
    misses: 0,
    lastResult: null,
    done: false,
  };
  return { ...base, sequence: sequenceFor(base, 0, 0) };
}
