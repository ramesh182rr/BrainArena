import { applyDrop, canDrop, inBloom, prey } from '../rules';
import type { GardenCell } from '../types';
import { gardenState } from './helpers';

const THREE = 'cycle=rose,leaf,sky';
const LETTER = { rose: 'R', sun: 'S', leaf: 'L', sky: 'K' } as const;
const colours = (cells: readonly GardenCell[]) => cells.map((c) => (c.t === 'stone' ? '#' : LETTER[c.colour] + (c.hardy ? '*' : ''))).join(' ');

describe('feeding cycle', () => {
  it('each colour eats the next, wrapping round', () => {
    const three = ['rose', 'leaf', 'sky'] as const;
    expect(prey(three, 'rose')).toBe('leaf');
    expect(prey(three, 'sky')).toBe('rose');
    expect(prey(['rose', 'sun', 'leaf', 'sky'], 'rose')).toBe('sun');
  });
});

describe('applyDrop', () => {
  it('turns the target and cascades through connected prey only', () => {
    const s = gardenState(`${THREE} inventory=rose:1`, ['L L K', 'L @K L', 'K K L']);
    const { cells, wave } = applyDrop(s, 4, 'rose');
    // Centre becomes rose; touching leaves turn rose and pass it on; sky is not prey, so it blocks.
    expect(colours(cells)).toBe('R R K R R R K K R');
    expect(wave[0]).toBe(4);
    expect(new Set(wave)).toEqual(new Set([4, 1, 3, 5, 0, 8]));
  });

  it('cascades from the target even when it already has the colour', () => {
    const s = gardenState(`${THREE} inventory=rose:1`, ['L @R L']);
    expect(colours(applyDrop(s, 1, 'rose').cells)).toBe('R R R');
  });

  it('stones block the cascade', () => {
    const s = gardenState(`${THREE} inventory=rose:1`, ['@K L ## L']);
    expect(colours(applyDrop(s, 0, 'rose').cells)).toBe('R R # L');
  });

  it('a hardy target only loses its shell', () => {
    const s = gardenState(`${THREE} inventory=rose:2`, ['L @K* L']);
    const first = applyDrop(s, 1, 'rose');
    expect(colours(first.cells)).toBe('L K L');
    expect(first.wave).toEqual([1]);
    expect(colours(applyDrop({ ...s, cells: first.cells }, 1, 'rose').cells)).toBe('R R R');
  });

  it('a hardy neighbour cracks, stops the spread and stays safe for the rest of the wave', () => {
    const s = gardenState(`${THREE} inventory=rose:2`, ['L L L', 'L @K L*', 'L L L']);
    const { cells } = applyDrop(s, 4, 'rose');
    expect(colours(cells)).toBe('R R R R R L R R R');
  });
});

describe('bloom and drop checks', () => {
  it('full bloom ignores stones and shells', () => {
    const s = gardenState(`${THREE} inventory=rose:1`, ['R ## @R*']);
    expect(inBloom(s.cells)).toBe(true);
    expect(inBloom(gardenState(`${THREE} inventory=rose:1`, ['R L']).cells)).toBe(false);
  });

  it('only allows drops on pads, with droplets left, before bloom', () => {
    const s = gardenState(`${THREE} inventory=rose:1`, ['L @K L']);
    expect(canDrop(s, 1, 'rose')).toBe(true);
    expect(canDrop(s, 0, 'rose')).toBe(false);
    expect(canDrop(s, 1, 'sky')).toBe(false);
    expect(canDrop(s, 1, 'sun')).toBe(false);
    expect(canDrop(s, 99, 'rose')).toBe(false);
  });
});
