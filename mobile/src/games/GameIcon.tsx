import { useEffect } from 'react';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Circle, G, Line, Path, Polygon, Rect } from 'react-native-svg';

import { useReduceMotion } from '@/design-system';

const INK = '#1A1245';
const W = '#FFFFFF';
const GOLD = '#FFD23F';

/** One small original pictogram per game (48×48 grid), hinting at its mechanic. */
function Glyph({ id }: { id: string }) {
  switch (id) {
    case 'W1-G01': // The Missing Clue: timeline tokens with a magnifier
      return (
        <G>
          <Line x1={8} y1={30} x2={40} y2={30} stroke={W} strokeWidth={3} strokeLinecap="round" />
          {[12, 22, 32].map((x) => <Rect key={x} x={x - 4} y={24} width={8} height={12} rx={2} fill={W} />)}
          <Circle cx={30} cy={16} r={7} fill="none" stroke={GOLD} strokeWidth={3} />
          <Line x1={35} y1={21} x2={40} y2={26} stroke={GOLD} strokeWidth={3} strokeLinecap="round" />
        </G>
      );
    case 'W1-G02': // Impossible Answer: a flipping card
      return (
        <G>
          <Rect x={10} y={12} width={18} height={24} rx={3} fill={W} transform="rotate(-10 19 24)" />
          <Rect x={20} y={12} width={18} height={24} rx={3} fill={GOLD} transform="rotate(10 29 24)" />
          <Path d="M24 6 A10 10 0 0 1 34 12" stroke={W} strokeWidth={2.5} fill="none" strokeLinecap="round" />
          <Polygon points="34,8 36,13 31,13" fill={W} />
        </G>
      );
    case 'W1-G03': // Hidden Truth: an eye over a table
      return (
        <G>
          <Polygon points="10,34 38,34 44,42 4,42" fill={W} opacity={0.85} />
          <Path d="M8 20 Q24 6 40 20 Q24 34 8 20 Z" fill={W} />
          <Circle cx={24} cy={20} r={6} fill={INK} />
          <Circle cx={26} cy={18} r={2} fill={W} />
        </G>
      );
    case 'W1-G04': // Picture Riddle: shape turns into shape
      return (
        <G>
          <Circle cx={13} cy={24} r={7} fill={W} />
          <Path d="M22 24 H28 M25 21 L28 24 L25 27" stroke={GOLD} strokeWidth={2.5} fill="none" strokeLinecap="round" />
          <Rect x={31} y={14} width={9} height={9} rx={2} fill={W} />
          <Rect x={31} y={26} width={9} height={9} rx={2} fill={W} />
        </G>
      );
    case 'W1-G05': // Rule Breaker: specimen under a scanner
      return (
        <G>
          <Path d="M18 8 H30 V18 L38 36 Q39 40 35 40 H13 Q9 40 10 36 L18 18 Z" fill={W} />
          <Path d="M13 30 H35" stroke={GOLD} strokeWidth={3} />
          <Path d="M30 4 L34 10" stroke={GOLD} strokeWidth={2.5} strokeLinecap="round" />
        </G>
      );
    case 'W2-G01': // Cattice: cat face in a lattice
      return (
        <G>
          <Path d="M6 16 H42 M6 32 H42 M16 6 V42 M32 6 V42" stroke={W} strokeOpacity={0.45} strokeWidth={2} />
          <Path d="M14 30 L14 16 L20 21 H28 L34 16 L34 30 Q34 38 24 38 Q14 38 14 30 Z" fill={W} />
          <Circle cx={20} cy={28} r={2} fill={INK} />
          <Circle cx={28} cy={28} r={2} fill={INK} />
        </G>
      );
    case 'W2-G02': // Number Maze: rooms with an operator
      return (
        <G>
          <Rect x={6} y={6} width={16} height={16} rx={3} fill={W} />
          <Rect x={26} y={26} width={16} height={16} rx={3} fill={W} />
          <Path d="M14 10 V18 M10 14 H18" stroke={INK} strokeWidth={3} strokeLinecap="round" />
          <Path d="M30 34 H38" stroke={INK} strokeWidth={3} strokeLinecap="round" />
          <Path d="M22 14 H34 V26" stroke={GOLD} strokeWidth={3} fill="none" strokeDasharray="3 3" />
        </G>
      );
    case 'W2-G03': // Sequence Master: 2, 4, ?
      return (
        <G>
          {[10, 24, 38].map((x, i) => <Circle key={x} cx={x} cy={24} r={7} fill={i === 2 ? GOLD : W} />)}
          <Path d="M8 24 h4 M22 24 h4" stroke={INK} strokeWidth={2.5} />
          <Path d="M36 21 q2 -3 4 0 q0 2 -2 3 v2" stroke={INK} strokeWidth={2} fill="none" strokeLinecap="round" />
        </G>
      );
    case 'W2-G04': // Logic Grid: table with tick
      return (
        <G>
          <Rect x={6} y={8} width={36} height={32} rx={4} fill={W} />
          <Path d="M6 19 H42 M6 29 H42 M18 8 V40 M30 8 V40" stroke={INK} strokeOpacity={0.3} strokeWidth={2} />
          <Path d="M20 34 L23 37 L28 31" stroke="#2FA866" strokeWidth={3} fill="none" strokeLinecap="round" />
        </G>
      );
    case 'W2-G05': // Number Lock: padlock with signals
      return (
        <G>
          <Path d="M16 22 V16 A8 8 0 0 1 32 16 V22" stroke={W} strokeWidth={4} fill="none" />
          <Rect x={10} y={22} width={28} height={20} rx={4} fill={W} />
          <Circle cx={17} cy={32} r={3} fill="#2FA866" />
          <Path d="M24 29 A3 3 0 0 1 24 35 Z" fill={GOLD} />
          <Circle cx={31} cy={32} r={3} fill="none" stroke={INK} strokeWidth={1.5} />
        </G>
      );
    case 'W3-G01': // Volt Courier: bolt through a conduit
      return (
        <G>
          <Path d="M6 24 H18 Q24 24 24 18 V6" stroke={W} strokeWidth={5} fill="none" strokeLinecap="round" />
          <Path d="M28 16 L22 28 H28 L24 40 L36 24 H30 L34 16 Z" fill={GOLD} />
        </G>
      );
    case 'W3-G02': // Pallet Ferry: crate on a pallet over a pit
      return (
        <G>
          <Rect x={4} y={34} width={40} height={8} fill={INK} opacity={0.6} />
          <Rect x={10} y={28} width={28} height={6} rx={2} fill="#E0A458" />
          <Rect x={16} y={14} width={16} height={14} rx={2} fill={GOLD} />
          <Path d="M24 17 L28 25 H20 Z" fill={INK} opacity={0.5} />
        </G>
      );
    case 'W3-G03': // Path Finder: hedges and a fountain
      return (
        <G>
          <Rect x={6} y={10} width={10} height={14} rx={4} fill="#5BE38F" />
          <Rect x={20} y={20} width={10} height={4} rx={2} fill="#5BE38F" />
          <Rect x={32} y={10} width={10} height={14} rx={4} fill="#5BE38F" />
          <Path d="M24 40 Q14 36 18 30 H30 Q34 36 24 40 Z" fill="#4FA3FF" />
          <Path d="M24 30 Q22 24 24 20 Q26 24 24 30" fill={W} />
        </G>
      );
    case 'W3-G04': // Shadow Tumble: cube and its shadow
      return (
        <G>
          <Polygon points="24,6 38,14 24,22 10,14" fill={W} />
          <Polygon points="10,14 24,22 24,36 10,28" fill="#B9C6FF" />
          <Polygon points="38,14 24,22 24,36 38,28" fill="#7A88F0" />
          <Path d="M8 42 H40" stroke={INK} strokeWidth={4} opacity={0.5} strokeLinecap="round" />
        </G>
      );
    case 'W3-G05': // Echo Rooms: two mirrored explorers
      return (
        <G>
          <Rect x={4} y={10} width={18} height={28} rx={4} fill={W} opacity={0.9} />
          <Rect x={26} y={10} width={18} height={28} rx={4} fill={W} opacity={0.9} />
          <Circle cx={13} cy={22} r={5} fill={GOLD} />
          <Circle cx={35} cy={26} r={5} fill="#4FD1FF" />
          <Line x1={24} y1={6} x2={24} y2={42} stroke={GOLD} strokeWidth={2} strokeDasharray="3 3" />
        </G>
      );
    case 'W4-G01': // Star Thread: stars joined by a thread
      return (
        <G>
          <Path d="M8 34 L18 12 L32 28 L40 10" stroke={GOLD} strokeWidth={3} fill="none" strokeLinejoin="round" />
          {[[8, 34], [18, 12], [32, 28], [40, 10]].map(([x, y]) => <Circle key={`${x}`} cx={x} cy={y} r={4.5} fill={W} />)}
        </G>
      );
    case 'W4-G02': // Colour Cascade: droplet over plants
      return (
        <G>
          <Path d="M24 4 Q34 18 24 24 Q14 18 24 4 Z" fill="#4FD1FF" />
          {[10, 24, 38].map((x, i) => <Circle key={x} cx={x} cy={36} r={6} fill={['#FF8FB8', '#5BE38F', GOLD][i] ?? W} />)}
        </G>
      );
    case 'W4-G03': // Pattern Link: sun → moon → leaf
      return (
        <G>
          <Circle cx={10} cy={24} r={6} fill={GOLD} />
          <Path d="M28 18 A7 7 0 1 0 28 30 A5 5 0 1 1 28 18 Z" fill={W} />
          <Path d="M40 16 Q46 24 40 32 Q34 24 40 16 Z" fill="#5BE38F" />
          <Path d="M17 24 H20 M33 24 H34" stroke={W} strokeWidth={2} />
        </G>
      );
    case 'W4-G04': // Limited Moves: gear and energy bar
      return (
        <G>
          <Circle cx={18} cy={20} r={10} fill={W} />
          <Circle cx={18} cy={20} r={4} fill={INK} />
          {Array.from({ length: 8 }, (_, k) => <Rect key={k} x={16} y={6} width={4} height={6} fill={W} transform={`rotate(${k * 45} 18 20)`} />)}
          <Rect x={8} y={36} width={32} height={6} rx={3} fill={INK} opacity={0.5} />
          <Rect x={8} y={36} width={18} height={6} rx={3} fill={GOLD} />
        </G>
      );
    case 'W4-G05': // Pulsewick: pulse travelling along a fuse
      return (
        <G>
          <Path d="M6 32 Q16 14 24 26 T42 18" stroke={W} strokeWidth={3} fill="none" strokeLinecap="round" />
          <Circle cx={24} cy={26} r={5} fill={GOLD} />
          <Circle cx={24} cy={26} r={9} fill="none" stroke={GOLD} strokeWidth={1.5} opacity={0.7} />
          <Path d="M40 12 l2 -4 l2 4 l-2 4 Z" fill={W} />
        </G>
      );
    case 'W5-G01': // Memory Detective: magnifier over a room
      return (
        <G>
          <Rect x={6} y={8} width={28} height={24} rx={4} fill={W} opacity={0.9} />
          <Rect x={10} y={12} width={8} height={6} rx={1} fill="#FF8FB8" />
          <Circle cx={26} cy={24} r={4} fill="#5BE38F" />
          <Circle cx={30} cy={30} r={8} fill="none" stroke={GOLD} strokeWidth={3} />
          <Line x1={36} y1={36} x2={42} y2={42} stroke={GOLD} strokeWidth={4} strokeLinecap="round" />
        </G>
      );
    case 'W5-G02': // Object Recall: story card with a key
      return (
        <G>
          <Rect x={8} y={6} width={26} height={34} rx={4} fill={W} />
          <Path d="M13 14 H29 M13 20 H25" stroke={INK} strokeOpacity={0.4} strokeWidth={2} />
          <Circle cx={22} cy={30} r={4} fill={GOLD} />
          <Path d="M26 30 H40 M36 30 V34" stroke={GOLD} strokeWidth={3} strokeLinecap="round" />
        </G>
      );
    case 'W5-G03': // What's Changed?: before / after with a spark
      return (
        <G>
          <Rect x={4} y={10} width={18} height={28} rx={3} fill={W} opacity={0.85} />
          <Rect x={26} y={10} width={18} height={28} rx={3} fill={W} opacity={0.85} />
          <Circle cx={13} cy={24} r={5} fill="#4FA3FF" />
          <Circle cx={35} cy={24} r={5} fill="#FF6B6B" />
          <Path d="M35 6 l1.5 3 l3 1.5 l-3 1.5 l-1.5 3 l-1.5 -3 l-3 -1.5 l3 -1.5 Z" fill={GOLD} />
        </G>
      );
    case 'W5-G04': // Sequence Recall: pads lighting in order
      return (
        <G>
          {[[6, 6], [26, 6], [6, 26], [26, 26]].map(([x, y], i) => <Rect key={i} x={x} y={y} width={16} height={16} rx={4} fill={i === 1 ? GOLD : W} opacity={i === 1 ? 1 : 0.8} />)}
          <Path d="M14 14 L34 14 L14 34" stroke={INK} strokeWidth={2} strokeOpacity={0.4} fill="none" />
        </G>
      );
    case 'W5-G05': // Snapshot Memory: camera window over a map
      return (
        <G>
          <Rect x={6} y={6} width={36} height={36} rx={4} fill={W} opacity={0.35} />
          <Rect x={8} y={8} width={18} height={18} rx={3} fill="none" stroke={GOLD} strokeWidth={3} />
          <Circle cx={17} cy={17} r={4} fill={W} />
          <Circle cx={33} cy={33} r={4} fill={W} opacity={0.7} />
        </G>
      );
    case 'W6-G01': // Gravity Lab: orb bending round an attractor
      return (
        <G>
          <Path d="M6 10 H20 Q30 10 30 20 V40" stroke={GOLD} strokeWidth={2.5} strokeDasharray="3 3" fill="none" />
          <Circle cx={36} cy={14} r={7} fill="#4FD1FF" />
          <Path d="M33 14 H39 M36 11 V17" stroke={INK} strokeWidth={2} />
          <Circle cx={30} cy={36} r={5} fill={W} />
        </G>
      );
    case 'W6-G02': // Plank & Spring: ball, plank and spring
      return (
        <G>
          <Circle cx={14} cy={10} r={5} fill={W} />
          <Rect x={6} y={26} width={18} height={5} rx={2} fill="#E0A458" />
          <Path d="M28 34 l3 -6 l3 6 l3 -6 l3 6" stroke="#FF8FB8" strokeWidth={3} fill="none" strokeLinejoin="round" />
          <Path d="M34 42 L30 38 H38 Z" fill="#5BE38F" />
        </G>
      );
    case 'W6-G03': // Balance Alchemy: scale with warm and cold pans
      return (
        <G>
          <Line x1={24} y1={10} x2={24} y2={38} stroke={W} strokeWidth={3} />
          <Line x1={8} y1={16} x2={40} y2={12} stroke={W} strokeWidth={3} strokeLinecap="round" />
          <Path d="M4 22 Q8 30 14 22 Z" fill="#4FD1FF" />
          <Path d="M34 18 Q38 28 44 18 Z" fill="#FF8A3D" />
          <Rect x={16} y={38} width={16} height={4} rx={2} fill={W} />
        </G>
      );
    case 'W6-G04': // Switch Challenge: switch and dial
      return (
        <G>
          <Rect x={6} y={14} width={14} height={22} rx={4} fill={W} />
          <Rect x={9} y={17} width={8} height={8} rx={2} fill={GOLD} />
          <Circle cx={32} cy={25} r={10} fill={W} />
          <Line x1={32} y1={25} x2={38} y2={19} stroke={INK} strokeWidth={3} strokeLinecap="round" />
        </G>
      );
    case 'W6-G05': // Impossible Machine: rhythm through a module
      return (
        <G>
          <Rect x={14} y={14} width={20} height={20} rx={5} fill={W} />
          <Path d="M20 24 H28 M25 21 L28 24 L25 27" stroke={INK} strokeWidth={2.5} fill="none" strokeLinecap="round" />
          {[4, 9].map((x) => <Circle key={x} cx={x} cy={24} r={2.5} fill={GOLD} />)}
          {[39, 44].map((x) => <Circle key={x} cx={x} cy={24} r={2.5} fill={GOLD} />)}
        </G>
      );
    default:
      return <Polygon points="18,14 34,24 18,34" fill={W} />;
  }
}

/** The game's icon with a gentle wobble (off when reduced motion is on). */
export function GameIcon({ gameId, size = 40, delayMs = 0 }: { gameId: string; size?: number; delayMs?: number }) {
  const reduce = useReduceMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    t.value = withDelay(delayMs, withRepeat(withSequence(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 900, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 1800 })), -1));
    return () => cancelAnimation(t);
  }, [reduce, delayMs, t]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${(t.value - 0.5) * 8 * (t.value > 0 ? 1 : 0)}deg` }, { scale: 1 + 0.06 * t.value }] }));
  return (
    <Animated.View style={style}>
      <Svg width={size} height={size} viewBox="0 0 48 48">
        <Glyph id={gameId} />
      </Svg>
    </Animated.View>
  );
}
