import type { GameUi } from '@/games/ui';

import { MACHINE_TUTORIALS } from '../authored';
import type { SwitchAction, SwitchState } from '../types';
import { SwitchChallengeBoard } from './SwitchChallengeBoard';

export const switchChallengeUi: GameUi<SwitchState, SwitchAction> = {
  gameId: 'W6-G04',
  howToPlay: [
    'Turn every dial to its gold target mark.',
    'Each switch is secretly wired to some dials. Its first press reveals the wires: ▲ raises a dial, ▼ lowers it. Dials wrap round.',
    'A locked switch only fires while a certain dial shows a certain level.',
    'You have a limited number of presses. Reset restores the machine and your presses, and keeps the wiring you have found.',
  ],
  tutorials: MACHINE_TUTORIALS.map((m) => ({ seed: m.id, difficulty: m.difficulty, intro: m.intro })),
  Board: SwitchChallengeBoard,
  statusLine: (state) => `Presses ${state.presses.length}/${state.budget} · Best ${state.par}`,
  levelNote: (state) => (state.switches.some((s) => s.condition) ? 'Some switches here are locked until a dial shows the right level.' : null),
  successMessage: () => 'Every dial is on target.',
  scoreExplanation: (state, { hintsUsed }) => {
    const parts = ['100 for reaching the target.'];
    parts.push(`${state.presses.length} presses in your final run; the machine can be solved in ${state.par} once you know the wiring (2 discovery presses are free).`);
    if (state.resets > 0) parts.push(`${state.resets} reset${state.resets === 1 ? '' : 's'}.`);
    if (hintsUsed > 0) parts.push(`${hintsUsed} hint${hintsUsed === 1 ? '' : 's'} used.`);
    return parts.join(' ');
  },
  starsFor: (score) => (score >= 140 ? 3 : score >= 120 ? 2 : 1),
  resetAction: { type: 'reset' },
};
