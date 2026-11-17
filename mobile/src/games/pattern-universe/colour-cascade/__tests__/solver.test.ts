import { DIFFICULTY_BANDS } from '@/game-runtime/contracts';

import { applyDrop, inBloom, padIndices } from '../rules';
import { solveGarden } from '../solver';
import type { CascadeState, GardenCell, Inventory } from '../types';
import { colourCascade } from '../module';
import { GARDEN_TUTORIALS } from '../authored';
import { gardenState } from './helpers';

/** Independent depth-first search for the fewest drops, without deduplication. */
function bruteMin(s: CascadeState, limit: number): number | null {
  let best: number | null = null;
  const go = (cells: readonly GardenCell[], inv: Inventory, depth: number) => {
    if (inBloom(cells)) {
      if (best === null || depth < best) best = depth;
      return;
    }
    if (depth >= (best ?? limit + 1) - 1 && best !== null) return;
    if (depth >= limit) return;
    for (const colour of s.cycle) {
      if ((inv[colour] ?? 0) <= 0) continue;
      for (const index of padIndices(cells)) {
        go(applyDrop({ ...s, cells }, index, colour).cells, { ...inv, [colour]: (inv[colour] ?? 0) - 1 }, depth + 1);
      }
    }
  };
  go(s.cells, s.inventory, 0);
  return best;
}

describe('solveGarden', () => {
  it('finds the fewest drops and respects the inventory', () => {
    const s = gardenState('cycle=rose,leaf,sky inventory=sky:1,leaf:1', ['@K K L L', 'K  K L L', '@R R R R']);
    const r = solveGarden(s, s.inventory);
    expect(r).toMatchObject({ status: 'solved' });
    if (r.status === 'solved') expect(r.drops).toEqual([{ index: 8, colour: 'sky' }, { index: 0, colour: 'leaf' }]);
    // Leaf eats Sky but nothing here can turn the Rose row without a Sky droplet.
    expect(solveGarden(s, { leaf: 2 }).status).toBe('unsolvable');
  });

  it('respects the node budget', () => {
    const s = colourCascade.fallbackLevel('expert').initialState;
    expect(solveGarden(s, s.inventory, { budget: 5 }).status).toBe('budget_exceeded');
  });

  it('matches an independent brute-force search on tutorials and fallbacks', () => {
    const states = [
      ...GARDEN_TUTORIALS.map((t) => colourCascade.createLevel(t.id, t.difficulty).initialState),
      ...DIFFICULTY_BANDS.filter((d) => d !== 'expert').map((d) => colourCascade.fallbackLevel(d).initialState),
    ];
    for (const s of states) expect({ par: s.par }).toEqual({ par: bruteMin(s, 4) });
  });
});
