import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { useReduceMotion } from '@/design-system';
import { createRng } from '@/game-runtime/rng';

const COLORS = ['#FFD23F', '#FF7AD9', '#5AD1FF', '#5BE38F', '#FF9548', '#B18CFF'];

function Particle({ angle, distance, color, size, delay }: { angle: number; distance: number; color: string; size: number; delay: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(delay, withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }));
  }, [delay, t]);
  const style = useAnimatedStyle(() => ({
    opacity: 1 - t.value * t.value,
    transform: [
      { translateX: Math.cos(angle) * distance * t.value },
      { translateY: Math.sin(angle) * distance * t.value + 60 * t.value * t.value },
      { scale: 1 - 0.4 * t.value },
      { rotate: `${t.value * 300}deg` },
    ],
  }));
  return <Animated.View style={[styles.particle, { width: size, height: size * 0.6, backgroundColor: color }, style]} />;
}

/** Confetti burst from the centre. Renders nothing when motion is reduced. */
export function Celebration({ seed }: { seed: string }) {
  const reduceMotion = useReduceMotion();
  const particles = useMemo(() => {
    const rng = createRng(`confetti-${seed}`);
    return Array.from({ length: 36 }, (_, i) => ({
      angle: (i / 36) * Math.PI * 2 + rng.next() * 0.3,
      distance: 110 + rng.next() * 140,
      color: rng.pick(COLORS),
      size: 8 + rng.next() * 8,
      delay: rng.int(0, 120),
    }));
  }, [seed]);
  if (reduceMotion) return null;
  return (
    <View pointerEvents="none" style={styles.origin} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {particles.map((p, i) => (
        <Particle key={i} {...p} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  origin: { position: 'absolute', left: '50%', top: '40%', width: 0, height: 0 },
  particle: { position: 'absolute', borderRadius: 2 },
});
