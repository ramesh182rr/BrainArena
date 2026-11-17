import { sequenceRecall } from '../module';
import { currentRound, expectedAnswer } from '../rules';
import type { RecallAction, RecallState } from '../types';

export const apply = (s: RecallState, actions: readonly RecallAction[]) => actions.reduce((x, a) => sequenceRecall.reduce(x, a), s);

/** Watch, then answer the current round correctly. */
export function playRoundCorrectly(s: RecallState): RecallAction[] {
  const round = currentRound(s)!;
  return [{ type: 'watch' }, { type: 'shown' }, ...expectedAnswer(s.sequence, round.channel).map((value) => ({ type: 'input', value }) as const)];
}
