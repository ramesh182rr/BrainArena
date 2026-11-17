import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useHaptics } from '../preferences';
import { colors, radii, spacing } from '../tokens';

export interface CardProps {
  children: ReactNode;
  /** When provided the whole card becomes a single button. */
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  /** Optional glow strip along the top edge, e.g. a world accent. */
  accentColor?: string;
  /** Renders the card dimmed, e.g. for content that is not available yet. */
  muted?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

/** Frosted-glass panel over the cosmic background. */
export function Card({ children, onPress, accessibilityLabel, accessibilityHint, accentColor, muted, testID, style }: CardProps) {
  const haptics = useHaptics();
  const accent = accentColor ? (
    <LinearGradient
      colors={[accentColor, 'transparent']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.accent}
    />
  ) : null;

  if (!onPress) {
    return (
      <View
        {...(accessibilityLabel ? { accessible: true, accessibilityLabel } : {})}
        {...(testID ? { testID } : {})}
        style={[styles.card, muted && styles.muted, style]}
      >
        {accent}
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
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.card, pressed && styles.pressed, muted && styles.muted, style]}
    >
      {accent}
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.glass,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: spacing.lg,
    overflow: 'hidden',
  },
  accent: { position: 'absolute', left: 0, right: 0, top: 0, height: 4 },
  pressed: { backgroundColor: colors.glassPressed, transform: [{ scale: 0.985 }] },
  muted: { opacity: 0.6 },
});
