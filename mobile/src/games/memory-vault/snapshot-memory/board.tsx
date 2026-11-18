import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { AppText, Button, colors, Icon, radii, spacing, useHaptics } from '@/design-system';
import type { GameBoardProps, GameUi } from '@/games/ui';

import { ShapeGlyph } from '../whats-changed/board';
import { objName } from '../whats-changed/logic';
import { frameCells, passMark, pointsFor, SNAPSHOT_TUTORIALS, specOf, squareId, type SnapshotAction, type SnapshotState } from './logic';

const RIGHT = '#5BE38F';
const NEAR = '#FFD23F';
const WRONG = '#FF7A7A';

/** Steps through the frames; stops while paused and restarts from the first frame on resume. */
function useSweep(state: SnapshotState, disabled: boolean, onDone: () => void): number {
  const active = state.phase === 'show' && !disabled;
  const key = `${state.round}/${state.attempt}`;
  const [frame, setFrame] = useState({ key: '', i: 0 });
  const ms = specOf(state).frameMs;
  useEffect(() => {
    if (!active) return;
    const timers = state.frames.map((_, i) => setTimeout(() => setFrame({ key, i }), i * ms));
    timers.push(setTimeout(onDone, state.frames.length * ms));
    return () => timers.forEach(clearTimeout);
  }, [active, key, ms, state.frames, onDone]);
  return active && frame.key === key ? frame.i : 0;
}

function MiniMap({ size, view, corner }: { size: number; view: number; corner: number }) {
  const dot = 12;
  const lit = new Set(frameCells(size, view, corner));
  return (
    <View style={[styles.mini, { width: size * (dot + 2) + 6 }]} accessible accessibilityLabel={`Window at row ${Math.floor(corner / size) + 1}, column ${(corner % size) + 1}`}>
      {Array.from({ length: size * size }, (_, i) => (
        <View key={i} style={[styles.miniDot, { width: dot, height: dot }, lit.has(i) && styles.miniLit]} />
      ))}
    </View>
  );
}

function Board({ state, onAction, highlightIds, disabled }: GameBoardProps<SnapshotState, SnapshotAction>) {
  const { width } = useWindowDimensions();
  const haptics = useHaptics();
  const spec = specOf(state);
  const [onShown] = useState(() => () => onAction({ type: 'shown' }));
  const frame = useSweep(state, disabled, onShown);
  const avail = width - spacing.lg * 2 - spacing.md * 2 - 4;
  const cell = Math.floor(Math.min(spec.size <= 4 ? 72 : 56, avail / spec.size));
  const at = new Map(state.items.map((it, i) => [it.cell, i]));

  if (state.phase === 'show') {
    const corner = state.frames[frame]!;
    const viewCell = Math.floor(Math.min(96, avail / spec.view));
    return (
      <View style={styles.wrapper}>
        <AppText variant="label" tone="gold">
          Snapshot {frame + 1} / {state.frames.length}
        </AppText>
        <MiniMap size={spec.size} view={spec.view} corner={corner} />
        <View style={[styles.grid, styles.camera, { width: viewCell * spec.view + 4 + 6 }]}>
          {frameCells(spec.size, spec.view, corner).map((c) => {
            const it = at.get(c);
            const item = it === undefined ? null : state.items[it]!;
            return (
              <View key={c} accessible accessibilityLabel={item ? objName(item.obj) : 'Empty'} style={[styles.cell, { width: viewCell, height: viewCell }]}>
                {item ? <ShapeGlyph obj={item.obj} size={viewCell * 0.75} /> : null}
              </View>
            );
          })}
        </View>
        <AppText variant="caption" tone="secondary" style={styles.center}>
          {disabled ? 'Paused. The sweep restarts when you resume.' : 'The bright squares on the mini-map show where you are looking.'}
        </AppText>
      </View>
    );
  }

  if (state.phase === 'place') {
    const allPlaced = state.placed.every((p) => p !== null);
    return (
      <View style={styles.wrapper}>
        <AppText variant="label" tone="gold" style={styles.center}>
          {state.selected === null ? 'Tap an object to move it.' : `Where was the ${objName(state.items[state.selected]!.obj)}?`}
        </AppText>
        <View style={styles.tray}>
          {state.items.map((it, i) => (
            <Pressable
              key={i}
              testID={`item-${i}`}
              accessibilityRole="button"
              accessibilityLabel={`${objName(it.obj)}${state.placed[i] === null ? '' : ', placed'}`}
              accessibilityState={{ selected: state.selected === i }}
              disabled={disabled}
              onPress={() => onAction({ type: 'select', item: i })}
              style={[styles.trayItem, state.selected === i && styles.selected, state.placed[i] !== null && styles.used]}
            >
              <ShapeGlyph obj={it.obj} size={34} />
            </Pressable>
          ))}
        </View>
        <View style={[styles.grid, { width: cell * spec.size + 4 }]}>
          {Array.from({ length: spec.size * spec.size }, (_, c) => {
            const owner = state.placed.indexOf(c);
            const item = owner >= 0 ? state.items[owner]! : null;
            return (
              <Pressable
                key={c}
                testID={squareId(c)}
                accessibilityRole="button"
                accessibilityLabel={`Row ${Math.floor(c / spec.size) + 1}, column ${(c % spec.size) + 1}${item ? `: ${objName(item.obj)}` : ''}`}
                disabled={disabled}
                onPress={() => {
                  haptics.tap();
                  onAction({ type: 'place', cell: c });
                }}
                style={[styles.cell, { width: cell, height: cell }, owner >= 0 && owner === state.selected && styles.selected, highlightIds.includes(squareId(c)) && styles.highlight]}
              >
                {item ? <ShapeGlyph obj={item.obj} size={cell * 0.75} /> : null}
              </Pressable>
            );
          })}
        </View>
        <AppText variant="caption" tone="secondary">
          Right square 2 points, one square off 1. Pass mark {passMark(state.items.length)} / {state.items.length * 2}.
        </AppText>
        <Button label="Check" variant="play" size="sm" disabled={disabled || !allPlaced} onPress={() => onAction({ type: 'check' })} />
      </View>
    );
  }

  const r = state.lastResult;
  // After a pass the state has moved to the next round, so explain using the result's own placements.
  const shownItems = r ? (r.passed && !state.done ? null : state.items) : null;
  return (
    <View style={styles.wrapper}>
      {r ? (
        <View style={styles.feedback} accessibilityLiveRegion="polite">
          <AppText variant="heading" tone={r.passed ? 'success' : 'danger'} style={styles.center}>
            {r.passed ? `Mapped! ${r.points} / ${r.max} points` : `${r.points} / ${r.max} points. Not enough this time.`}
          </AppText>
          {shownItems && !r.passed
            ? shownItems.map((it, i) => {
                const p = pointsFor(spec.size, it.cell, r.placed[i]!);
                return (
                  <View key={i} style={styles.row}>
                    <Icon name={p ? 'check' : 'cross'} size={16} color={p === 2 ? RIGHT : p === 1 ? NEAR : WRONG} />
                    <AppText variant="caption" tone="secondary">
                      {objName(it.obj)}: {p === 2 ? 'exact' : p === 1 ? 'one square off' : 'too far'} (+{p})
                    </AppText>
                  </View>
                );
              })
            : null}
          {!r.passed ? (
            <AppText variant="caption" tone="muted" style={styles.center}>
              You will get a fresh room of the same size.
            </AppText>
          ) : null}
        </View>
      ) : null}
      {!state.done ? (
        <View style={styles.card}>
          <AppText variant="label" tone="gold">
            Room {state.round + 1} of {state.rounds.length}
          </AppText>
          <AppText style={styles.center}>
            A {spec.view}×{spec.view} window sweeps a {spec.size}×{spec.size} room with {spec.objects} objects. Then rebuild the map.
          </AppText>
          <Button label={r && !r.passed ? 'Try a fresh room' : 'Watch'} variant="play" disabled={disabled} onPress={() => onAction({ type: 'watch' })} style={styles.stretch} />
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
  camera: { borderWidth: 3, borderStyle: 'solid', borderColor: colors.gold },
  cell: { alignItems: 'center', justifyContent: 'center', borderRadius: radii.sm, borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'transparent' },
  highlight: { borderColor: '#FFE58A', borderWidth: 4 },
  selected: { borderColor: colors.gold, borderWidth: 3 },
  used: { opacity: 0.45 },
  mini: { flexDirection: 'row', flexWrap: 'wrap', gap: 2, padding: 2, borderRadius: radii.sm, backgroundColor: 'rgba(10,6,30,0.6)' },
  miniDot: { borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.15)' },
  miniLit: { backgroundColor: colors.gold },
  tray: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' },
  trayItem: { padding: 4, borderRadius: radii.sm, borderWidth: 2, borderStyle: 'solid', borderColor: 'transparent', backgroundColor: colors.glass },
  feedback: { alignSelf: 'stretch', gap: spacing.xs, alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, alignSelf: 'stretch' },
});

export const snapshotMemoryUi: GameUi<SnapshotState, SnapshotAction> = {
  gameId: 'W5-G05',
  howToPlay: [
    'You never see the whole room. Press Watch and a small window sweeps across it, one snapshot at a time.',
    'The mini-map shows where the window is looking.',
    'Then place every object on the blank room map: pick an object, tap its square. Tap a placed object to move it.',
    'Right square scores 2, one square off (diagonals too) scores 1. Reach the pass mark to clear the room.',
  ],
  tutorials: SNAPSHOT_TUTORIALS.map((t) => ({ seed: t.id, difficulty: t.difficulty, intro: t.intro })),
  Board,
  statusLine: (s) => `Room ${Math.min(s.round + 1, s.rounds.length)}/${s.rounds.length} · Misses ${s.misses}`,
  levelNote: () => null,
  successMessage: (s) => (s.rounds.length === 1 ? 'Room mapped from memory.' : `All ${s.rounds.length} rooms mapped.`),
  scoreExplanation: (s, { hintsUsed }) =>
    `100 for mapping every room, plus accuracy ${s.earned}/${s.possible}. ${s.misses === 0 ? 'No misses.' : `${s.misses} miss${s.misses === 1 ? '' : 'es'}.`}${hintsUsed ? ` ${hintsUsed} hint${hintsUsed === 1 ? '' : 's'} used.` : ''}`,
  starsFor: (score) => (score >= 140 ? 3 : score >= 120 ? 2 : 1),
};
