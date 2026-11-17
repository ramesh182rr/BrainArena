import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';

import { useReduceMotion } from '../preferences';
import { colors, spacing } from '../tokens';
import { Icon } from './Icon';

function PopStar({ filled, size, index, animate }: { filled: boolean; size: number; index: number; animate: boolean }) {
  const scale = useSharedValue(animate && filled ? 0 : 1);
  useEffect(() => {
    if (animate && filled) scale.value = withDelay(250 + index * 220, withSpring(1, { damping: 8, stiffness: 180 }));
  }, [animate, filled, index, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={style}>
      <Icon name="star" size={size} color={filled ? colors.star : colors.starEmpty} />
    </Animated.View>
  );
}

/** 0–3 stars; filled stars pop in one after another unless motion is reduced. */
export function StarRow({ stars, size = 28, animate = false }: { stars: number; size?: number; animate?: boolean }) {
  const reduceMotion = useReduceMotion();
  const label = `${stars} of 3 stars`;
  return (
    <View accessible accessibilityLabel={label} style={styles.row}>
      {[0, 1, 2].map((i) => (
        <PopStar key={i} filled={i < stars} size={i === 1 && size >= 40 ? size * 1.25 : size} index={i} animate={animate && !reduceMotion} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs },
});
