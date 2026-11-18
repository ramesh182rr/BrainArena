import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Polygon, Rect } from 'react-native-svg';

import { AppText, Button, colors, Icon, radii, spacing, useHaptics } from '@/design-system';
import type { GameBoardProps, GameUi } from '@/games/ui';

import { CHANGED_TUTORIALS, changedCells, objName, squareId, type ChangedAction, type ChangedState, type Hue, type Obj, type Scene } from './logic';

const HUE: Record<Hue, string> = { red: '#FF6B6B', blue: '#4FA3FF', green: '#5BE38F', yellow: '#FFD23F', purple: '#C08CFF' };
const RIGHT = '#5BE38F';
const WRONG = '#FF7A7A';

function polygon(n: number, c: number, r: number, rot = -Math.PI / 2, inner?: number) {
  const pts: string[] = [];
  const count = inner ? n * 2 : n;
  for (let i = 0; i < count; i += 1) {
    const rr = inner && i % 2 ? inner : r;
    const a = rot + (i * 2 * Math.PI) / count;
    pts.push(`${c + rr * Math.cos(a)},${c + rr * Math.sin(a)}`);
  }
  return pts.join(' ');
}

export function ShapeGlyph({ obj, size }: { obj: Obj; size: number }) {
  const c = size / 2;
  const r = size * 0.36;
  const p = { fill: HUE[obj.hue], stroke: '#1A1245', strokeWidth: 2 };
  return (
    <Svg width={size} height={size}>
      {obj.shape === 'circle' ? <Circle cx={c} cy={c} r={r} {...p} /> : null}
      {obj.shape === 'square' ? <Rect x={c - r * 0.85} y={c - r * 0.85} width={r * 1.7} height={r * 1.7} rx={3} {...p} /> : null}
      {obj.shape === 'triangle' ? <Polygon points={polygon(3, c, r * 1.1, -Math.PI / 2)} {...p} /> : null}
      {obj.shape === 'diamond' ? <Polygon points={polygon(4, c, r * 1.05, -Math.PI / 2)} {...p} /> : null}
      {obj.shape === 'star' ? <Polygon points={polygon(5, c, r * 1.1, -Math.PI / 2, r * 0.48)} {...p} /> : null}
      {obj.shape === 'hexagon' ? <Polygon points={polygon(6, c, r, 0)} {...p} /> : null}
    </Svg>
  );
}

/** Study timer: ends the study after studyMs; stops while paused and restarts on resume. */
function useStudy(state: ChangedState, disabled: boolean, onDone: () => void): number {
  const active = state.phase === 'study' && !disabled;
  const key = `${state.round}/${state.attempt}`;
  const [left, setLeft] = useState({ key: '', ms: state.studyMs });
  useEffect(() => {
    if (!active) return;
    const started = Date.now();
    const tick = setInterval(() => setLeft({ key, ms: Math.max(0, state.studyMs - (Date.now() - started)) }), 100);
    const done = setTimeout(onDone, state.studyMs);
    return () => {
      clearInterval(tick);
      clearTimeout(done);
    };
  }, [active, key, state.studyMs, onDone]);
  return left.key === key && active ? left.ms : state.studyMs;
}

function SceneGrid({
  state,
  scene,
  size,
  onTap,
  marks = [],
  reveal = false,
  highlightIds = [],
}: {
  state: ChangedState;
  scene: Scene;
  size: number;
  onTap?: ((cell: number) => void) | undefined;
  marks?: readonly number[];
  reveal?: boolean;
  highlightIds?: readonly string[];
}) {
  const changed = changedCells(state.changes);
  return (
    <View style={[styles.grid, { width: size * state.grid + 4 }]}>
      {scene.map((obj, i) => {
        const marked = marks.includes(i);
        const ring = reveal ? (changed.includes(i) ? RIGHT : marked ? WRONG : null) : marked ? colors.gold : null;
        const label = `${obj ? objName(obj) : 'Empty'}${marked ? ', marked' : ''}${reveal && changed.includes(i) ? ', changed' : ''}`;
        const style = [styles.cell, { width: size, height: size }, ring ? { borderColor: ring, borderWidth: 3 } : null, highlightIds.includes(squareId(i)) && styles.highlight];
        const content = obj ? <ShapeGlyph obj={obj} size={size * 0.8} /> : null;
        return onTap ? (
          <Pressable key={i} testID={squareId(i)} accessibilityRole="button" accessibilityLabel={`${label}. Tap to mark as changed.`} accessibilityState={{ selected: marked }} onPress={() => onTap(i)} style={style}>
            {content}
            {marked ? <View style={styles.flag} /> : null}
          </Pressable>
        ) : (
          <View key={i} accessible accessibilityLabel={label} style={style}>
            {content}
          </View>
        );
      })}
    </View>
  );
}

function Board({ state, onAction, highlightIds, disabled }: GameBoardProps<ChangedState, ChangedAction>) {
  const { width } = useWindowDimensions();
  const haptics = useHaptics();
  const size = Math.floor(Math.min(state.grid === 3 ? 92 : state.grid === 4 ? 74 : 60, (width - spacing.lg * 2 - spacing.md * 2 - 4) / state.grid));
  const [onStudied] = useState(() => () => onAction({ type: 'studied' }));
  const left = useStudy(state, disabled, onStudied);
  const target = changedCells(state.changes).length;
  const roundTitle = `Round ${Math.min(state.round + 1, state.rounds.length)} of ${state.rounds.length}`;

  if (state.phase === 'study') {
    return (
      <View style={styles.wrapper}>
        <AppText variant="label" tone="gold">
          Memorise the scene
        </AppText>
        <View style={styles.timer}>
          <View style={[styles.timerFill, { width: `${(left / state.studyMs) * 100}%` }]} />
        </View>
        <SceneGrid state={state} scene={state.before} size={size} />
        <AppText variant="caption" tone="secondary" style={styles.center}>
          {disabled ? 'Paused. The study restarts when you resume.' : `${Math.ceil(left / 1000)} s`}
        </AppText>
        <Button label="I'm ready" variant="secondary" size="sm" disabled={disabled} onPress={() => onAction({ type: 'studied' })} />
      </View>
    );
  }

  if (state.phase === 'spot') {
    return (
      <View style={styles.wrapper}>
        <AppText variant="label" tone="gold" style={styles.center}>
          {target} square{target === 1 ? '' : 's'} changed. Tap them.
        </AppText>
        <SceneGrid
          state={state}
          scene={state.after}
          size={size}
          marks={state.marks}
          highlightIds={highlightIds}
          onTap={
            disabled
              ? undefined
              : (cell) => {
                  haptics.tap();
                  onAction({ type: 'toggle', cell });
                }
          }
        />
        <AppText variant="caption" tone="secondary">
          Marked {state.marks.length} of {target}
        </AppText>
        <Button label="Check" variant="play" size="sm" disabled={disabled || state.marks.length !== target} onPress={() => onAction({ type: 'check' })} />
      </View>
    );
  }

  const r = state.lastResult;
  return (
    <View style={styles.wrapper}>
      {state.phase === 'feedback' && r ? (
        <View style={styles.feedback} accessibilityLiveRegion="polite">
          <AppText variant="heading" tone={r.correct ? 'success' : 'danger'} style={styles.center}>
            {r.correct ? 'Sharp eyes!' : 'Not quite. Here is what changed:'}
          </AppText>
          {!r.correct ? (
            <>
              <View style={styles.compare}>
                <View style={styles.side}>
                  <AppText variant="caption" tone="secondary">
                    Before
                  </AppText>
                  <SceneGrid state={state} scene={state.before} size={Math.floor(size * 0.55)} />
                </View>
                <View style={styles.side}>
                  <AppText variant="caption" tone="secondary">
                    After
                  </AppText>
                  <SceneGrid state={state} scene={state.after} size={Math.floor(size * 0.55)} marks={r.marks} reveal />
                </View>
              </View>
              {state.changes.map((c, i) => (
                <View key={i} style={styles.row}>
                  <Icon name={c.cells.every((x) => r.marks.includes(x)) ? 'check' : 'cross'} size={16} color={c.cells.every((x) => r.marks.includes(x)) ? RIGHT : WRONG} />
                  <AppText variant="caption" tone="secondary">
                    {c.text}
                  </AppText>
                </View>
              ))}
              <AppText variant="caption" tone="muted" style={styles.center}>
                Green rings: changed squares. Red: wrong marks. You will get a fresh scene.
              </AppText>
            </>
          ) : null}
        </View>
      ) : null}
      {!state.done ? (
        <View style={styles.card}>
          <AppText variant="label" tone="gold">
            {roundTitle}
          </AppText>
          <AppText style={styles.center}>
            Study {state.rounds[state.round]!.objects} shapes for {Math.round(state.studyMs / 1000)} seconds. Then spot what changed.
          </AppText>
          <Button label={r && !r.correct ? 'Try a fresh scene' : 'Study'} variant="play" disabled={disabled} onPress={() => onAction({ type: 'watch' })} style={styles.stretch} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', gap: spacing.md },
  center: { textAlign: 'center' },
  stretch: { alignSelf: 'stretch' },
  card: { alignSelf: 'stretch', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: radii.md, backgroundColor: 'rgba(10,6,30,0.45)' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 2, borderRadius: radii.md, backgroundColor: '#1F1656' },
  cell: { alignItems: 'center', justifyContent: 'center', borderRadius: radii.sm, borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'transparent' },
  highlight: { borderColor: '#FFE58A', borderWidth: 4 },
  flag: { position: 'absolute', top: 4, right: 4, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.gold },
  timer: { alignSelf: 'stretch', height: 8, borderRadius: 4, backgroundColor: colors.glass, overflow: 'hidden' },
  timerFill: { height: 8, backgroundColor: colors.gold },
  feedback: { alignSelf: 'stretch', gap: spacing.xs, alignItems: 'center' },
  compare: { flexDirection: 'row', gap: spacing.md, justifyContent: 'center' },
  side: { alignItems: 'center', gap: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, alignSelf: 'stretch' },
});

export const whatsChangedUi: GameUi<ChangedState, ChangedAction> = {
  gameId: 'W5-G03',
  howToPlay: [
    'Press Study and memorise the scene of coloured shapes.',
    'The scene comes back with a few squares changed: a shape vanished, appeared, moved, swapped places or changed colour.',
    'Tap every square that is different, then Check. A moved shape changes two squares.',
    'A miss shows each change side by side and gives you a fresh scene.',
  ],
  tutorials: CHANGED_TUTORIALS.map((t) => ({ seed: t.id, difficulty: t.difficulty, intro: t.intro })),
  Board,
  statusLine: (s) => `Round ${Math.min(s.round + 1, s.rounds.length)}/${s.rounds.length} · Misses ${s.misses}`,
  levelNote: () => null,
  successMessage: (s) => (s.rounds.length === 1 ? 'You spotted every change.' : `All ${s.rounds.length} scenes spotted.`),
  scoreExplanation: (s, { hintsUsed }) =>
    `100 for spotting every change. ${s.misses === 0 ? 'No misses.' : `${s.misses} miss${s.misses === 1 ? '' : 'es'}.`}${hintsUsed ? ` ${hintsUsed} hint${hintsUsed === 1 ? '' : 's'} used.` : ''}`,
  starsFor: (score) => (score >= 140 ? 3 : score >= 120 ? 2 : 1),
};
