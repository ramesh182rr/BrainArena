import { pressesLeft } from '../rules';
import { SWITCH_NAMES, type MachineSwitch, type SwitchState } from '../types';

export function dialLabel(state: SwitchState, i: number): string {
  const v = state.dials[i]!;
  const t = state.target[i]!;
  return `Dial ${i + 1}: showing ${v}, target ${t}${v === t ? ', matched' : ''}.`;
}

export function wiringText(sw: MachineSwitch): string {
  const parts = sw.effects.map((e) => `${e.delta > 0 ? 'raises' : 'lowers'} dial ${e.dial + 1}`);
  const text = parts.join(', ');
  const cap = text.charAt(0).toUpperCase() + text.slice(1);
  return sw.condition ? `${cap}. Only works while dial ${sw.condition.dial + 1} shows ${sw.condition.level}.` : `${cap}.`;
}

export function switchLabel(state: SwitchState, i: number): string {
  const name = `Switch ${SWITCH_NAMES[i]}`;
  return state.discovered[i] ? `${name}. ${wiringText(state.switches[i]!)}` : `${name}. Wiring unknown.`;
}

export function statusMessage(state: SwitchState): string {
  if (state.dials.every((v, i) => v === state.target[i])) return 'Every dial matches its target!';
  if (pressesLeft(state) <= 0) return 'Out of presses. Reset the machine: your wiring notes stay.';
  const last = state.lastPress;
  if (!last) return 'Press a switch to reveal its wiring.';
  const sw = state.switches[last.index]!;
  if (!last.fired && sw.condition) {
    return `Switch ${SWITCH_NAMES[last.index]} is locked: dial ${sw.condition.dial + 1} must show ${sw.condition.level}.`;
  }
  return `Switch ${SWITCH_NAMES[last.index]} fired.`;
}
