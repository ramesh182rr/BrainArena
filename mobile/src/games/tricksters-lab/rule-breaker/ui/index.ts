import type { GameUi } from '@/games/ui';

import { LAB_TUTORIALS } from '../authored';
import { describeRule } from '../rules';
import type { RuleBreakerAction, RuleBreakerState } from '../types';
import { RuleBreakerBoard } from './RuleBreakerBoard';

const BAND_NOTES: Partial<Record<RuleBreakerState['band'], string>> = {
  standard: 'Rules here may count marks, say "not", or need two properties at once (AND).',
  advanced: 'Rules here may also accept either of two properties (OR).',
  expert: 'Rules here may also say "this, but not that".',
};

export const ruleBreakerUi: GameUi<RuleBreakerState, RuleBreakerAction> = {
  gameId: 'W1-G05',
  howToPlay: [
    'A hidden rule decides which specimens pass.',
    'Tap a specimen to scan it. PASS, or FAIL plus the property that caused it, like "colour".',
    'Specimens differ by shape, colour, size (S/L) and number of marks.',
    'When you think you know the rule, take the test: sort six new specimens.',
    'Wrong answers become new evidence. Fewer scans earns a bigger bonus.',
  ],
  tutorials: LAB_TUTORIALS.map((l) => ({ seed: l.id, difficulty: l.difficulty, intro: l.intro })),
  Board: RuleBreakerBoard,
  statusLine: (state) => `Scans ${state.tested.length} · Best ${state.par}`,
  levelNote: (state) => BAND_NOTES[state.band] ?? null,
  successMessage: (state) => describeRule(state.rule),
  scoreExplanation: (state, { hintsUsed }) => {
    const parts = ['100 for sorting every specimen correctly.'];
    parts.push(
      state.tested.length <= state.par
        ? `You needed only ${state.tested.length} scan${state.tested.length === 1 ? '' : 's'}, the fewest possible.`
        : `${state.tested.length} scans; the fewest that settle it is ${state.par}.`,
    );
    if (state.failedExams > 0) parts.push(`${state.failedExams} earlier test${state.failedExams === 1 ? '' : 's'} had mistakes.`);
    if (hintsUsed > 0) parts.push(`${hintsUsed} hint${hintsUsed === 1 ? '' : 's'} used.`);
    parts.push(describeRule(state.rule));
    return parts.join(' ');
  },
  starsFor: (score) => (score >= 140 ? 3 : score >= 120 ? 2 : 1),
};
