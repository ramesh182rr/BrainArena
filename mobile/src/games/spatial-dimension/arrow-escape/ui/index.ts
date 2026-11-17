import type { GameUi } from '@/games/ui';

import { TUTORIAL_LEVELS } from '../authored';
import type { ArrowEscapeAction, ArrowEscapeState } from '../types';
import { ArrowEscapeBoard } from './ArrowEscapeBoard';

export const arrowEscapeUi: GameUi<ArrowEscapeState, ArrowEscapeAction> = {
  gameId: 'W3-G01',
  howToPlay: [
    'Each emitter fires a pulse: Spark ▲, Wave ● or Flux ◆.',
    'Tap a conduit to turn it a quarter turn clockwise.',
    'Guide every pulse to a receiver with the same symbol.',
    'Two pulses can never share a conduit, except at a crossing, where they pass at right angles.',
    'Gates let only their own pulse kind through.',
  ],
  tutorials: TUTORIAL_LEVELS.map((l) => ({ seed: l.id, difficulty: l.difficulty, intro: l.intro })),
  Board: ArrowEscapeBoard,
  statusLine: (state) => `Turns ${state.turns} · Par ${state.par}`,
  levelNote: (state) =>
    state.cells.some((c) => c.t === 'gate')
      ? 'Gates (tiles with a symbol badge) only let their own pulse kind through.'
      : null,
  scoreExplanation: (state, { hintsUsed }) => {
    const over = Math.max(0, state.turns - state.par);
    const parts = [`100 for powering every receiver.`];
    parts.push(
      over === 0
        ? `You matched par (${state.par} turns).`
        : `${state.turns} turns against a par of ${state.par}: ${over} extra.`,
    );
    if (hintsUsed > 0) parts.push(`${hintsUsed} hint${hintsUsed === 1 ? '' : 's'} used.`);
    return parts.join(' ');
  },
  undoAction: { type: 'undo' },
  resetAction: { type: 'reset' },
};
