import type { DifficultyBand } from '@/game-runtime/contracts';

/**
 * Sequence Recall (W5-G04): multi-channel sequence memory.
 *
 * Items light up one at a time, each a symbol at a place on a small grid.
 * The player then reproduces the sequence through a channel the round names:
 * the places, the symbols, or either in reverse. Copying the display is not
 * enough; the memory must be translated.
 */

export const SYMBOLS = ['star', 'moon', 'gem', 'bolt', 'ring', 'wave'] as const;
export type SymbolId = (typeof SYMBOLS)[number];

export type Channel = 'places' | 'symbols' | 'reversePlaces' | 'reverseSymbols';

export interface Item {
  /** Index into the grid, row-major. */
  place: number;
  /** Index into the level's symbol palette. */
  symbol: number;
}

export interface Round {
  length: number;
  channel: Channel;
}

export interface RoundResult {
  correct: boolean;
  expected: number[];
  given: number[];
}

export interface RecallState {
  band: DifficultyBand;
  /** Pads per side: 2 → 2×2, 3 → 3×3. */
  gridSize: 2 | 3;
  palette: readonly SymbolId[];
  rounds: readonly Round[];
  /** Milliseconds each item stays lit while showing. */
  showMs: number;
  /** Base seed; each round attempt derives its sequence from it. */
  seed: string;
  round: number;
  attempt: number;
  sequence: readonly Item[];
  phase: 'ready' | 'showing' | 'answer' | 'feedback';
  /** Inputs so far: place indices or palette indices, depending on the channel. */
  answer: readonly number[];
  misses: number;
  lastResult: RoundResult | null;
  done: boolean;
}

export type RecallAction =
  | { type: 'watch' }
  | { type: 'shown' }
  | { type: 'input'; value: number }
  | { type: 'undoInput' };

export const SYMBOL_LABEL: Record<SymbolId, string> = {
  star: 'Star',
  moon: 'Moon',
  gem: 'Gem',
  bolt: 'Bolt',
  ring: 'Ring',
  wave: 'Wave',
};

export const CHANNEL_INSTRUCTION: Record<Channel, string> = {
  places: 'Tap the PLACES in the order they lit up.',
  symbols: 'Tap the SYMBOLS in the order they appeared.',
  reversePlaces: 'Tap the PLACES in REVERSE order, last one first.',
  reverseSymbols: 'Tap the SYMBOLS in REVERSE order, last one first.',
};
