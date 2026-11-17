import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, colors, Icon, minTouchTarget, spacing, useHaptics } from '@/design-system';

/** Game-style top bar: round back button, centred title, optional right-hand slot. */
export function ScreenHeader({
  title,
  subtitle,
  onBack,
  backLabel = 'Back',
  right,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  backLabel?: string;
  right?: ReactNode;
}) {
  const haptics = useHaptics();
  return (
    <View style={styles.bar}>
      <View style={styles.side}>
        {onBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={backLabel}
            onPress={() => {
              haptics.tap();
              onBack();
            }}
            style={({ pressed }) => [styles.back, pressed && styles.pressed]}
          >
            <Icon name="back" size={22} color={colors.textPrimary} />
          </Pressable>
        ) : null}
      </View>
      <View style={styles.center}>
        <AppText variant="heading" numberOfLines={1} shadow>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" tone="muted" numberOfLines={1}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      <View style={[styles.side, styles.right]}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.sm },
  side: { width: 92, minHeight: minTouchTarget, justifyContent: 'center' },
  right: { alignItems: 'flex-end' },
  center: { flex: 1, alignItems: 'center' },
  back: {
    width: minTouchTarget,
    height: minTouchTarget,
    borderRadius: minTouchTarget / 2,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { transform: [{ scale: 0.92 }] },
});
