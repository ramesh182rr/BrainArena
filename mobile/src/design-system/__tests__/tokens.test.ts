import { contrastRatio, relativeLuminance } from '../contrast';
import { appFonts } from '../fonts';
import { buttonStyles, colors, fontFamilies, minTouchTarget, palette, spacing, typography, worldAccents } from '../tokens';

const AA_TEXT = 4.5;
const AA_NON_TEXT = 3;

describe('contrast helpers', () => {
  it('computes the WCAG extremes', () => {
    expect(relativeLuminance('#000000')).toBe(0);
    expect(relativeLuminance('#FFFFFF')).toBeCloseTo(1, 5);
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
  });

  it('is symmetric', () => {
    expect(contrastRatio(palette.gold, palette.night800)).toBeCloseTo(contrastRatio(palette.night800, palette.gold), 10);
  });

  it('rejects malformed colours', () => {
    expect(() => relativeLuminance('#FFF')).toThrow('#RRGGBB');
  });
});

describe('dark theme text contrast (WCAG AA)', () => {
  const backgrounds = { bgTop: colors.bgTop, bgBottom: colors.bgBottom, surface: colors.surface, surfaceSunken: colors.surfaceSunken };
  const texts = {
    textPrimary: colors.textPrimary,
    textSecondary: colors.textSecondary,
    textMuted: colors.textMuted,
    gold: colors.gold,
    success: colors.success,
    danger: colors.danger,
  };
  const pairs = Object.entries(texts).flatMap(([t, fg]) => Object.entries(backgrounds).map(([b, bg]) => [`${t} on ${b}`, fg, bg] as const));

  it.each(pairs)('%s', (_name, fg, bg) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it.each([
    ['play', buttonStyles.play],
    ['primary', buttonStyles.primary],
  ])('%s button label reads on both ends of its gradient', (_name, b) => {
    expect(contrastRatio(b.text, b.top)).toBeGreaterThanOrEqual(AA_TEXT);
    expect(contrastRatio(b.text, b.bottom)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it('text on gold chips and badges reads', () => {
    expect(contrastRatio(colors.textOnGold, colors.gold)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it('stars and focus rings stand out from panels', () => {
    expect(contrastRatio(colors.star, colors.surface)).toBeGreaterThanOrEqual(AA_NON_TEXT);
    expect(contrastRatio(colors.focus, colors.surface)).toBeGreaterThanOrEqual(AA_NON_TEXT);
  });
});

describe('world accents', () => {
  it('defines all six worlds with two-stop gradients', () => {
    expect(Object.keys(worldAccents).sort()).toEqual(['W1', 'W2', 'W3', 'W4', 'W5', 'W6']);
    for (const a of Object.values(worldAccents)) {
      expect(a.gradient).toHaveLength(2);
      expect(a.gradient[0]).not.toBe(a.gradient[1]);
      expect(a.primary).not.toBe(a.secondary);
    }
  });
});

describe('typography', () => {
  it('only uses fonts that are loaded at startup', () => {
    const loaded = new Set(Object.keys(appFonts));
    for (const family of Object.values(fontFamilies)) expect(loaded.has(family)).toBe(true);
    for (const style of Object.values(typography)) expect(loaded.has(style.fontFamily)).toBe(true);
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
