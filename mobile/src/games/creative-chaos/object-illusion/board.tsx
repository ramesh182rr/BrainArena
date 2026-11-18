import { useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Line, Polygon } from 'react-native-svg';

import { AppText, Button, colors, Icon, radii, spacing, useHaptics } from '@/design-system';
import type { GameBoardProps, GameUi } from '@/games/ui';

import { goalMet, goalText, ILLUSION_TUTORIALS, ITEMS, thingId, WARMTH, type Change, type IllusionAction, type IllusionState, type Thing } from './logic';

const WARM_COLOR = ['#4FD1FF', '#B9B2E8', '#FF8A3D'];

function ThingCard({ t, i, selected, onPress, highlighted, disabled }: { t: Thing; i: number; selected: boolean; onPress: () => void; highlighted: boolean; disabled: boolean }) {
  return (
    <Pressable
      testID={thingId(i)}
      accessibilityRole="button"
      accessibilityLabel={`${ITEMS[t.item]}: weight ${t.weight}, ${WARMTH[t.warmth]}, on the ${t.left ? 'left' : 'right'} pan`}
      accessibilityState={{ selected }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.thing, { borderColor: selected ? colors.gold : WARM_COLOR[t.warmth] }, highlighted && styles.highlight]}
    >
      <AppText variant="label">{ITEMS[t.item]}</AppText>
      <View style={styles.dots}>
        {[1, 2, 3].map((k) => (
          <View key={k} style={[styles.dot, k <= t.weight && styles.dotOn]} />
        ))}
      </View>
      <View style={[styles.warm, { backgroundColor: WARM_COLOR[t.warmth] }]}>
        <AppText variant="caption" tone="onGold">
          {WARMTH[t.warmth]}
        </AppText>
      </View>
    </Pressable>
  );
}

function Scale({ state, width }: { state: IllusionState; width: number }) {
  const l = state.things.filter((t) => t.left).reduce((a, t) => a + t.weight, 0);
  const r = state.things.filter((t) => !t.left).reduce((a, t) => a + t.weight, 0);
  const tilt = Math.max(-1, Math.min(1, (r - l) / 3)) * 14;
  const c = width / 2;
  return (
    <Svg width={width} height={70} accessibilityLabel={`Scale: left ${l}, right ${r}`}>
      <Polygon points={`${c - 16},66 ${c + 16},66 ${c},30`} fill="#C98A4A" />
      <Line x1={c - width * 0.4} y1={30 - tilt} x2={c + width * 0.4} y2={30 + tilt} stroke="#E0A458" strokeWidth={6} strokeLinecap="round" />
      <Circle cx={c} cy={30} r={6} fill="#FFFFFF" />
    </Svg>
  );
}

function Board({ state, onAction, highlightIds, disabled }: GameBoardProps<IllusionState, IllusionAction>) {
  const { width } = useWindowDimensions();
  const haptics = useHaptics();
  const [sel, setSel] = useState<number | null>(null);
  const left = state.budget - state.changes;
  const act = (change: Change) => {
    haptics.tap();
    onAction({ type: 'change', change });
  };
  const sideList = (isLeft: boolean) =>
    state.things.map((t, i) => (t.left === isLeft ? <ThingCard key={i} t={t} i={i} selected={sel === i} disabled={disabled} highlighted={highlightIds.includes(thingId(i))} onPress={() => setSel(sel === i ? null : i)} /> : null));
  return (
    <View style={styles.wrapper}>
      <View style={styles.goals}>
        {state.goals.map((g, i) => {
          const ok = goalMet(g, state.things);
          return (
            <View key={i} style={styles.goalRow} accessible accessibilityLabel={`${goalText(g)} ${ok ? 'Met.' : 'Not met yet.'}`}>
              {ok ? <Icon name="check" size={16} color="#5BE38F" /> : <View style={styles.open} />}
              <AppText variant="label" tone={ok ? 'success' : 'primary'}>
                {goalText(g)}
              </AppText>
            </View>
          );
        })}
      </View>
      <Scale state={state} width={Math.min(320, width - spacing.lg * 4)} />
      <View style={styles.pans}>
        <View style={styles.pan}>
          <AppText variant="caption" tone="muted">
            Left pan
          </AppText>
          {sideList(true)}
        </View>
        <View style={styles.pan}>
          <AppText variant="caption" tone="muted">
            Right pan
          </AppText>
          {sideList(false)}
        </View>
      </View>
      {sel !== null && state.things[sel] ? (
        <View style={styles.tools}>
          <Button label="Heavier" variant="secondary" size="sm" disabled={disabled || left === 0 || state.things[sel]!.weight >= 3} onPress={() => act({ k: 'weight', obj: sel, delta: 1 })} />
          <Button label="Lighter" variant="secondary" size="sm" disabled={disabled || left === 0 || state.things[sel]!.weight <= 1} onPress={() => act({ k: 'weight', obj: sel, delta: -1 })} />
          <Button label="Warmer" variant="secondary" size="sm" disabled={disabled || left === 0 || state.things[sel]!.warmth >= 2} onPress={() => act({ k: 'warmth', obj: sel, delta: 1 })} />
          <Button label="Cooler" variant="secondary" size="sm" disabled={disabled || left === 0 || state.things[sel]!.warmth <= 0} onPress={() => act({ k: 'warmth', obj: sel, delta: -1 })} />
          {state.allowMove ? <Button label="Other pan" variant="secondary" size="sm" disabled={disabled || left === 0} onPress={() => act({ k: 'move', obj: sel })} /> : null}
        </View>
      ) : (
        <AppText variant="caption" tone="secondary" style={styles.center}>
          Tap an object to change it.
        </AppText>
      )}
      <AppText variant="label" tone={left === 0 ? 'danger' : 'gold'}>
        {left} change{left === 1 ? '' : 's'} left
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', gap: spacing.md, alignSelf: 'stretch' },
  center: { textAlign: 'center', alignSelf: 'stretch' },
  goals: { alignSelf: 'stretch', gap: spacing.xs, padding: spacing.sm, borderRadius: radii.md, backgroundColor: 'rgba(10,6,30,0.45)' },
  goalRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  open: { width: 12, height: 12, margin: 2, borderRadius: 6, borderWidth: 2, borderStyle: 'solid', borderColor: 'rgba(255,255,255,0.5)' },
  pans: { flexDirection: 'row', gap: spacing.md, alignSelf: 'stretch' },
  pan: { flex: 1, gap: spacing.xs, alignItems: 'stretch' },
  thing: { gap: 4, padding: spacing.sm, borderRadius: radii.md, backgroundColor: colors.surface, borderWidth: 2, borderStyle: 'solid', alignItems: 'center' },
  highlight: { borderColor: '#FFE58A', borderWidth: 4 },
  dots: { flexDirection: 'row', gap: 4 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.2)' },
  dotOn: { backgroundColor: '#FFFFFF' },
  warm: { paddingHorizontal: spacing.sm, borderRadius: radii.pill },
  tools: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.xs },
});

export const objectIllusionUi: GameUi<IllusionState, IllusionAction> = {
  gameId: 'W6-G03',
  howToPlay: [
    'Objects sit on the two pans of a scale. Each has a weight (the dots) and a warmth: cold, mild or hot.',
    'Tap an object and change one thing: heavier, lighter, warmer or cooler. Later scenes let you move it to the other pan.',
    'Meet every goal at once before the changes run out.',
    'Undo and reset are always free.',
  ],
  tutorials: ILLUSION_TUTORIALS.map((t) => ({ seed: t.id, difficulty: t.difficulty, intro: t.intro })),
  Board,
  statusLine: (s) => `Changes ${s.changes}/${s.budget} · Par ${s.par}`,
  levelNote: (s) => (s.allowMove ? 'You can move objects between pans here.' : null),
  successMessage: () => 'Every goal is met. What an illusion!',
  scoreExplanation: (s, { hintsUsed }) => `100 for meeting every goal. ${s.changes} change${s.changes === 1 ? '' : 's'} against a par of ${s.par}${hintsUsed ? `, ${hintsUsed} hint${hintsUsed === 1 ? '' : 's'}` : ''}.`,
  starsFor: (score) => (score >= 140 ? 3 : score >= 120 ? 2 : 1),
  undoAction: { type: 'undo' },
  resetAction: { type: 'reset' },
};
