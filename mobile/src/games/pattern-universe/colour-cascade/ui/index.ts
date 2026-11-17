import type { GameUi } from '@/games/ui';

import { GARDEN_TUTORIALS } from '../authored';
import { bloomColour } from '../rules';
import { BLOOM_INFO, type CascadeAction, type CascadeState } from '../types';
import { ColourCascadeBoard } from './ColourCascadeBoard';

export const colourCascadeUi: GameUi<CascadeState, CascadeAction> = {
  gameId: 'W4-G02',
  howToPlay: [
    'Make the whole garden one colour, full bloom, using your droplets.',
    'Pick a droplet, then tap a watering pad (dashed gold ring). That plant takes the colour.',
    'The colour then spreads through every connected plant it eats: each colour eats the next one along the cycle shown.',
    'Shelled plants crack first and stop the spread; the next hit changes them. Stones block.',
    'Order matters. Undo and reset are free.',
  ],
  tutorials: GARDEN_TUTORIALS.map((g) => ({ seed: g.id, difficulty: g.difficulty, intro: g.intro })),
  Board: ColourCascadeBoard,
  statusLine: (state) => `Drops ${state.drops.length} · Best ${state.par}`,
  levelNote: (state) => {
    const notes: string[] = [];
    if (state.cells.some((c) => c.t === 'plant' && c.hardy)) notes.push('White rings are shells: a hit cracks them first.');
    if (state.cells.some((c) => c.t === 'stone')) notes.push('Stones block the spread.');
    return notes.length ? notes.join(' ') : null;
  },
  successMessage: (state) => {
    const c = bloomColour(state.cells);
    return c ? `The whole garden blooms ${BLOOM_INFO[c].label}.` : 'The garden is in full bloom.';
  },
  scoreExplanation: (state, { hintsUsed }) => {
    const parts = ['100 for bringing the garden into full bloom.'];
    parts.push(state.drops.length <= state.par ? `You used the fewest droplets possible (${state.par}).` : `${state.drops.length} droplets; it can be done with ${state.par}.`);
    if (hintsUsed > 0) parts.push(`${hintsUsed} hint${hintsUsed === 1 ? '' : 's'} used.`);
    return parts.join(' ');
  },
  starsFor: (score) => (score >= 140 ? 3 : score >= 120 ? 2 : 1),
  undoAction: { type: 'undo' },
  resetAction: { type: 'reset' },
};
