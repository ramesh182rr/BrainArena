import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { useHaptics, useReduceMotion } from '../preferences';
import { buttonStyles, minTouchTarget, motion, radii, spacing, typography, type ButtonVariant } from '../tokens';
import { AppText } from './AppText';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: 'lg' | 'md' | 'sm';
  icon?: ReactNode;
  disabled?: boolean;
  /** Extra context for screen readers when the label alone is ambiguous. */
  accessibilityHint?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

const LIP = { lg: 7, md: 5, sm: 4 } as const;
const HEIGHT = { lg: 64, md: 52, sm: minTouchTarget } as const;

/**
 * Chunky glossy game button: a gradient face sitting on a darker lip. The face
 * sinks into the lip while pressed (instantly when reduced motion is on).
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  disabled = false,
  accessibilityHint,
  testID,
  style,
}: ButtonProps) {
  const palette = buttonStyles[variant];
  const lip = LIP[size];
  const reduceMotion = useReduceMotion();
  const haptics = useHaptics();
  const pressed = useSharedValue(0);

  const faceStyle = useAnimatedStyle(() => ({ transform: [{ translateY: pressed.value * (lip - 1) }] }));

  const animateTo = (value: number) => {
    pressed.value = reduceMotion ? withTiming(value, { duration: 0 }) : withSpring(value, motion.spring);
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      {...(accessibilityHint ? { accessibilityHint } : {})}
      {...(testID ? { testID } : {})}
      disabled={disabled}
      onPressIn={() => animateTo(1)}
      onPressOut={() => animateTo(0)}
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={[{ height: HEIGHT[size] + lip, minWidth: minTouchTarget }, disabled && styles.disabled, style]}
    >
      <View style={[StyleSheet.absoluteFill, styles.lip, { top: lip, backgroundColor: palette.lip, borderRadius: radii.pill }]} />
      <Animated.View style={[styles.face, { height: HEIGHT[size], borderRadius: radii.pill }, faceStyle]}>
        <LinearGradient colors={[palette.top, palette.bottom]} style={[StyleSheet.absoluteFill, { borderRadius: radii.pill }]} />
        {/* Gloss highlight on the upper half. */}
        <LinearGradient
          colors={['rgba(255,255,255,0.38)', 'rgba(255,255,255,0)']}
          style={[styles.gloss, { borderTopLeftRadius: radii.pill, borderTopRightRadius: radii.pill }]}
        />
        <View style={styles.content}>
          {icon}
          <AppText
            style={[size === 'lg' ? styles.labelLg : typography.label, { color: palette.text }]}
            numberOfLines={1}
          >
            {size === 'lg' ? label.toUpperCase() : label}
          </AppText>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  lip: { bottom: 0 },
  face: { overflow: 'hidden', justifyContent: 'center' },
  gloss: { position: 'absolute', left: 0, right: 0, top: 0, height: '50%' },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.xl },
  labelLg: { ...typography.title, fontSize: 24, letterSpacing: 1 },
  disabled: { opacity: 0.45 },
});
