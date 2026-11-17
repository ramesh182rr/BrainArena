import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

import { AppText, colors, spacing } from '@/design-system';
import type { GameBoardProps } from '@/games/ui';

import { isRotatable, openSides } from '../grid';
import { cellId } from '../module';
import { PULSE_KIND_INFO, type ArrowEscapeAction, type ArrowEscapeState, type Dir } from '../types';
import { boardColors, pulseColors } from './theme';
import { buildBoardView, type CellView } from './view';

const MAX_CELL = 72;

/** Offset from the centre to the middle of side `d`, for a tile of size `s`. */
function edge(d: Dir, s: number): { x: number; y: number } {
  const h = s / 2;
  return [
    { x: h, y: 0 },
    { x: s, y: h },
    { x: h, y: s },
    { x: 0, y: h },
  ][d] as { x: number; y: number };
}

const TileGraphic = memo(function TileGraphic({ view, size, highlighted }: { view: CellView; size: number; highlighted: boolean }) {
  const { cell, rotation } = view;
  const s = size;
  const c = s / 2;
  const stroke = Math.max(4, s * 0.18);
  const fixed = cell.t === 'cross' || cell.t === 'gate' || cell.t === 'emitter' || cell.t === 'receiver' || ((cell.t === 'straight' || cell.t === 'bend') && cell.locked);
  const conduitColor = (k: typeof view.power) => (k ? pulseColors[k] : boardColors.conduit);

  const arms = (sides: readonly Dir[], color: string) =>
    sides.map((d) => {
      const e = edge(d, s);
      return <Line key={d} x1={c} y1={c} x2={e.x} y2={e.y} stroke={color} strokeWidth={stroke} strokeLinecap="round" />;
    });

  let body: React.ReactNode = null;
  if (cell.t === 'straight' || cell.t === 'bend' || cell.t === 'gate') {
    const sides = openSides(cell, rotation) ?? [];
    const color = conduitColor(view.power);
    body = (
      <G>
        {arms(sides, color)}
        <Circle cx={c} cy={c} r={stroke / 2} fill={color} />
        {cell.t === 'gate' ? (
          <G>
            <Rect x={c - s * 0.2} y={c - s * 0.2} width={s * 0.4} height={s * 0.4} rx={4} fill={boardColors.tile} stroke={pulseColors[cell.kind]} strokeWidth={3} />
            <SvgText x={c} y={c + s * 0.09} fontSize={s * 0.26} fontWeight="bold" textAnchor="middle" fill={pulseColors[cell.kind]}>
              {PULSE_KIND_INFO[cell.kind].symbol}
            </SvgText>
          </G>
        ) : null}
      </G>
    );
  } else if (cell.t === 'cross') {
    body = (
      <G>
        {arms([1, 3], conduitColor(view.powerHorizontal))}
        {arms([0, 2], conduitColor(view.powerVertical))}
      </G>
    );
  } else if (cell.t === 'emitter') {
    const tip = edge(cell.dir, s);
    const color = pulseColors[cell.kind];
    // Small wedge pointing the firing direction.
    const angle = (cell.dir * Math.PI) / 2;
    const wx = (dx: number, dy: number) => c + dx * Math.cos(angle) - dy * Math.sin(angle);
    const wy = (dx: number, dy: number) => c + dx * Math.sin(angle) + dy * Math.cos(angle);
    const r = s * 0.3;
    body = (
      <G>
        <Line x1={c} y1={c} x2={tip.x} y2={tip.y} stroke={color} strokeWidth={stroke} strokeLinecap="round" />
        <Path d={`M ${wx(0, -s * 0.48)} ${wy(0, -s * 0.48)} L ${wx(-s * 0.16, -s * 0.3)} ${wy(-s * 0.16, -s * 0.3)} L ${wx(s * 0.16, -s * 0.3)} ${wy(s * 0.16, -s * 0.3)} Z`} fill={color} />
        <Circle cx={c} cy={c} r={r} fill={color} />
        <SvgText x={c} y={c + s * 0.1} fontSize={s * 0.3} fontWeight="bold" textAnchor="middle" fill={boardColors.onPulse}>
          {PULSE_KIND_INFO[cell.kind].symbol}
        </SvgText>
      </G>
    );
  } else if (cell.t === 'receiver') {
    const color = pulseColors[cell.kind];
    const inset = s * 0.16;
    body = (
      <G>
        <Rect x={inset} y={inset} width={s - inset * 2} height={s - inset * 2} rx={s * 0.14} fill={view.satisfied ? color : boardColors.tile} stroke={color} strokeWidth={4} />
        <SvgText x={c} y={c + s * 0.1} fontSize={s * 0.3} fontWeight="bold" textAnchor="middle" fill={view.satisfied ? boardColors.onPulse : color}>
          {PULSE_KIND_INFO[cell.kind].symbol}
        </SvgText>
      </G>
    );
  } else {
    body = <Circle cx={c} cy={c} r={2} fill={boardColors.tileBorder} />;
  }

  return (
    <Svg width={s} height={s}>
      {cell.t !== 'empty' ? (
        <Rect x={1} y={1} width={s - 2} height={s - 2} rx={s * 0.16} fill={fixed ? boardColors.fixedTile : boardColors.tile} stroke={boardColors.tileBorder} strokeWidth={1.5} />
      ) : null}
      {body}
      {view.overloaded ? (
        <G>
          <Rect x={2} y={2} width={s - 4} height={s - 4} rx={s * 0.16} fill="none" stroke={boardColors.overload} strokeWidth={3} strokeDasharray="6 4" />
          <SvgText x={s - 9} y={15} fontSize={13} fontWeight="bold" textAnchor="middle" fill={boardColors.overload}>
            !
          </SvgText>
        </G>
      ) : null}
      {highlighted ? (
        <Rect x={2} y={2} width={s - 4} height={s - 4} rx={s * 0.16} fill="none" stroke={boardColors.highlight} strokeWidth={4} />
      ) : null}
    </Svg>
  );
});

export function ArrowEscapeBoard({ state, onAction, highlightIds, disabled }: GameBoardProps<ArrowEscapeState, ArrowEscapeAction>) {
  const { width: screenWidth } = useWindowDimensions();
  const view = useMemo(() => buildBoardView(state), [state]);
  const size = Math.floor(Math.min(MAX_CELL, (screenWidth - spacing.lg * 2) / state.width));
  const highlighted = useMemo(() => new Set(highlightIds), [highlightIds]);

  return (
    <View style={styles.wrapper}>
      <View accessibilityLabel="Puzzle board" style={[styles.grid, { width: size * state.width }]}>
        {view.cells.map((cv) => {
          const graphic = <TileGraphic view={cv} size={size} highlighted={highlighted.has(cellId(cv.index))} />;
          if (!isRotatable(cv.cell)) {
            return (
              <View key={cv.index} accessible accessibilityLabel={cv.label} testID={cellId(cv.index)} style={{ width: size, height: size }}>
                {graphic}
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
              onPress={() => onAction({ type: 'rotate', index: cv.index })}
              style={({ pressed }) => [{ width: size, height: size }, pressed && styles.pressed]}
            >
              {graphic}
            </Pressable>
          );
        })}
      </View>
      <View accessibilityLiveRegion="polite" style={styles.status}>
        {view.pulseLines.map((line) => (
          <AppText key={line} variant="caption" tone="secondary">
            {line}
          </AppText>
        ))}
        {view.overloadLines.map((line) => (
          <AppText key={line} variant="caption" style={styles.overload}>
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
  pressed: { opacity: 0.7 },
  status: { alignSelf: 'stretch', gap: spacing.xs },
  overload: { color: colors.danger },
});
