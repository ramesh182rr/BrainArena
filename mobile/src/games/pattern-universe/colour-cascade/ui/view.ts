import { prey } from '../rules';
import { BLOOM_INFO, type CascadeState, type GardenCell } from '../types';

export function plotLabel(state: CascadeState, index: number): string {
  const cell = state.cells[index] as GardenCell;
  const pos = `Row ${Math.floor(index / state.width) + 1}, column ${(index % state.width) + 1}`;
  if (cell.t === 'stone') return `${pos}. Stone.`;
  const parts = [`${pos}. ${BLOOM_INFO[cell.colour].label}`];
  if (cell.hardy) parts.push('with a shell');
  if (cell.pad) parts.push('on a watering pad');
  return `${parts.join(', ')}.`;
}

export function cycleSentence(state: CascadeState): string {
  return state.cycle.map((c) => `${BLOOM_INFO[c].label} eats ${BLOOM_INFO[prey(state.cycle, c)].label}`).join(', ') + '.';
}

/** What the latest drop did, in words. */
export function waveSummary(before: CascadeState | null, state: CascadeState): string | null {
  const last = state.drops[state.drops.length - 1];
  if (!last || state.lastWave.length === 0) return null;
  const turned = state.lastWave.filter((i) => {
    const b = before?.cells[i];
    const a = state.cells[i];
    return b && a && b.t === 'plant' && a.t === 'plant' && b.colour !== a.colour;
  }).length;
  const cracked = state.lastWave.length - turned;
  const parts: string[] = [];
  if (turned > 0) parts.push(`${turned} plant${turned === 1 ? '' : 's'} turned ${BLOOM_INFO[last.colour].label}`);
  if (cracked > 0) parts.push(`${cracked} shell${cracked === 1 ? '' : 's'} cracked`);
  return parts.length ? `${parts.join(', ')}.` : 'Nothing changed.';
}
