import { switchChallenge } from '../module';
import { shortestPresses } from '../rules';
import type { SwitchAction, SwitchState } from '../types';

export const apply = (s: SwitchState, actions: readonly SwitchAction[]) => actions.reduce((x, a) => switchChallenge.reduce(x, a), s);

export function solvingPresses(s: SwitchState): SwitchAction[] {
  const path = shortestPresses(s.switches, s.levels, s.dials, s.target, 30);
  if (!path) throw new Error('Machine not solvable');
  return path.map((index) => ({ type: 'press', index }));
}
