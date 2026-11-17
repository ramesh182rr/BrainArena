import { createRng, levelSeedKey } from '@/game-runtime/rng';

import type { Channel, Item, RecallState } from './types';

export const SEQUENCE_KEY = 'W5-G04-sequence';

/**
 * The sequence for one round attempt. Deterministic in (seed, round, attempt),
 * so a restored session shows exactly the same items. Consecutive items never
 * share a place or a symbol, which keeps each step distinct to watch.
 */
export function sequenceFor(
  state: Pick<RecallState, 'seed' | 'gridSize' | 'palette' | 'rounds'>,
  round: number,
  attempt: number,
): Item[] {
  const spec = state.rounds[round];
  if (!spec) return [];
  const rng = createRng(levelSeedKey(SEQUENCE_KEY, '1', `${state.seed}/${round}/${attempt}`));
  const places = state.gridSize * state.gridSize;
  const items: Item[] = [];
  for (let i = 0; i < spec.length; i += 1) {
    const prev = items[i - 1];
    let place = rng.int(0, places - 1);
    while (prev && place === prev.place) place = rng.int(0, places - 1);
    let symbol = rng.int(0, state.palette.length - 1);
    while (prev && symbol === prev.symbol) symbol = rng.int(0, state.palette.length - 1);
    items.push({ place, symbol });
  }
  return items;
}

export const usesSymbols = (channel: Channel) => channel === 'symbols' || channel === 'reverseSymbols';
export const isReversed = (channel: Channel) => channel === 'reversePlaces' || channel === 'reverseSymbols';

/** The inputs a perfect answer would contain, in order. */
export function expectedAnswer(sequence: readonly Item[], channel: Channel): number[] {
  const values = sequence.map((it) => (usesSymbols(channel) ? it.symbol : it.place));
  return isReversed(channel) ? values.reverse() : values;
}

export function currentRound(state: RecallState) {
  return state.rounds[state.round];
}

export const PLACE_NAMES: Record<2 | 3, readonly string[]> = {
  2: ['top left', 'top right', 'bottom left', 'bottom right'],
  3: ['top left', 'top middle', 'top right', 'middle left', 'centre', 'middle right', 'bottom left', 'bottom middle', 'bottom right'],
};
