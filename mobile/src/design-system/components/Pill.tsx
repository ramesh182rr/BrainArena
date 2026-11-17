import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radii, spacing } from '../tokens';
import { AppText } from './AppText';

/** Small rounded chip for counters and statuses, e.g. stars or "Coming soon". */
export function Pill({
  label,
  icon,
  tone = 'glass',
  accessibilityLabel,
  style,
}: {
  label: string;
  icon?: ReactNode;
  tone?: 'glass' | 'gold' | 'dark';
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel ?? label}
      style={[styles.pill, tone === 'gold' ? styles.gold : tone === 'dark' ? styles.dark : styles.glass, style]}
    >
      {icon}
      <AppText variant="label" tone={tone === 'gold' ? 'onGold' : 'primary'} style={styles.text} numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.pill,
    borderWidth: 1,
    alignSelf: 'flex-start',
    flexShrink: 0,
  },
  glass: { backgroundColor: colors.glass, borderColor: colors.glassBorder },
  gold: { backgroundColor: colors.gold, borderColor: 'rgba(255,255,255,0.5)' },
  dark: { backgroundColor: 'rgba(10,6,30,0.55)', borderColor: colors.glassBorder },
  text: { fontSize: 14 },
});
