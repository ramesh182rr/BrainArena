import { contrastRatio, relativeLuminance } from '../contrast';
import { colors, minTouchTarget, palette, spacing, worldAccents } from '../tokens';

const AA_TEXT = 4.5;
const AA_NON_TEXT = 3;

describe('contrast helpers', () => {
  it('computes the WCAG extremes', () => {
    expect(relativeLuminance('#000000')).toBe(0);
    expect(relativeLuminance('#FFFFFF')).toBeCloseTo(1, 5);
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
  });

  it('is symmetric', () => {
    expect(contrastRatio(palette.ink, palette.sun)).toBeCloseTo(
      contrastRatio(palette.sun, palette.ink),
      10,
    );
  });

  it('rejects malformed colours', () => {
    expect(() => relativeLuminance('#FFF')).toThrow('#RRGGBB');
  });
});

describe('colour tokens', () => {
  it.each([
    ['textPrimary on background', colors.textPrimary, colors.background],
    ['textPrimary on card', colors.textPrimary, colors.card],
    ['textSecondary on background', colors.textSecondary, colors.background],
    ['textSecondary on card', colors.textSecondary, colors.card],
    ['textOnDark on primary', colors.textOnDark, colors.primary],
    ['textOnDark on pressed primary', colors.textOnDark, colors.primaryPressed],
    ['textOnDark on disabled primary button', colors.textOnDark, colors.textSecondary],
    ['success on card', colors.success, colors.card],
    ['danger on card', colors.danger, colors.card],
  ])('%s meets WCAG AA for text', (_name, fg, bg) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it('focus ring is visible against the background', () => {
    expect(contrastRatio(colors.focus, colors.background)).toBeGreaterThanOrEqual(AA_NON_TEXT);
  });
});

describe('world accents', () => {
  it('defines all six worlds', () => {
    expect(Object.keys(worldAccents).sort()).toEqual(['W1', 'W2', 'W3', 'W4', 'W5', 'W6']);
  });

  it.each(Object.entries(worldAccents))('%s text on its primary accent meets AA', (_id, a) => {
    expect(contrastRatio(a.onPrimary, a.primary)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it.each(Object.entries(worldAccents))('%s uses two distinct accent colours', (_id, a) => {
    expect(a.primary).not.toBe(a.secondary);
  });
});

describe('layout tokens', () => {
  it('keeps touch targets at or above 48dp', () => {
    expect(minTouchTarget).toBeGreaterThanOrEqual(48);
  });

  it('spacing scale increases monotonically', () => {
    const values = Object.values(spacing);
    expect([...values].sort((x, y) => x - y)).toEqual(values);
  });
});
