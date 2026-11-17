import { contrastRatio } from '@/design-system/contrast';

import { ruleBreaker } from '../../module';
import { labColors, specimenColors } from '../theme';
import { lastObservation, resultText, specimenLabel } from '../view';

const t1 = () => ruleBreaker.createLevel('tutorial-1', 'intro').initialState;

describe('Rule Breaker view', () => {
  it('labels untested and tested specimens', () => {
    const s = t1();
    expect(specimenLabel(s, 0)).toBe('Specimen 1: large red triangle with 1 mark. Not tested yet.');
    const tested = ruleBreaker.reduce(ruleBreaker.reduce(s, { type: 'test', index: 0 }), { type: 'test', index: 1 });
    expect(specimenLabel(tested, 0)).toMatch(/Passed\.$/);
    expect(specimenLabel(tested, 1)).toMatch(/Failed because of shape\.$/);
    expect(resultText(lastObservation(tested)!)).toBe('FAIL: shape');
  });

  it('has no last observation before any test', () => {
    expect(lastObservation(t1())).toBeNull();
  });

  it('result badge text reads on pass and fail colours', () => {
    expect(contrastRatio('#3A2200', labColors.pass)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio('#3A2200', labColors.fail)).toBeGreaterThanOrEqual(4.5);
  });

  it('specimen colours stand out from the card (3:1)', () => {
    for (const c of Object.values(specimenColors)) expect(contrastRatio(c, labColors.card)).toBeGreaterThanOrEqual(3);
  });
});
