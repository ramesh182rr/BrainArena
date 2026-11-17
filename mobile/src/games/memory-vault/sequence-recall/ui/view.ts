import { currentRound, PLACE_NAMES, usesSymbols } from '../rules';
import { SYMBOL_LABEL, type Item, type RecallState } from '../types';

export function itemLabel(state: Pick<RecallState, 'gridSize' | 'palette'>, item: Item): string {
  return `${SYMBOL_LABEL[state.palette[item.symbol]!]}, ${PLACE_NAMES[state.gridSize][item.place]}`;
}

/** Spoken/visible name for an answer value in the current channel. */
export function valueLabel(state: RecallState, value: number): string {
  const round = currentRound(state) ?? state.rounds[state.rounds.length - 1]!;
  return usesSymbols(round.channel) ? SYMBOL_LABEL[state.palette[value]!] : PLACE_NAMES[state.gridSize][value]!;
}

export function roundTitle(state: RecallState): string {
  const total = state.rounds.length;
  const index = Math.min(state.round, total - 1);
  return `Round ${index + 1} of ${total} · ${state.rounds[index]!.length} items`;
}
