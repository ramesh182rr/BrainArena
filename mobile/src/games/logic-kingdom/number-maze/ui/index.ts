import type { GameUi } from '@/games/ui';

import { MAZE_TUTORIALS } from '../authored';
import { movesMade } from '../module';
import type { NumberMazeAction, NumberMazeState } from '../types';
import { NumberMazeBoard } from './NumberMazeBoard';

export const numberMazeUi: GameUi<NumberMazeState, NumberMazeAction> = {
  gameId: 'W2-G02',
  howToPlay: [
    'Start on START holding a number. Tap a neighbouring room to step in.',
    'Each room changes your number: + adds, − subtracts, × multiplies, ÷ divides exactly.',
    'Your number must stay inside the range, and you cannot visit a room twice.',
    'The EXIT only opens when you hold exactly the target.',
    'EVEN and ODD locks keep your number but only open for the matching kind.',
  ],
  tutorials: MAZE_TUTORIALS.map((m) => ({ seed: m.id, difficulty: m.difficulty, intro: m.intro })),
  Board: NumberMazeBoard,
  statusLine: (state) => `Moves ${movesMade(state)} · Best ${state.par}`,
  levelNote: (state) =>
    state.cells.some((c) => c.t === 'lock') ? 'EVEN and ODD locks only open when your number is even or odd.' : null,
  successMessage: (state) => `You reached the exit holding exactly ${state.target}.`,
  scoreExplanation: (state, { hintsUsed }) => {
    const extra = movesMade(state) - state.par;
    const parts = [`100 for reaching the exit at ${state.target}.`];
    parts.push(extra <= 0 ? `You found the shortest route (${state.par} moves).` : `${movesMade(state)} moves; the shortest route takes ${state.par}.`);
    if (hintsUsed > 0) parts.push(`${hintsUsed} hint${hintsUsed === 1 ? '' : 's'} used.`);
    return parts.join(' ');
  },
  starsFor: (score) => (score >= 140 ? 3 : score >= 120 ? 2 : 1),
  undoAction: { type: 'undo' },
  resetAction: { type: 'reset' },
};
