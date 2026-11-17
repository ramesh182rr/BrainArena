import { useEffect } from 'react';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Line, Path, Polygon, RadialGradient, Rect, Stop } from 'react-native-svg';

import { useReduceMotion, worldAccents, type WorldId } from '@/design-system';

/**
 * Original floating-island emblem for each world, drawn in SVG on a 120×120 grid:
 * a grassy island in the world's colours with a motif on top. Purely decorative.
 */
function Motif({ worldId }: { worldId: WorldId }) {
  switch (worldId) {
    case 'W1': // Trickster's Lab: bubbling flask with a question mark
      return (
        <G>
          <Path d="M52 22 H68 V36 L80 58 C82 63 79 66 74 66 H46 C41 66 38 63 40 58 L52 36 Z" fill="#FFF4E8" stroke="#7A3B1F" strokeWidth={3} />
          <Path d="M45 52 H75 L80 60 C81 63 79 65 75 65 H45 C41 65 39 63 40 60 Z" fill="#FF786B" />
          <Circle cx={56} cy={56} r={3} fill="#FFE1A8" />
          <Circle cx={65} cy={50} r={2.2} fill="#FFE1A8" />
          <Path d="M82 18 C82 11 94 11 94 18 C94 23 88 23 88 28" stroke="#FFC83D" strokeWidth={4} fill="none" strokeLinecap="round" />
          <Circle cx={88} cy={34} r={2.6} fill="#FFC83D" />
        </G>
      );
    case 'W2': // Logic Kingdom: castle with a flag
      return (
        <G>
          <Rect x={38} y={36} width={44} height={30} fill="#E8F7F3" stroke="#215C55" strokeWidth={3} />
          <Rect x={32} y={26} width={14} height={40} fill="#F6FFFC" stroke="#215C55" strokeWidth={3} />
          <Rect x={74} y={26} width={14} height={40} fill="#F6FFFC" stroke="#215C55" strokeWidth={3} />
          <Polygon points="32,26 39,14 46,26" fill="#55C9C2" stroke="#215C55" strokeWidth={3} strokeLinejoin="round" />
          <Polygon points="74,26 81,14 88,26" fill="#55C9C2" stroke="#215C55" strokeWidth={3} strokeLinejoin="round" />
          <Path d="M54 66 V54 A6 6 0 0 1 66 54 V66 Z" fill="#FFC83D" stroke="#215C55" strokeWidth={3} />
          <Line x1={60} y1={36} x2={60} y2={18} stroke="#215C55" strokeWidth={3} />
          <Path d="M60 18 L72 22 L60 26 Z" fill="#68C98C" />
        </G>
      );
    case 'W3': // Spatial Dimension: glowing isometric cube
      return (
        <G>
          <Circle cx={60} cy={42} r={26} fill="#69A8F5" opacity={0.25} />
          <Polygon points="60,18 82,30 60,42 38,30" fill="#BFE0FF" stroke="#24307A" strokeWidth={3} strokeLinejoin="round" />
          <Polygon points="38,30 60,42 60,66 38,54" fill="#69A8F5" stroke="#24307A" strokeWidth={3} strokeLinejoin="round" />
          <Polygon points="82,30 60,42 60,66 82,54" fill="#4F5BD5" stroke="#24307A" strokeWidth={3} strokeLinejoin="round" />
          <Path d="M50 46 L54 48 M66 50 L72 46" stroke="#FFFFFF" strokeWidth={2.5} strokeLinecap="round" />
        </G>
      );
    case 'W4': // Pattern Universe: constellation of glowing nodes
      return (
        <G>
          <Path d="M36 50 L50 28 L72 34 L84 54 L60 62 Z M50 28 L60 62" stroke="#FFE3F5" strokeWidth={3} fill="none" strokeLinejoin="round" />
          {[
            [36, 50, '#F28BC2'],
            [50, 28, '#FFC83D'],
            [72, 34, '#55C9C2'],
            [84, 54, '#B18CFF'],
            [60, 62, '#FF786B'],
          ].map(([x, y, c]) => (
            <G key={`${x}-${y}`}>
              <Circle cx={x as number} cy={y as number} r={9} fill={c as string} opacity={0.35} />
              <Circle cx={x as number} cy={y as number} r={5.5} fill={c as string} stroke="#FFFFFF" strokeWidth={1.5} />
            </G>
          ))}
        </G>
      );
    case 'W5': // Memory Vault: crystal orb on a pedestal
      return (
        <G>
          <Circle cx={60} cy={36} r={24} fill="url(#orbGlow)" />
          <Circle cx={60} cy={36} r={16} fill="#B9C6FF" stroke="#FFF2C2" strokeWidth={3} />
          <Path d="M52 30 C55 26 60 25 64 27" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" fill="none" />
          <Path d="M48 66 L52 52 H68 L72 66 Z" fill="#E9B949" stroke="#5B3A00" strokeWidth={3} strokeLinejoin="round" />
          <Polygon points="60,52 64,57 60,62 56,57" fill="#3D4BB8" />
        </G>
      );
    case 'W6': // Creative Chaos: gear with a spark
      return (
        <G>
          <Path
            d="M60 22 L65 22 L66 29 L72 31 L77 26 L81 30 L77 36 L79 42 L86 43 L86 49 L79 50 L77 56 L81 62 L77 66 L72 62 L66 64 L65 70 L59 70 L58 64 L52 62 L47 66 L43 62 L47 56 L45 50 L38 49 L38 43 L45 42 L47 36 L43 30 L47 26 L52 31 L58 29 Z"
            fill="#FF9548"
            stroke="#6B2E00"
            strokeWidth={3}
            strokeLinejoin="round"
          />
          <Circle cx={62} cy={46} r={8} fill="#3CCFCF" stroke="#6B2E00" strokeWidth={3} />
          <Path d="M88 14 L82 26 H90 L84 38" stroke="#FFC83D" strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </G>
      );
  }
}

export function WorldEmblem({
  worldId,
  size = 120,
  bob = true,
  delayMs = 0,
}: {
  worldId: WorldId;
  size?: number;
  bob?: boolean;
  delayMs?: number;
}) {
  const reduceMotion = useReduceMotion();
  const [top, bottom] = worldAccents[worldId].gradient;
  const lift = useSharedValue(0);
  const animate = bob && !reduceMotion;

  useEffect(() => {
    if (!animate) return;
    lift.value = withDelay(delayMs, withRepeat(withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }), -1, true));
    return () => cancelAnimation(lift);
  }, [animate, delayMs, lift]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateY: -6 * lift.value }] }));
  const id = `${worldId}-${size}`;

  return (
    <Animated.View style={[{ width: size, height: size }, style]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size} viewBox="0 0 120 120">
        <Defs>
          <LinearGradient id={`grass-${id}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={top} />
            <Stop offset="1" stopColor={bottom} />
          </LinearGradient>
          <LinearGradient id={`rock-${id}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#6B5BA8" />
            <Stop offset="1" stopColor="#2B2163" />
          </LinearGradient>
          <RadialGradient id={`halo-${id}`} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={top} stopOpacity="0.55" />
            <Stop offset="1" stopColor={top} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="orbGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#FFF2C2" stopOpacity="0.9" />
            <Stop offset="1" stopColor="#FFF2C2" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx={60} cy={62} r={56} fill={`url(#halo-${id})`} />
        {/* Rocky underside */}
        <Path d="M18 74 C24 96 44 112 60 114 C76 112 96 96 102 74 Z" fill={`url(#rock-${id})`} />
        <Path d="M40 96 L46 104 M74 100 L80 92 M58 108 L60 114" stroke="#1E1650" strokeWidth={3} strokeLinecap="round" />
        {/* Grass top */}
        <Ellipse cx={60} cy={72} rx={44} ry={13} fill={`url(#grass-${id})`} />
        <Ellipse cx={60} cy={69} rx={40} ry={9} fill="#FFFFFF" opacity={0.18} />
        {/* Little floating rocks */}
        <Path d="M10 58 L18 54 L20 62 L13 64 Z" fill="#6B5BA8" />
        <Path d="M104 48 L112 50 L109 57 L102 55 Z" fill="#6B5BA8" />
        <Motif worldId={worldId} />
      </Svg>
    </Animated.View>
  );
}
