import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { ReactNode } from 'react';

import { colors, radii, spacing } from '../tokens';

export interface CardProps {
  children: ReactNode;
  /** When provided the whole card becomes a single button. */
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  /** Optional coloured strip on the leading edge, e.g. a world accent. */
  accentColor?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

export function Card({
  children,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  accentColor,
  testID,
  style,
}: CardProps) {
  const accent = accentColor ? { borderLeftWidth: 6, borderLeftColor: accentColor } : null;
  if (!onPress) {
    return (
      <View {...(testID ? { testID } : {})} style={[styles.card, accent, style]}>
        {children}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      {...(accessibilityLabel ? { accessibilityLabel } : {})}
      {...(accessibilityHint ? { accessibilityHint } : {})}
      {...(testID ? { testID } : {})}
      onPress={onPress}
      style={({ pressed }) => [styles.card, accent, pressed && styles.pressed, style]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  pressed: { backgroundColor: colors.background },
});
