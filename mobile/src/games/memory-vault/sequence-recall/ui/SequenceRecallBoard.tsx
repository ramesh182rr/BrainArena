import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { AppText, Button, colors, Icon, radii, spacing, useHaptics } from '@/design-system';
import type { GameBoardProps } from '@/games/ui';

import { placeId, symbolId } from '../module';
import { currentRound, PLACE_NAMES, usesSymbols } from '../rules';
import { CHANNEL_INSTRUCTION, SYMBOL_LABEL, type RecallAction, type RecallState } from '../types';
import { SymbolGlyph } from './SymbolGlyph';
import { recallColors } from './theme';
import { itemLabel, roundTitle, valueLabel } from './view';

type Props = GameBoardProps<RecallState, RecallAction>;

/** Runs the timed show; stops while paused and restarts from the first item on resume. */
function useShow(state: RecallState, disabled: boolean, onDone: () => void): number | null {
  const [lit, setLit] = useState<{ key: string; index: number | null }>({ key: '', index: null });
  const key = `${state.round}/${state.attempt}`;
  const active = state.phase === 'showing' && !disabled;
  useEffect(() => {
    if (!active) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const on = Math.round(state.showMs * 0.75);
    state.sequence.forEach((_, i) => {
      timers.push(setTimeout(() => setLit({ key, index: i }), 350 + i * state.showMs));
      timers.push(setTimeout(() => setLit({ key, index: null }), 350 + i * state.showMs + on));
    });
    timers.push(setTimeout(onDone, 350 + state.sequence.length * state.showMs));
    return () => timers.forEach(clearTimeout);
  }, [active, key, state.sequence, state.showMs, onDone]);
  return active && lit.key === key ? lit.index : null;
}

function PadGrid({
  state,
  size,
  litIndex,
  interactive,
  highlightIds,
  onTap,
}: {
  state: RecallState;
  size: number;
  litIndex: number | null;
  interactive: boolean;
  highlightIds: readonly string[];
  onTap?: (place: number) => void;
}) {
  const litItem = litIndex === null ? null : state.sequence[litIndex];
  const pads = state.gridSize * state.gridSize;
  return (
    <View style={[styles.grid, { width: size * state.gridSize + spacing.sm * (state.gridSize - 1) }]}>
      {Array.from({ length: pads }, (_, place) => {
        const lit = litItem?.place === place;
        const content = lit && litItem ? <SymbolGlyph symbol={state.palette[litItem.symbol]!} size={size * 0.62} /> : null;
        const style = [styles.pad, { width: size, height: size }, lit && styles.padLit, highlightIds.includes(placeId(place)) && styles.highlighted];
        if (!interactive) {
          return (
            <View key={place} style={style} accessibilityElementsHidden>
              {content}
            </View>
          );
        }
        return (
          <Pressable
            key={place}
            testID={placeId(place)}
            accessibilityRole="button"
            accessibilityLabel={`Place: ${PLACE_NAMES[state.gridSize][place]}`}
            onPress={() => onTap?.(place)}
            style={({ pressed }) => [...style, pressed && styles.pressed]}
          />
        );
      })}
    </View>
  );
}

function AnswerSlots({ state }: { state: RecallState }) {
  const round = currentRound(state)!;
  const symbols = usesSymbols(round.channel);
  return (
    <View style={styles.slots} accessible accessibilityLabel={`${state.answer.length} of ${round.length} answered`}>
      {Array.from({ length: round.length }, (_, i) => {
        const v = state.answer[i];
        return (
          <View key={i} style={[styles.slot, v !== undefined && styles.slotFilled]}>
            {v === undefined ? null : symbols ? (
              <SymbolGlyph symbol={state.palette[v]!} size={22} />
            ) : (
              <AppText variant="caption">{v + 1}</AppText>
            )}
          </View>
        );
      })}
    </View>
  );
}

function Feedback({ state }: { state: RecallState }) {
  const r = state.lastResult;
  if (!r) return null;
  if (r.correct) {
    return (
      <AppText variant="heading" tone="success" style={styles.center} accessibilityLiveRegion="polite">
        Perfect recall!
      </AppText>
    );
  }
  return (
    <View style={styles.feedback} accessibilityLiveRegion="polite">
      <AppText variant="heading" tone="danger" style={styles.center}>
        Not quite. Here is how it went:
      </AppText>
      {r.expected.map((v, i) => {
        const ok = r.given[i] === v;
        return (
          <View key={i} style={styles.compareRow} accessible accessibilityLabel={`Step ${i + 1}: needed ${valueLabel(state, v)}, you chose ${valueLabel(state, r.given[i]!)}.`}>
            <Icon name={ok ? 'check' : 'cross'} size={18} color={ok ? recallColors.right : recallColors.wrong} />
            <AppText variant="caption" tone="secondary">
              {i + 1}. needed {valueLabel(state, v)}
              {ok ? '' : `, you chose ${valueLabel(state, r.given[i]!)}`}
            </AppText>
          </View>
        );
      })}
      <AppText variant="caption" tone="muted" style={styles.center}>
        You will get a fresh sequence of the same length.
      </AppText>
    </View>
  );
}

export function SequenceRecallBoard({ state, onAction, highlightIds, disabled }: Props) {
  const { width } = useWindowDimensions();
  const haptics = useHaptics();
  const padSize = Math.floor(Math.min(state.gridSize === 2 ? 120 : 92, (width - spacing.lg * 2 - spacing.md * 2 - spacing.sm * (state.gridSize - 1)) / state.gridSize));
  const [onShown] = useState(() => () => onAction({ type: 'shown' }));
  const litIndex = useShow(state, disabled, onShown);
  const round = currentRound(state);
  const input = (value: number) => {
    haptics.tap();
    onAction({ type: 'input', value });
  };

  if (state.phase === 'ready' || state.phase === 'feedback' || state.done) {
    return (
      <View style={styles.wrapper}>
        {state.phase === 'feedback' ? <Feedback state={state} /> : null}
        {!state.done && round ? (
          <View style={styles.card}>
            <AppText variant="label" tone="gold">
              {roundTitle(state)}
            </AppText>
            <AppText style={styles.center}>Watch closely. Afterwards: {CHANNEL_INSTRUCTION[round.channel]}</AppText>
            <Button label={state.phase === 'feedback' && !state.lastResult?.correct ? 'Try a fresh sequence' : 'Watch'} variant="play" disabled={disabled} onPress={() => onAction({ type: 'watch' })} style={styles.stretch} />
          </View>
        ) : null}
      </View>
    );
  }

  if (state.phase === 'showing') {
    const item = litIndex === null ? null : state.sequence[litIndex];
    return (
      <View style={styles.wrapper}>
        <AppText variant="label" tone="gold">
          Watch… {litIndex === null ? '' : `${litIndex + 1} / ${state.sequence.length}`}
        </AppText>
        <PadGrid state={state} size={padSize} litIndex={litIndex} interactive={false} highlightIds={[]} />
        <AppText tone="secondary" accessibilityLiveRegion="assertive" style={[styles.center, styles.caption]}>
          {item ? itemLabel(state, item) : disabled ? 'Paused. The show restarts when you resume.' : ' '}
        </AppText>
      </View>
    );
  }

  // Answer phase.
  const channel = round!.channel;
  return (
    <View style={styles.wrapper}>
      <AppText variant="label" tone="gold" style={styles.center}>
        {CHANNEL_INSTRUCTION[channel]}
      </AppText>
      <AnswerSlots state={state} />
      {usesSymbols(channel) ? (
        <View style={styles.keys} accessibilityLabel="Symbol keys">
          {state.palette.map((sym, i) => (
            <Pressable
              key={sym}
              testID={symbolId(i)}
              accessibilityRole="button"
              accessibilityLabel={`Symbol: ${SYMBOL_LABEL[sym]}`}
              disabled={disabled}
              onPress={() => input(i)}
              style={({ pressed }) => [styles.key, highlightIds.includes(symbolId(i)) && styles.highlighted, pressed && styles.pressed]}
            >
              <SymbolGlyph symbol={sym} size={40} />
              <AppText variant="caption" tone="secondary">
                {SYMBOL_LABEL[sym]}
              </AppText>
            </Pressable>
          ))}
        </View>
      ) : (
        <PadGrid state={state} size={padSize} litIndex={null} interactive={!disabled} highlightIds={highlightIds} onTap={input} />
      )}
      <Button label="Remove last" variant="secondary" size="sm" disabled={disabled || state.answer.length === 0} onPress={() => onAction({ type: 'undoInput' })} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', gap: spacing.md },
  center: { textAlign: 'center' },
  caption: { minHeight: 24 },
  stretch: { alignSelf: 'stretch' },
  card: { alignSelf: 'stretch', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: radii.md, backgroundColor: 'rgba(10,6,30,0.45)' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  pad: {
    borderRadius: radii.md,
    backgroundColor: recallColors.pad,
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: recallColors.padBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  padLit: { backgroundColor: recallColors.padLit, borderColor: '#FFFFFF' },
  highlighted: { borderColor: recallColors.highlight, borderWidth: 4 },
  pressed: { transform: [{ scale: 0.94 }] },
  slots: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap', justifyContent: 'center' },
  slot: { width: 34, height: 34, borderRadius: 17, backgroundColor: recallColors.slot, alignItems: 'center', justifyContent: 'center' },
  slotFilled: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.gold },
  keys: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' },
  key: {
    width: 92,
    minHeight: 84,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: radii.md,
    backgroundColor: recallColors.pad,
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: recallColors.padBorder,
  },
  feedback: { alignSelf: 'stretch', gap: spacing.xs },
  compareRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
