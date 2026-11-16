/**
 * Design tokens for BrainArena Solo.
 * Source of truth: 05_UI_UX_Design/Design_System.md in the blueprint.
 * Components must read colours, spacing and type from here, never hard-code them.
 */

export const palette = {
  ink: '#17233F',
  /** Darker ink for text on mid-tone accents where `ink` falls short of WCAG AA. */
  inkDeep: '#0B1226',
  surface: '#F7F8FC',
  nightSurface: '#202A4A',
  white: '#FFFFFF',
  coral: '#FF786B',
  sun: '#FFC857',
  aqua: '#55C9C2',
  violet: '#8B75E8',
  leaf: '#68C98C',
  sky: '#69A8F5',
  // Extended hues required by the world accents.
  amber: '#FFB038',
  indigo: '#4F5BD5',
  pink: '#F28BC2',
  midnight: '#1B2A5C',
  gold: '#E9B949',
  orange: '#FF9548',
  turquoise: '#3CCFCF',
} as const;

export const colors = {
  background: palette.surface,
  card: palette.white,
  border: '#DDE2EE',
  textPrimary: palette.ink,
  textSecondary: '#5A6680',
  textOnDark: palette.white,
  primary: palette.ink,
  primaryPressed: '#0E1730',
  accent: palette.coral,
  success: '#1A7A42',
  danger: '#C2362B',
  disabled: '#B8C0D2',
  focus: palette.indigo,
} as const;

export type WorldId = 'W1' | 'W2' | 'W3' | 'W4' | 'W5' | 'W6';

export interface WorldAccent {
  /** Dominant accent used for headers, icons and board highlights. */
  primary: string;
  /** Supporting accent for secondary highlights. */
  secondary: string;
  /** Text colour that stays readable on top of `primary`. */
  onPrimary: string;
}

export const worldAccents: Record<WorldId, WorldAccent> = {
  W1: { primary: palette.coral, secondary: palette.amber, onPrimary: palette.ink },
  W2: { primary: palette.aqua, secondary: palette.leaf, onPrimary: palette.ink },
  W3: { primary: palette.sky, secondary: palette.indigo, onPrimary: palette.ink },
  W4: { primary: palette.violet, secondary: palette.pink, onPrimary: palette.inkDeep },
  W5: { primary: palette.midnight, secondary: palette.gold, onPrimary: palette.white },
  W6: { primary: palette.orange, secondary: palette.turquoise, onPrimary: palette.ink },
};

/** 4-point spacing scale. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 20,
  pill: 999,
} as const;

/** Minimum touch target edge in density-independent pixels (Android guidance: 48dp). */
export const minTouchTarget = 48;

/**
 * System fonts only until a licensed rounded typeface is bundled
 * (see Design_System.md, Typography).
 */
export const typography = {
  display: { fontSize: 32, lineHeight: 40, fontWeight: '800' },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '700' },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  label: { fontSize: 16, lineHeight: 20, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
} as const;

export type TextVariant = keyof typeof typography;

/** Upper bound for OS font scaling so layouts stay usable at large text sizes. */
export const maxFontSizeMultiplier = 2;

export const motion = {
  fast: 120,
  standard: 220,
  slow: 400,
} as const;
