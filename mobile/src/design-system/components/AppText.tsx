import { Text, type TextProps } from 'react-native';

import { colors, maxFontSizeMultiplier, typography, type TextVariant } from '../tokens';

export type TextTone = 'primary' | 'secondary' | 'muted' | 'onGold' | 'gold' | 'success' | 'danger';

export interface AppTextProps extends TextProps {
  variant?: TextVariant;
  tone?: TextTone;
  /** Adds a soft dark shadow so text reads over bright art. */
  shadow?: boolean;
}

const toneColor: Record<TextTone, string> = {
  primary: colors.textPrimary,
  secondary: colors.textSecondary,
  muted: colors.textMuted,
  onGold: colors.textOnGold,
  gold: colors.gold,
  success: colors.success,
  danger: colors.danger,
};

const headerVariants: ReadonlySet<TextVariant> = new Set(['hero', 'display', 'title', 'heading']);

const textShadow = { textShadowColor: 'rgba(0,0,0,0.45)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 };

/** Text that always uses design tokens and respects OS font scaling. */
export function AppText({ variant = 'body', tone = 'primary', shadow = false, style, ...rest }: AppTextProps) {
  return (
    <Text
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      {...(headerVariants.has(variant) ? { accessibilityRole: 'header' as const } : {})}
      {...rest}
      style={[typography[variant], { color: toneColor[tone] }, shadow && textShadow, style]}
    />
  );
}
