import type { GameUi } from '@/games/ui';

import { RECALL_TUTORIALS } from '../module';
import type { RecallAction, RecallState } from '../types';
import { SequenceRecallBoard } from './SequenceRecallBoard';

export const sequenceRecallUi: GameUi<RecallState, RecallAction> = {
  gameId: 'W5-G04',
  howToPlay: [
    'Press Watch. Symbols light up on the pads one at a time.',
    'Each round then asks for the sequence through a different channel: the places, or the symbols.',
    'Some rounds want it in reverse, last item first.',
    'There is no timer for answering. Use Remove last to fix a tap.',
    'A missed round shows what went wrong and gives you a fresh sequence.',
  ],
  tutorials: RECALL_TUTORIALS.map((t) => ({ seed: t.id, difficulty: t.difficulty, intro: t.intro })),
  Board: SequenceRecallBoard,
  statusLine: (state) => `Round ${Math.min(state.round + 1, state.rounds.length)}/${state.rounds.length} · Misses ${state.misses}`,
  levelNote: () => null,
  successMessage: (state) => (state.rounds.length === 1 ? 'Sequence recalled.' : `All ${state.rounds.length} rounds recalled.`),
  scoreExplanation: (state, { hintsUsed }) => {
    const parts = ['100 for recalling every round.'];
    parts.push(state.misses === 0 ? 'No missed rounds.' : `${state.misses} missed round${state.misses === 1 ? '' : 's'}.`);
    if (hintsUsed > 0) parts.push(`${hintsUsed} hint${hintsUsed === 1 ? '' : 's'} used.`);
    return parts.join(' ');
  },
  starsFor: (score) => (score >= 140 ? 3 : score >= 120 ? 2 : 1),
};
