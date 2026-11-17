import type { MachineSwitch, SwitchState } from './types';

const wrap = (v: number, levels: number) => ((v % levels) + levels) % levels;

/** Dials after pressing `sw`, and whether it fired (its condition held). */
export function applySwitch(dials: readonly number[], sw: MachineSwitch, levels: number): { dials: number[]; fired: boolean } {
  if (sw.condition && dials[sw.condition.dial] !== sw.condition.level) return { dials: [...dials], fired: false };
  const next = [...dials];
  for (const e of sw.effects) next[e.dial] = wrap((next[e.dial] ?? 0) + e.delta, levels);
  return { dials: next, fired: true };
}

export const sameDials = (a: readonly number[], b: readonly number[]) => a.length === b.length && a.every((v, i) => v === b[i]);

export const pressesLeft = (s: SwitchState) => s.budget - s.presses.length;

export function atTarget(s: Pick<SwitchState, 'dials' | 'target'>): boolean {
  return sameDials(s.dials, s.target);
}

/**
 * Breadth-first search over dial states: the shortest press sequence from
 * `from` to `target`, or null if none exists within `maxPresses`.
 */
export function shortestPresses(
  switches: readonly MachineSwitch[],
  levels: number,
  from: readonly number[],
  target: readonly number[],
  maxPresses = 20,
): number[] | null {
  if (sameDials(from, target)) return [];
  const key = (d: readonly number[]) => d.join(',');
  const seen = new Set([key(from)]);
  let frontier: { dials: number[]; path: number[] }[] = [{ dials: [...from], path: [] }];
  for (let depth = 1; depth <= maxPresses && frontier.length > 0; depth += 1) {
    const next: typeof frontier = [];
    for (const node of frontier) {
      for (let i = 0; i < switches.length; i += 1) {
        const { dials, fired } = applySwitch(node.dials, switches[i]!, levels);
        if (!fired) continue;
        const k = key(dials);
        if (seen.has(k)) continue;
        seen.add(k);
        const path = [...node.path, i];
        if (sameDials(dials, target)) return path;
        next.push({ dials, path });
      }
    }
    frontier = next;
  }
  return null;
}
