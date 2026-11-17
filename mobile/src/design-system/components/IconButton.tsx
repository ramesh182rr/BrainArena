import { Pressable, StyleSheet, View } from 'react-native';

import { useHaptics } from '../preferences';
import { colors, minTouchTarget, spacing } from '../tokens';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

/** Round glass button with an icon and an optional caption underneath. */
export function IconButton({
  icon,
  label,
  onPress,
  showLabel = true,
  disabled = false,
  badge,
  accessibilityHint,
  testID,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  showLabel?: boolean;
  disabled?: boolean;
  /** Small number shown on the corner, e.g. hints used. */
  badge?: number;
  accessibilityHint?: string;
  testID?: string;
}) {
  const haptics = useHaptics();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      {...(accessibilityHint ? { accessibilityHint } : {})}
      {...(testID ? { testID } : {})}
      disabled={disabled}
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.wrap, disabled && styles.disabled, pressed && styles.pressed]}
    >
      <View style={styles.circle}>
        <Icon name={icon} size={24} color={colors.textPrimary} />
        {badge ? (
          <View style={styles.badge}>
            <AppText variant="caption" tone="onGold" style={styles.badgeText}>
              {badge}
            </AppText>
          </View>
        ) : null}
      </View>
      {showLabel ? (
        <AppText variant="caption" tone="secondary">
          {label}
        </AppText>
      ) : null}
    </Pressable>
  );
}

const SIZE = 56;

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: spacing.xs, minWidth: minTouchTarget },
  circle: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: colors.glass,
    borderWidth: 1.5,
    borderColor: colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { fontSize: 12, lineHeight: 14 },
  pressed: { transform: [{ scale: 0.92 }] },
  disabled: { opacity: 0.4 },
});
