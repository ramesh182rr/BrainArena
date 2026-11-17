import { parseGarden } from '../authored';
import { colourCascade } from '../module';
import { solveGarden } from '../solver';
import type { CascadeAction, CascadeState } from '../types';

export function gardenState(header: string, rows: readonly string[]): CascadeState {
  const parsed = parseGarden(header, rows);
  const base: CascadeState = { ...parsed, drops: [], lastWave: [], history: [], par: 0 };
  const r = solveGarden(base, parsed.inventory, { maxDrops: 8 });
  return { ...base, par: r.status === 'solved' ? r.drops.length : 0 };
}

export function solvingDrops(state: CascadeState): CascadeAction[] {
  const r = solveGarden(state, state.inventory, { maxDrops: 10 });
  if (r.status !== 'solved') throw new Error(`Garden not solvable: ${r.status}`);
  return r.drops.map((d) => ({ type: 'drop', ...d }));
}

export const applyAll = (s: CascadeState, actions: readonly CascadeAction[]) => actions.reduce((x, a) => colourCascade.reduce(x, a), s);
