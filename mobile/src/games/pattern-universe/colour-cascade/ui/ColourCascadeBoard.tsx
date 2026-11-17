import { memo, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { AppText, colors, radii, spacing, useHaptics, useReduceMotion } from '@/design-system';
import type { GameBoardProps } from '@/games/ui';

import { plotId } from '../module';
import { canDrop, inBloom, prey } from '../rules';
import { BLOOM_INFO, type Bloom, type CascadeAction, type CascadeState, type GardenCell } from '../types';
import { Glyph } from './Glyph';
import { bloomColors, gardenColors } from './theme';
import { cycleSentence, plotLabel, waveSummary } from './view';

const MAX_PLOT = 70;
const GAP = 4;

const Plot = memo(function Plot({
  cell,
  index,
  size,
  waveStep,
  waveKey,
  highlighted,
  label,
  disabled,
  onTap,
}: {
  cell: GardenCell;
  index: number;
  size: number;
  /** Position in the latest cascade, or -1. */
  waveStep: number;
  waveKey: number;
  highlighted: boolean;
  label: string;
  disabled: boolean;
  onTap: (index: number) => void;
}) {
  const reduceMotion = useReduceMotion();
  const scale = useSharedValue(1);
  useEffect(() => {
    if (waveStep >= 0 && waveKey > 0 && !reduceMotion) {
      scale.value = withDelay(waveStep * 70, withSequence(withTiming(0.7, { duration: 90 }), withSpring(1, { damping: 8 })));
    }
  }, [waveStep, waveKey, reduceMotion, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  if (cell.t === 'stone') {
    return (
      <View accessible accessibilityLabel={label} testID={plotId(index)} style={[styles.plot, { width: size, height: size, backgroundColor: gardenColors.stoneDark }]}>
        <View style={[styles.stone, { width: size * 0.62, height: size * 0.48, borderRadius: size * 0.2 }]} />
      </View>
    );
  }
  return (
    <Pressable
      testID={plotId(index)}
      accessibilityRole={cell.pad ? 'button' : undefined}
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => onTap(index)}
      style={[styles.plot, { width: size, height: size }, cell.pad && styles.pad, highlighted && styles.highlighted]}
    >
      <Animated.View
        style={[
          styles.bloom,
          { width: size * 0.78, height: size * 0.78, borderRadius: size * 0.39, backgroundColor: bloomColors[cell.colour] },
          cell.hardy && styles.shell,
          style,
        ]}
      >
        <Glyph bloom={cell.colour} size={size * 0.46} color={gardenColors.glyph} />
      </Animated.View>
    </Pressable>
  );
});

export function ColourCascadeBoard({ state, onAction, highlightIds, disabled }: GameBoardProps<CascadeState, CascadeAction>) {
  const { width: screenWidth } = useWindowDimensions();
  const haptics = useHaptics();
  const size = Math.floor(Math.min(MAX_PLOT, (screenWidth - spacing.lg * 2 - spacing.md * 2 - GAP * (state.width - 1)) / state.width));
  const available = state.cycle.filter((c) => (state.inventory[c] ?? 0) > 0);
  const [chosen, setChosen] = useState<Bloom | null>(null);
  const selected = chosen && (state.inventory[chosen] ?? 0) > 0 ? chosen : (available[0] ?? null);
  const [note, setNote] = useState<{ text: string; at: number } | null>(null);
  const highlighted = useMemo(() => new Set(highlightIds), [highlightIds]);
  const waveOrder = useMemo(() => new Map(state.lastWave.map((i, k) => [i, k])), [state.lastWave]);
  const previous = state.history[state.history.length - 1];
  const summary = waveSummary(previous ? ({ ...state, ...previous } as CascadeState) : null, state);
  const stuck = available.length === 0 && !inBloom(state.cells);
  const message =
    note?.at === state.drops.length
      ? note.text
      : stuck
        ? `${summary ?? ''} Out of droplets: undo or reset to try another order.`.trim()
        : summary;

  const tap = (index: number) => {
    const cell = state.cells[index];
    if (!cell || cell.t !== 'plant') return;
    if (!cell.pad) {
      haptics.warning();
      setNote({ text: 'Droplets only go on watering pads (the dashed gold rings).', at: state.drops.length });
      return;
    }
    if (!selected) {
      setNote({ text: 'No droplets left. Undo or reset to try another order.', at: state.drops.length });
      return;
    }
    if (canDrop(state, index, selected)) {
      haptics.impact();
      onAction({ type: 'drop', index, colour: selected });
    }
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.legend} accessible accessibilityLabel={`Feeding cycle: ${cycleSentence(state)}`}>
        {state.cycle.map((c, i) => (
          <View key={c} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: bloomColors[c] }]}>
              <Glyph bloom={c} size={18} color={gardenColors.glyph} />
            </View>
            <AppText variant="caption" tone="secondary">
              {i < state.cycle.length - 1 ? '›' : `› ${BLOOM_INFO[prey(state.cycle, c)].label}`}
            </AppText>
          </View>
        ))}
      </View>
      <AppText variant="caption" tone="muted" style={styles.center}>
        Each colour eats the next one along.
      </AppText>

      <View accessibilityLabel="Garden" style={[styles.grid, { width: size * state.width + GAP * (state.width - 1), gap: GAP }]}>
        {state.cells.map((cell, index) => (
          <Plot
            key={index}
            cell={cell}
            index={index}
            size={size}
            waveStep={waveOrder.get(index) ?? -1}
            waveKey={state.drops.length}
            highlighted={highlighted.has(plotId(index))}
            label={plotLabel(state, index)}
            disabled={disabled}
            onTap={tap}
          />
        ))}
      </View>

      <AppText variant="caption" tone={note?.at === state.drops.length || stuck ? 'danger' : 'secondary'} accessibilityLiveRegion="polite" style={[styles.center, styles.message]}>
        {message ?? 'Pick a droplet, then tap a watering pad.'}
      </AppText>

      <View accessibilityRole="radiogroup" accessibilityLabel="Droplets" style={styles.tray}>
        {state.cycle.map((c) => {
          const count = state.inventory[c] ?? 0;
          const isSelected = selected === c;
          return (
            <Pressable
              key={c}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected, disabled: count === 0 || disabled }}
              accessibilityLabel={`${BLOOM_INFO[c].label} droplets: ${count}`}
              disabled={count === 0 || disabled}
              onPress={() => {
                haptics.tap();
                setChosen(c);
              }}
              style={[styles.droplet, isSelected && styles.dropletSelected, count === 0 && styles.dropletEmpty]}
            >
              <View style={[styles.dropletDot, { backgroundColor: bloomColors[c] }]}>
                <Glyph bloom={c} size={22} color={gardenColors.glyph} />
              </View>
              <AppText variant="label" tone={isSelected ? 'onGold' : 'primary'}>
                ×{count}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', gap: spacing.md },
  center: { textAlign: 'center' },
  message: { minHeight: 20 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap', justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  legendDot: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  plot: {
    borderRadius: radii.sm,
    backgroundColor: gardenColors.soil,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: 'rgba(255,255,255,0.06)',
  },
  pad: { borderColor: gardenColors.pad, borderStyle: 'dashed', borderWidth: 2.5 },
  highlighted: { borderColor: gardenColors.highlight, borderStyle: 'solid', borderWidth: 4 },
  bloom: { alignItems: 'center', justifyContent: 'center' },
  shell: { borderWidth: 4, borderColor: gardenColors.shell },
  stone: { backgroundColor: gardenColors.stone },
  tray: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', justifyContent: 'center' },
  droplet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 52,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glass,
  },
  dropletSelected: { backgroundColor: colors.gold, borderColor: '#FFFFFF' },
  dropletEmpty: { opacity: 0.35 },
  dropletDot: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
