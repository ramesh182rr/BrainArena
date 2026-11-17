import { LinearGradient } from 'expo-linear-gradient';
import { memo, useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { createRng } from '@/game-runtime/rng';

import { useReduceMotion } from '../preferences';
import { colors } from '../tokens';

interface Star {
  x: number;
  y: number;
  r: number;
  o: number;
}

/** Fixed star layout so the sky does not reshuffle between renders. */
function makeStars(count: number, seed: string): Star[] {
  const rng = createRng(seed);
  return Array.from({ length: count }, () => ({
    x: rng.next() * 100,
    y: rng.next() * 100,
    r: 0.6 + rng.next() * 1.6,
    o: 0.25 + rng.next() * 0.6,
  }));
}

/**
 * Deep-violet sky with stars and two soft glows. A slow shimmer runs only when
 * motion is allowed; it never animates behind a puzzle board (`calm`).
 */
export const GameBackground = memo(function GameBackground({ calm = false }: { calm?: boolean }) {
  const reduceMotion = useReduceMotion();
  const { width, height } = useWindowDimensions();
  const stars = useMemo(() => makeStars(56, 'brainarena-sky'), []);
  const shimmer = useSharedValue(0.6);
  const animate = !reduceMotion && !calm;

  useEffect(() => {
    if (!animate) return;
    shimmer.value = withRepeat(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => cancelAnimation(shimmer);
  }, [animate, shimmer]);

  const twinkle = useAnimatedStyle(() => ({ opacity: animate ? shimmer.value : 0.8 }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <LinearGradient colors={[colors.bgTop, colors.bgBottom]} style={StyleSheet.absoluteFill} />
      <Svg style={StyleSheet.absoluteFill} viewBox="0 0 100 100" preserveAspectRatio="none">
        <Defs>
          <RadialGradient id="glowA" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#FF7AD9" stopOpacity="0.35" />
            <Stop offset="1" stopColor="#FF7AD9" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="glowB" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#5AD1FF" stopOpacity="0.28" />
            <Stop offset="1" stopColor="#5AD1FF" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx={88} cy={14} r={34} fill="url(#glowA)" />
        <Circle cx={6} cy={78} r={40} fill="url(#glowB)" />
      </Svg>
      <Animated.View style={[StyleSheet.absoluteFill, twinkle]}>
        {/* Pixel coordinates keep stars round on any aspect ratio. */}
        <Svg width={width} height={height}>
          {stars.map((s, i) => (
            <Circle key={i} cx={(s.x / 100) * width} cy={(s.y / 100) * height} r={s.r} fill="#FFFFFF" opacity={s.o} />
          ))}
        </Svg>
      </Animated.View>
    </View>
  );
});
