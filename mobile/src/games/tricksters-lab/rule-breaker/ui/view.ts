import { describeSpecimen, observe, PROP_LABEL } from '../rules';
import type { Observation, RuleBreakerState } from '../types';

export function resultText(o: Observation): string {
  if (o.pass) return 'PASS';
  return `FAIL: ${o.causes.map((p) => PROP_LABEL[p]).join(' and ')}`;
}

export function specimenLabel(state: RuleBreakerState, index: number): string {
  const s = state.tray[index]!;
  const base = `Specimen ${index + 1}: ${describeSpecimen(s)}`;
  if (!state.tested.includes(index)) return `${base}. Not tested yet.`;
  const o = observe(state.rule, s);
  return o.pass ? `${base}. Passed.` : `${base}. Failed because of ${o.causes.map((p) => PROP_LABEL[p]).join(' and ')}.`;
}

/** The result of the most recent tray test, for the scanner panel. */
export function lastObservation(state: RuleBreakerState): Observation | null {
  const last = state.tested[state.tested.length - 1];
  return last === undefined ? null : observe(state.rule, state.tray[last]!);
}
