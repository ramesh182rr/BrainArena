import { memo, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Polyline } from 'react-native-svg';

import { AppText, colors, radii, spacing, typography, useHaptics, useReduceMotion } from '@/design-system';
import type { GameBoardProps } from '@/games/ui';

import { roomId } from '../module';
import { currentValue, describeProblem } from '../rules';
import type { NumberMazeAction, NumberMazeState } from '../types';
import { mazeColors, opColors } from './theme';
import { buildMazeView, type RoomView } from './view';

const MAX_ROOM = 76;
const FRAME_PADDING = spacing.md;
const GAP = 4;

function roomBackground(room: RoomView): string {
  switch (room.cell.t) {
    case 'gate':
      return opColors[room.cell.op];
    case 'lock':
      return mazeColors.lock;
    case 'start':
      return mazeColors.start;
    case 'exit':
      return mazeColors.exit;
    case 'block':
      return mazeColors.block;
  }
}

/** Big number that pops when it changes. */
function ValueChip({ label, value, tone, testID }: { label: string; value: string; tone: 'gold' | 'primary'; testID?: string }) {
  const reduceMotion = useReduceMotion();
  const scale = useSharedValue(1);
  useEffect(() => {
    if (!reduceMotion) scale.value = withSequence(withTiming(1.18, { duration: 90 }), withSpring(1));
  }, [value, reduceMotion, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <View style={styles.chip} accessible accessibilityLabel={`${label}: ${value}`} {...(testID ? { testID } : {})}>
      <AppText variant="caption" tone="muted">
        {label}
      </AppText>
      <Animated.View style={style}>
        <AppText variant="number" tone={tone}>
          {value}
        </AppText>
      </Animated.View>
    </View>
  );
}

const Room = memo(function Room({
  room,
  size,
  highlighted,
  shakeKey,
  disabled,
  onTap,
}: {
  room: RoomView;
  size: number;
  highlighted: boolean;
  shakeKey: number;
  disabled: boolean;
  onTap: (room: RoomView) => void;
}) {
  const reduceMotion = useReduceMotion();
  const shake = useSharedValue(0);
  useEffect(() => {
    if (shakeKey > 0 && !reduceMotion) {
      shake.value = withSequence(withTiming(-6, { duration: 50 }), withTiming(6, { duration: 70 }), withTiming(-4, { duration: 60 }), withTiming(0, { duration: 50 }));
    }
  }, [shakeKey, reduceMotion, shake]);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  const { cell } = room;
  const visited = room.step !== null;
  const faceSize = room.face.length > 3 ? size * 0.2 : size * 0.34;

  return (
    <Pressable
      testID={roomId(room.index)}
      accessibilityRole="button"
      accessibilityLabel={room.label}
      accessibilityState={{ disabled: disabled || cell.t === 'block' }}
      disabled={disabled || cell.t === 'block'}
      onPress={() => onTap(room)}
    >
      <Animated.View
        style={[
          styles.room,
          { width: size, height: size, backgroundColor: roomBackground(room) },
          visited && !room.current && styles.visited,
          room.check.ok && styles.legal,
          highlighted && styles.highlighted,
          cell.t === 'lock' && styles.lockBorder,
          shakeStyle,
        ]}
      >
        {cell.t === 'block' ? (
          <View style={styles.rocks}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={[styles.rock, { width: size * (0.18 - i * 0.04), height: size * (0.18 - i * 0.04) }]} />
            ))}
          </View>
        ) : room.current ? (
          <View style={[styles.orb, { width: size * 0.74, height: size * 0.74, borderRadius: size * 0.37 }]}>
            <AppText style={[typography.number, { fontSize: size * 0.32, lineHeight: size * 0.4, color: mazeColors.orbText }]}>{currentValueText(room)}</AppText>
          </View>
        ) : (
          <AppText
            style={[typography.number, { fontSize: faceSize, lineHeight: faceSize * 1.2, color: cell.t === 'lock' ? mazeColors.lockAccent : mazeColors.roomText }]}
            numberOfLines={1}
          >
            {room.face}
          </AppText>
        )}
        {visited && !room.current && room.value !== null ? (
          <View style={styles.badge}>
            <AppText style={styles.badgeText}>{room.value}</AppText>
          </View>
        ) : null}
        {room.check.ok ? (
          <View style={styles.preview}>
            <AppText style={styles.previewText}>→{room.check.value}</AppText>
          </View>
        ) : null}
      </Animated.View>
    </Pressable>
  );
});

function currentValueText(room: RoomView): string {
  return String(room.value ?? '');
}

export function NumberMazeBoard({ state, onAction, highlightIds, disabled }: GameBoardProps<NumberMazeState, NumberMazeAction>) {
  const { width: screenWidth } = useWindowDimensions();
  const haptics = useHaptics();
  const rooms = useMemo(() => buildMazeView(state), [state]);
  const highlighted = useMemo(() => new Set(highlightIds), [highlightIds]);
  // A refusal message belongs to the position it was shown at; moving on hides it.
  const [refusal, setRefusal] = useState<{ text: string; at: string } | null>(null);
  const [shakes, setShakes] = useState<Record<number, number>>({});
  const size = Math.floor(Math.min(MAX_ROOM, (screenWidth - spacing.lg * 2 - FRAME_PADDING * 2 - GAP * (state.width - 1)) / state.width));
  const step = size + GAP;

  const pathKey = state.path.join(',');
  const message = refusal?.at === pathKey ? refusal.text : null;

  const tap = (room: RoomView) => {
    if (room.check.ok) {
      haptics.tap();
      onAction({ type: 'move', index: room.index });
      return;
    }
    if (room.current) return;
    haptics.warning();
    setRefusal({ text: describeProblem(state, room.check), at: pathKey });
    setShakes((s) => ({ ...s, [room.index]: (s[room.index] ?? 0) + 1 }));
  };

  const centre = (index: number) => `${(index % state.width) * step + size / 2},${Math.floor(index / state.width) * step + size / 2}`;
  const legalCount = rooms.filter((r) => r.check.ok).length;

  return (
    <View style={styles.wrapper}>
      <View style={styles.chips}>
        <ValueChip label="Now" value={String(currentValue(state))} tone="gold" testID="maze-value" />
        <ValueChip label="Target" value={String(state.target)} tone="primary" />
        <ValueChip label="Range" value={`${state.min}–${state.max}`} tone="primary" />
      </View>

      <View accessibilityLabel="Number maze" style={{ width: step * state.width - GAP, height: step * state.height - GAP }}>
        <Svg
          width={step * state.width}
          height={step * state.height}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {state.path.length > 1 ? (
            <>
              <Polyline points={state.path.map(centre).join(' ')} stroke={mazeColors.trail} strokeOpacity={0.3} strokeWidth={size * 0.32} strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <Polyline points={state.path.map(centre).join(' ')} stroke={mazeColors.trail} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </>
          ) : null}
        </Svg>
        <View style={[styles.grid, { gap: GAP }]}>
          {rooms.map((room) => (
            <Room
              key={room.index}
              room={room}
              size={size}
              highlighted={highlighted.has(roomId(room.index))}
              shakeKey={shakes[room.index] ?? 0}
              disabled={disabled}
              onTap={tap}
            />
          ))}
        </View>
      </View>

      <AppText variant="caption" tone={message ? 'danger' : 'muted'} accessibilityLiveRegion="polite" style={styles.message}>
        {message ?? (legalCount > 0 ? 'Tap a glowing room next to you.' : state.cells[state.path[state.path.length - 1]!]?.t === 'exit' ? '' : 'Dead end. Undo to try another way.')}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', gap: spacing.md },
  chips: { flexDirection: 'row', gap: spacing.sm, alignSelf: 'stretch' },
  chip: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: radii.md, backgroundColor: 'rgba(10,6,30,0.45)', borderWidth: 1, borderColor: colors.glassBorder },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  // borderStyle is always explicit: Android keeps a previous 'dashed' style otherwise.
  room: { borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderStyle: 'solid', borderColor: 'rgba(255,255,255,0.12)' },
  visited: { borderColor: mazeColors.trail, opacity: 0.75 },
  legal: { borderColor: mazeColors.legal, borderStyle: 'dashed', borderWidth: 2.5 },
  highlighted: { borderColor: mazeColors.highlight, borderWidth: 4, borderStyle: 'solid' },
  lockBorder: { borderColor: mazeColors.lockAccent },
  orb: { backgroundColor: mazeColors.orb, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FFFFFF' },
  rocks: { flexDirection: 'row', gap: 4, alignItems: 'flex-end' },
  rock: { borderRadius: 4, backgroundColor: mazeColors.blockDot },
  badge: { position: 'absolute', top: 3, right: 3, minWidth: 20, paddingHorizontal: 4, borderRadius: 8, backgroundColor: mazeColors.trail },
  badgeText: { fontSize: 11, lineHeight: 15, color: mazeColors.orbText, textAlign: 'center', fontFamily: typography.label.fontFamily },
  preview: { position: 'absolute', bottom: 2, alignSelf: 'center', paddingHorizontal: 5, borderRadius: 8, backgroundColor: 'rgba(10,6,30,0.75)' },
  previewText: { fontSize: 11, lineHeight: 15, color: '#FFFFFF', fontFamily: typography.label.fontFamily },
  message: { textAlign: 'center', minHeight: 20 },
});
