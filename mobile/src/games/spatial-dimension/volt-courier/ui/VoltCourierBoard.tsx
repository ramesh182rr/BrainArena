import { memo, useEffect, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

import { AppText, spacing, useHaptics, useReduceMotion } from '@/design-system';
import type { GameBoardProps } from '@/games/ui';

import { isRotatable, openSides, rotateDir } from '../grid';
import { cellId } from '../module';
import { PULSE_KIND_INFO, type VoltCourierAction, type VoltCourierState, type Dir, type PulseKind } from '../types';
import { boardColors, pulseColors } from './theme';
import { buildBoardView, type CellView } from './view';

const MAX_CELL = 72;
/** Outer padding of the board frame drawn by the play screen. */
const FRAME_PADDING = spacing.md;
const DASH = 18;

const AnimatedLine = Animated.createAnimatedComponent(Line);

/** Midpoint of side `d` for a tile of size `s`. */
function edge(d: Dir, s: number): { x: number; y: number } {
  const h = s / 2;
  return [
    { x: h, y: 0 },
    { x: s, y: h },
    { x: h, y: s },
    { x: 0, y: h },
  ][d] as { x: number; y: number };
}

/** Moving dashes along one arm; `inward` flows edge → centre, otherwise centre → edge. */
function FlowArm({ side, size, color, inward, clock }: { side: Dir; size: number; color: string; inward: boolean; clock: SharedValue<number> }) {
  const c = size / 2;
  const e = edge(side, size);
  const from = inward ? e : { x: c, y: c };
  const to = inward ? { x: c, y: c } : e;
  const props = useAnimatedProps(() => ({ strokeDashoffset: -clock.value * DASH }));
  return (
    <AnimatedLine
      x1={from.x}
      y1={from.y}
      x2={to.x}
      y2={to.y}
      stroke={color}
      strokeWidth={Math.max(2, size * 0.06)}
      strokeLinecap="round"
      strokeDasharray={`4 ${DASH - 4}`}
      animatedProps={props}
    />
  );
}

/** Conduit art drawn at rotation 0; the wrapping view applies the rotation (animated). */
function ConduitLayer({ view, size, clock, flowing }: { view: CellView; size: number; clock: SharedValue<number>; flowing: boolean }) {
  const { cell } = view;
  const s = size;
  const c = s / 2;
  const stroke = Math.max(5, s * 0.17);
  const arms = (sides: readonly Dir[], kind: PulseKind | null) => {
    const color = kind ? pulseColors[kind] : boardColors.conduit;
    return sides.map((d) => {
      const e = edge(d, s);
      return (
        <G key={d}>
          {kind ? <Line x1={c} y1={c} x2={e.x} y2={e.y} stroke={color} strokeWidth={stroke * 2.1} strokeOpacity={0.28} strokeLinecap="round" /> : null}
          <Line x1={c} y1={c} x2={e.x} y2={e.y} stroke={color} strokeWidth={stroke} strokeLinecap="round" />
        </G>
      );
    });
  };

  if (cell.t === 'cross') {
    return (
      <Svg width={s} height={s}>
        {arms([1, 3], view.powerHorizontal)}
        {arms([0, 2], view.powerVertical)}
        <Circle cx={c} cy={c} r={stroke * 0.7} fill={boardColors.fixedTile} stroke={boardColors.conduit} strokeWidth={2} />
      </Svg>
    );
  }
  // Base orientation (rotation 0) open sides; the view rotation turns them into place.
  const base = openSides(cell, 0) ?? [];
  const color = view.power ? pulseColors[view.power] : boardColors.conduit;
  // Flow enters from `flowIn` (board frame); convert it into this layer's base frame.
  const baseIn = view.flowIn !== null ? rotateDir(view.flowIn, -view.rotation) : null;
  return (
    <Svg width={s} height={s}>
      {arms(base, view.power)}
      <Circle cx={c} cy={c} r={stroke / 2} fill={color} />
      {flowing && view.power
        ? base.map((d) => <FlowArm key={`f${d}`} side={d} size={s} color="#FFFFFF" inward={d === baseIn} clock={clock} />)
        : null}
      {cell.t === 'gate' ? (
        <G>
          <Rect x={c - s * 0.21} y={c - s * 0.21} width={s * 0.42} height={s * 0.42} rx={6} fill={boardColors.fixedTile} stroke={pulseColors[cell.kind]} strokeWidth={3} />
          <SvgText x={c} y={c + s * 0.09} fontSize={s * 0.26} fontWeight="bold" textAnchor="middle" fill={pulseColors[cell.kind]}>
            {PULSE_KIND_INFO[cell.kind].symbol}
          </SvgText>
        </G>
      ) : null}
    </Svg>
  );
}

/** Wraps the conduit layer and spins it by quarter turns, taking the short way round. */
function RotatingConduit({ view, size, clock, flowing, animate }: { view: CellView; size: number; clock: SharedValue<number>; flowing: boolean; animate: boolean }) {
  const turns = useRef(view.rotation);
  const last = useRef(view.rotation);
  const angle = useSharedValue(view.rotation * 90);

  useEffect(() => {
    if (view.rotation === last.current) return;
    const delta = (((view.rotation - last.current) % 4) + 4) % 4;
    turns.current += delta === 3 ? -1 : delta;
    last.current = view.rotation;
    angle.value = animate ? withSpring(turns.current * 90, { damping: 13, stiffness: 260 }) : turns.current * 90;
  }, [view.rotation, animate, angle]);

  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${angle.value}deg` }] }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]}>
      <ConduitLayer view={view} size={size} clock={clock} flowing={flowing} />
    </Animated.View>
  );
}

const Tile = memo(function Tile({
  view,
  size,
  highlighted,
  clock,
  flowing,
  animate,
}: {
  view: CellView;
  size: number;
  highlighted: boolean;
  clock: SharedValue<number>;
  flowing: boolean;
  animate: boolean;
}) {
  const { cell } = view;
  const s = size;
  const c = s / 2;
  const inset = 2;
  const fixed = cell.t === 'cross' || cell.t === 'gate' || cell.t === 'emitter' || cell.t === 'receiver' || ((cell.t === 'straight' || cell.t === 'bend') && cell.locked);
  const oriented = cell.t === 'straight' || cell.t === 'bend' || cell.t === 'gate' || cell.t === 'cross';

  let fixture: React.ReactNode = null;
  if (cell.t === 'emitter') {
    const color = pulseColors[cell.kind];
    const tip = edge(cell.dir, s);
    const angle = (cell.dir * Math.PI) / 2;
    const px = (dx: number, dy: number) => c + dx * Math.cos(angle) - dy * Math.sin(angle);
    const py = (dx: number, dy: number) => c + dx * Math.sin(angle) + dy * Math.cos(angle);
    fixture = (
      <G>
        <Line x1={c} y1={c} x2={tip.x} y2={tip.y} stroke={color} strokeWidth={Math.max(5, s * 0.17)} strokeLinecap="round" />
        <Circle cx={c} cy={c} r={s * 0.4} fill={color} opacity={0.25} />
        <Circle cx={c} cy={c} r={s * 0.29} fill={color} stroke="#FFFFFF" strokeWidth={2} />
        <Path d={`M ${px(0, -s * 0.47)} ${py(0, -s * 0.47)} L ${px(-s * 0.13, -s * 0.33)} ${py(-s * 0.13, -s * 0.33)} L ${px(s * 0.13, -s * 0.33)} ${py(s * 0.13, -s * 0.33)} Z`} fill="#FFFFFF" />
        <SvgText x={c} y={c + s * 0.1} fontSize={s * 0.28} fontWeight="bold" textAnchor="middle" fill={boardColors.onPulse}>
          {PULSE_KIND_INFO[cell.kind].symbol}
        </SvgText>
      </G>
    );
  } else if (cell.t === 'receiver') {
    const color = pulseColors[cell.kind];
    const r = s * 0.3;
    fixture = (
      <G>
        {view.satisfied ? <Circle cx={c} cy={c} r={s * 0.44} fill={color} opacity={0.3} /> : null}
        <Rect x={c - r} y={c - r} width={r * 2} height={r * 2} rx={s * 0.12} fill={view.satisfied ? color : boardColors.fixedTile} stroke={color} strokeWidth={4} />
        <SvgText x={c} y={c + s * 0.1} fontSize={s * 0.28} fontWeight="bold" textAnchor="middle" fill={view.satisfied ? boardColors.onPulse : color}>
          {PULSE_KIND_INFO[cell.kind].symbol}
        </SvgText>
      </G>
    );
  }

  return (
    <View style={{ width: s, height: s }}>
      <Svg width={s} height={s} style={StyleSheet.absoluteFill}>
        {cell.t === 'empty' ? (
          <Circle cx={c} cy={c} r={2.5} fill={boardColors.emptyDot} />
        ) : (
          <G>
            <Rect x={inset} y={inset} width={s - inset * 2} height={s - inset * 2} rx={s * 0.2} fill={fixed ? boardColors.fixedTile : boardColors.tile} stroke={boardColors.tileBorder} strokeWidth={1.5} />
            {!fixed ? <Rect x={inset + 3} y={inset + 3} width={s - inset * 2 - 6} height={(s - inset * 2) * 0.42} rx={s * 0.16} fill={boardColors.tileHighlight} opacity={0.55} /> : null}
          </G>
        )}
        {fixture}
      </Svg>
      {oriented ? <RotatingConduit view={view} size={s} clock={clock} flowing={flowing} animate={animate} /> : null}
      {view.overloaded || highlighted ? (
        <Svg width={s} height={s} style={StyleSheet.absoluteFill}>
          {view.overloaded ? (
            <G>
              <Rect x={3} y={3} width={s - 6} height={s - 6} rx={s * 0.2} fill="none" stroke={boardColors.overload} strokeWidth={3} strokeDasharray="6 4" />
              <Circle cx={s - 11} cy={11} r={8} fill={boardColors.overload} />
              <SvgText x={s - 11} y={15.5} fontSize={12} fontWeight="bold" textAnchor="middle" fill="#FFFFFF">
                !
              </SvgText>
            </G>
          ) : null}
          {highlighted ? <Rect x={2} y={2} width={s - 4} height={s - 4} rx={s * 0.2} fill="none" stroke={boardColors.highlight} strokeWidth={4} /> : null}
        </Svg>
      ) : null}
    </View>
  );
});

export function VoltCourierBoard({ state, onAction, highlightIds, disabled }: GameBoardProps<VoltCourierState, VoltCourierAction>) {
  const { width: screenWidth } = useWindowDimensions();
  const reduceMotion = useReduceMotion();
  const haptics = useHaptics();
  const view = useMemo(() => buildBoardView(state), [state]);
  const size = Math.floor(Math.min(MAX_CELL, (screenWidth - spacing.lg * 2 - FRAME_PADDING * 2) / state.width));
  const highlighted = useMemo(() => new Set(highlightIds), [highlightIds]);

  // One clock drives every flowing conduit; stopped entirely under reduced motion.
  const clock = useSharedValue(0);
  const flowing = !reduceMotion && view.cells.some((c) => c.power || c.powerVertical || c.powerHorizontal);
  useEffect(() => {
    if (!flowing) return;
    clock.value = 0;
    clock.value = withRepeat(withTiming(1, { duration: 700, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(clock);
  }, [flowing, clock]);

  return (
    <View style={styles.wrapper}>
      <View accessibilityLabel="Puzzle board" style={[styles.grid, { width: size * state.width }]}>
        {view.cells.map((cv) => {
          const tile = (
            <Tile
              view={cv}
              size={size}
              highlighted={highlighted.has(cellId(cv.index))}
              clock={clock}
              flowing={flowing}
              animate={!reduceMotion}
            />
          );
          if (!isRotatable(cv.cell)) {
            return (
              <View key={cv.index} accessible accessibilityLabel={cv.label} testID={cellId(cv.index)}>
                {tile}
              </View>
            );
          }
          return (
            <Pressable
              key={cv.index}
              testID={cellId(cv.index)}
              accessibilityRole="button"
              accessibilityLabel={cv.label}
              accessibilityHint="Turns this conduit a quarter turn clockwise"
              accessibilityState={{ disabled }}
              disabled={disabled}
              onPress={() => {
                haptics.tap();
                onAction({ type: 'rotate', index: cv.index });
              }}
              style={({ pressed }) => pressed && styles.pressed}
            >
              {tile}
            </Pressable>
          );
        })}
      </View>
      <View accessibilityLiveRegion="polite" style={styles.status}>
        {view.pulseLines.map((line) => (
          <AppText key={line} variant="caption" tone="muted">
            {line}
          </AppText>
        ))}
        {view.overloadLines.map((line) => (
          <AppText key={line} variant="caption" tone="danger">
            {line}
          </AppText>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', gap: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  pressed: { transform: [{ scale: 0.94 }] },
  status: { alignSelf: 'stretch', gap: spacing.xs },
});
