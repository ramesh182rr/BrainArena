/**
 * Design tokens for BrainArena Solo — "cosmic arcade" game theme.
 * Visual authority: 06_Visual_Assets/brainarena_product_concept_board.png
 * (dark violet sky, glossy chunky buttons, glowing boards, world islands).
 * Components read colours, spacing and type from here; never hard-code them.
 */

export const palette = {
  night900: '#120B33',
  night800: '#1A1245',
  night700: '#24185E',
  night600: '#2E2075',
  night500: '#3B2490',
  white: '#FFFFFF',
  lavender: '#D4CCFF',
  lilac: '#B3A9EE',
  gold: '#FFC83D',
  goldLight: '#FFE58A',
  goldDeep: '#FFAE1A',
  goldLip: '#B86A00',
  goldInk: '#3A2200',
  violet: '#7B5CF0',
  violetDeep: '#5B3FD6',
  violetLip: '#3B2499',
  coral: '#FF786B',
  amber: '#FFB038',
  aqua: '#55C9C2',
  leaf: '#68C98C',
  sky: '#69A8F5',
  indigo: '#4F5BD5',
  pink: '#F28BC2',
  royal: '#3D4BB8',
  honey: '#E9B949',
  orange: '#FF9548',
  turquoise: '#3CCFCF',
} as const;

export const colors = {
  /** Background gradient, top to bottom. */
  bgTop: palette.night800,
  bgBottom: palette.night500,
  /** Opaque equivalent of a glass panel over the background, for contrast checks and fallbacks. */
  surface: '#2C2072',
  surfaceSunken: '#1F1656',
  glass: 'rgba(255,255,255,0.09)',
  glassPressed: 'rgba(255,255,255,0.16)',
  glassBorder: 'rgba(255,255,255,0.18)',
  textPrimary: palette.white,
  textSecondary: palette.lavender,
  textMuted: palette.lilac,
  textOnGold: palette.goldInk,
  gold: palette.gold,
  success: '#5BE38F',
  danger: '#FF8A8A',
  focus: palette.goldLight,
  star: '#FFD23F',
  starEmpty: 'rgba(255,255,255,0.22)',
  scrim: 'rgba(10,6,30,0.78)',
  tabBar: 'rgba(20,13,58,0.96)',
} as const;

/** Button faces: gradient top → bottom, plus the darker "lip" that gives the 3D press. */
export const buttonStyles = {
  play: { top: palette.goldLight, bottom: palette.goldDeep, lip: palette.goldLip, text: palette.goldInk },
  primary: { top: palette.violet, bottom: palette.violetDeep, lip: palette.violetLip, text: palette.white },
  secondary: { top: 'rgba(255,255,255,0.16)', bottom: 'rgba(255,255,255,0.08)', lip: 'rgba(0,0,0,0.35)', text: palette.white },
} as const;

export type ButtonVariant = keyof typeof buttonStyles;

export type WorldId = 'W1' | 'W2' | 'W3' | 'W4' | 'W5' | 'W6';

export interface WorldAccent {
  /** Dominant accent for emblems, strips and glows. */
  primary: string;
  /** Supporting accent. */
  secondary: string;
  /** Two-stop gradient for world headers and island emblems. */
  gradient: readonly [string, string];
}

export const worldAccents: Record<WorldId, WorldAccent> = {
  W1: { primary: palette.coral, secondary: palette.amber, gradient: [palette.coral, palette.amber] },
  W2: { primary: palette.aqua, secondary: palette.leaf, gradient: [palette.aqua, palette.leaf] },
  W3: { primary: palette.sky, secondary: palette.indigo, gradient: [palette.sky, palette.indigo] },
  W4: { primary: palette.violet, secondary: palette.pink, gradient: [palette.pink, palette.violet] },
  W5: { primary: palette.honey, secondary: palette.royal, gradient: [palette.royal, palette.honey] },
  W6: { primary: palette.orange, secondary: palette.turquoise, gradient: [palette.orange, palette.turquoise] },
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
  sm: 10,
  md: 16,
  lg: 24,
  pill: 999,
} as const;

/** Minimum touch target edge in density-independent pixels (Android guidance: 48dp). */
export const minTouchTarget = 48;

/** Licensed under the SIL Open Font License 1.1 (see LICENSES_AND_ATTRIBUTION). */
export const fontFamilies = {
  display: 'Fredoka_700Bold',
  heading: 'Fredoka_600SemiBold',
  body: 'Nunito_600SemiBold',
  bodyStrong: 'Nunito_800ExtraBold',
} as const;

export const typography = {
  hero: { fontFamily: fontFamilies.display, fontSize: 40, lineHeight: 46 },
  display: { fontFamily: fontFamilies.display, fontSize: 32, lineHeight: 38 },
  title: { fontFamily: fontFamilies.display, fontSize: 26, lineHeight: 32 },
  heading: { fontFamily: fontFamilies.heading, fontSize: 20, lineHeight: 26 },
  body: { fontFamily: fontFamilies.body, fontSize: 16, lineHeight: 23 },
  label: { fontFamily: fontFamilies.bodyStrong, fontSize: 16, lineHeight: 20 },
  caption: { fontFamily: fontFamilies.body, fontSize: 13, lineHeight: 18 },
  number: { fontFamily: fontFamilies.display, fontSize: 28, lineHeight: 32 },
} as const;

export type TextVariant = keyof typeof typography;

/** Upper bound for OS font scaling so layouts stay usable at large text sizes. */
export const maxFontSizeMultiplier = 1.8;

export const motion = {
  fast: 120,
  standard: 220,
  slow: 400,
  spring: { damping: 14, stiffness: 220, mass: 0.8 },
} as const;
