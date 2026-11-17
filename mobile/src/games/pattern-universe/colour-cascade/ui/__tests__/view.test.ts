import { contrastRatio } from '@/design-system/contrast';

import { colourCascade } from '../../module';
import { bloomColors, gardenColors } from '../theme';
import { cycleSentence, plotLabel, waveSummary } from '../view';

const t3 = () => colourCascade.createLevel('tutorial-3', 'advanced').initialState;

describe('Colour Cascade view', () => {
  it('labels plots with colour, shell and pad', () => {
    const s = t3();
    expect(plotLabel(s, 4)).toBe('Row 2, column 2. Sky, with a shell, on a watering pad.');
    expect(plotLabel(s, 0)).toBe('Row 1, column 1. Leaf.');
  });

  it('states the feeding cycle', () => {
    expect(cycleSentence(t3())).toBe('Rose eats Leaf, Leaf eats Sky, Sky eats Rose.');
  });

  it('summarises what a drop did', () => {
    const s = t3();
    const a = colourCascade.reduce(s, { type: 'drop', index: 4, colour: 'rose' });
    expect(waveSummary(s, a)).toBe('1 shell cracked.');
    const b = colourCascade.reduce(a, { type: 'drop', index: 4, colour: 'rose' });
    // The centre (Sky) and seven Leaves turn Rose; the shelled Leaf only cracks.
    expect(waveSummary(a, b)).toBe('8 plants turned Rose, 1 shell cracked.');
    expect(waveSummary(null, s)).toBeNull();
  });

  it('glyphs stay readable on every bloom colour', () => {
    for (const c of Object.values(bloomColors)) expect(contrastRatio(gardenColors.glyph, c)).toBeGreaterThanOrEqual(4.5);
  });
});
