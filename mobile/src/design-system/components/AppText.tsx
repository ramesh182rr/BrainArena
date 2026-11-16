import { Text, type TextProps } from 'react-native';

import { colors, maxFontSizeMultiplier, typography, type TextVariant } from '../tokens';

export interface AppTextProps extends TextProps {
  variant?: TextVariant;
  tone?: 'primary' | 'secondary' | 'onDark';
}

const toneColor = {
  primary: colors.textPrimary,
  secondary: colors.textSecondary,
  onDark: colors.textOnDark,
} as const;

const headerVariants: ReadonlySet<TextVariant> = new Set(['display', 'title', 'heading']);

/** Text that always uses design tokens and respects OS font scaling. */
export function AppText({ variant = 'body', tone = 'primary', style, ...rest }: AppTextProps) {
  return (
    <Text
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      {...(headerVariants.has(variant) ? { accessibilityRole: 'header' as const } : {})}
      {...rest}
      style={[typography[variant], { color: toneColor[tone] }, style]}
    />
  );
}
