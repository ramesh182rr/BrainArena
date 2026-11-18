import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';

import { AppText, Button, colors, Icon, radii, spacing, useHaptics } from '@/design-system';
import type { GameBoardProps, GameUi } from '@/games/ui';

import { DETECTIVE_TUTORIALS, OBJECTS, passMark, squareId, type DetectiveAction, type DetectiveState, type SceneItem } from './logic';

/** Everyday objects, drawn for this game. */
export function ObjectGlyph({ obj, size }: { obj: number; size: number }) {
  const s = size;
  const ink = '#1A1245';
  return (
    <Svg width={s} height={s} viewBox="0 0 40 40">
      {obj === 0 ? (
        <G>
          <Path d="M9 13 H27 V27 C27 31 24 33 18 33 C12 33 9 31 9 27 Z" fill="#FF8FB8" stroke={ink} strokeWidth={2} />
          <Path d="M27 16 C33 16 33 25 27 25" fill="none" stroke={ink} strokeWidth={2.5} />
        </G>
      ) : null}
      {obj === 1 ? (
        <G>
          <Path d="M12 20 L16 7 H24 L28 20 Z" fill="#FFD23F" stroke={ink} strokeWidth={2} />
          <Line x1={20} y1={20} x2={20} y2={31} stroke={ink} strokeWidth={2.5} />
          <Rect x={13} y={31} width={14} height={4} rx={2} fill={ink} />
        </G>
      ) : null}
      {obj === 2 ? (
        <G>
          <Rect x={8} y={9} width={24} height={22} rx={3} fill="#4FA3FF" stroke={ink} strokeWidth={2} />
          <Line x1={20} y1={9} x2={20} y2={31} stroke={ink} strokeWidth={2} />
        </G>
      ) : null}
      {obj === 3 ? (
        <G>
          <Path d="M20 22 C12 20 10 12 14 8 C18 12 20 16 20 22 C20 16 22 10 28 8 C30 14 27 20 20 22 Z" fill="#5BE38F" stroke={ink} strokeWidth={1.5} />
          <Path d="M12 24 H28 L26 34 H14 Z" fill="#C98A4A" stroke={ink} strokeWidth={2} />
        </G>
      ) : null}
      {obj === 4 ? (
        <G>
          <Circle cx={20} cy={20} r={13} fill="#FFFFFF" stroke={ink} strokeWidth={2.5} />
          <Line x1={20} y1={20} x2={20} y2={12} stroke={ink} strokeWidth={2.5} strokeLinecap="round" />
          <Line x1={20} y1={20} x2={26} y2={22} stroke={ink} strokeWidth={2.5} strokeLinecap="round" />
        </G>
      ) : null}
      {obj === 5 ? (
        <G>
          <Circle cx={20} cy={20} r={12} fill="#FF7A3D" stroke={ink} strokeWidth={2} />
          <Path d="M8 20 Q20 12 32 20" fill="none" stroke={ink} strokeWidth={1.5} />
          <Path d="M8 20 Q20 28 32 20" fill="none" stroke={ink} strokeWidth={1.5} />
        </G>
      ) : null}
      {obj === 6 ? (
        <G>
          <Circle cx={13} cy={20} r={6} fill="#FFC233" stroke={ink} strokeWidth={2} />
          <Path d="M19 20 H33 M28 20 V25 M32 20 V24" stroke={ink} strokeWidth={3} strokeLinecap="round" />
        </G>
      ) : null}
      {obj === 7 ? (
        <G>
          <Ellipse cx={20} cy={28} rx={15} ry={4} fill="#B18CFF" stroke={ink} strokeWidth={2} />
          <Path d="M12 28 C12 16 14 11 20 11 C26 11 28 16 28 28 Z" fill="#B18CFF" stroke={ink} strokeWidth={2} />
        </G>
      ) : null}
    </Svg>
  );
}

function useStudy(state: DetectiveState, disabled: boolean, onDone: () => void): number {
  const active = state.phase === 'study' && !disabled;
  const key = `${state.round}/${state.attempt}`;
  const ms = state.rounds[state.round]!.studyMs;
  const [left, setLeft] = useState({ key: '', ms });
  useEffect(() => {
    if (!active) return;
    const t0 = Date.now();
    const tick = setInterval(() => setLeft({ key, ms: Math.max(0, ms - (Date.now() - t0)) }), 100);
    const done = setTimeout(onDone, ms);
    return () => {
      clearInterval(tick);
      clearTimeout(done);
    };
  }, [active, key, ms, onDone]);
  return active && left.key === key ? left.ms : ms;
}

function Room({ items, size, cell }: { items: readonly SceneItem[]; size: number; cell: number }) {
  return (
    <View style={[styles.room, { width: cell * size + 4 }]}>
      {Array.from({ length: size * size }, (_, i) => {
        const it = items.find((x) => x.cell === i);
        return (
          <View key={i} accessible={!!it} accessibilityLabel={it ? OBJECTS[it.obj] : undefined} style={[styles.square, { width: cell, height: cell }]}>
            {it ? <ObjectGlyph obj={it.obj} size={cell * 0.78} /> : null}
          </View>
        );
      })}
    </View>
  );
}

function relationText(state: DetectiveState, a: number, b: number): string {
  const A = state.items[a]!;
  const B = state.items[b]!;
  const s = state.sceneSize;
  const dc = (A.cell % s) - (B.cell % s);
  const dr = Math.floor(A.cell / s) - Math.floor(B.cell / s);
  const h = dc < 0 ? 'left of' : dc > 0 ? 'right of' : 'in line with';
  const v = dr < 0 ? 'above' : dr > 0 ? 'below' : 'level with';
  return `The ${OBJECTS[A.obj]} was ${h} and ${v} the ${OBJECTS[B.obj]}.`;
}

function Board({ state, onAction, highlightIds, disabled }: GameBoardProps<DetectiveState, DetectiveAction>) {
  const { width } = useWindowDimensions();
  const haptics = useHaptics();
  const [onStudied] = useState(() => () => onAction({ type: 'studied' }));
  const left = useStudy(state, disabled, onStudied);
  const avail = width - spacing.lg * 2 - spacing.md * 2 - 4;
  const spec = state.rounds[Math.min(state.round, state.rounds.length - 1)]!;

  if (state.phase === 'study') {
    const cell = Math.floor(Math.min(80, avail / state.sceneSize));
    return (
      <View style={styles.wrapper}>
        <AppText variant="label" tone="gold">
          Study the room
        </AppText>
        <View style={styles.timer}>
          <View style={[styles.timerFill, { width: `${(left / spec.studyMs) * 100}%` }]} />
        </View>
        <Room items={state.items} size={state.sceneSize} cell={cell} />
        <AppText variant="caption" tone="secondary">
          {disabled ? 'Paused. The study restarts when you resume.' : `${Math.ceil(left / 1000)} s`}
        </AppText>
        <Button label="I'm ready" variant="secondary" size="sm" disabled={disabled} onPress={() => onAction({ type: 'studied' })} />
      </View>
    );
  }

  if (state.phase === 'place') {
    const cell = Math.floor(Math.min(64, avail / state.mapSize));
    const all = state.placed.every((p) => p !== null);
    return (
      <View style={styles.wrapper}>
        <AppText variant="label" tone="gold" style={styles.center}>
          {state.selected === null ? 'Tap a placed object to move it.' : `Where does the ${OBJECTS[state.items[state.selected]!.obj]} go?`}
        </AppText>
        <View style={styles.tray}>
          {state.items.map((it, i) => (
            <Pressable
              key={i}
              accessibilityRole="button"
              accessibilityLabel={`${OBJECTS[it.obj]}${state.placed[i] === null ? '' : ', placed'}`}
              accessibilityState={{ selected: state.selected === i }}
              disabled={disabled}
              onPress={() => onAction({ type: 'select', item: i })}
              style={[styles.trayItem, state.selected === i && styles.selected, state.placed[i] !== null && styles.used]}
            >
              <ObjectGlyph obj={it.obj} size={36} />
            </Pressable>
          ))}
        </View>
        <View style={[styles.room, { width: cell * state.mapSize + 4 }]}>
          {Array.from({ length: state.mapSize * state.mapSize }, (_, c) => {
            const owner = state.placed.indexOf(c);
            return (
              <Pressable
                key={c}
                testID={squareId(c)}
                accessibilityRole="button"
                accessibilityLabel={`Row ${Math.floor(c / state.mapSize) + 1}, column ${(c % state.mapSize) + 1}${owner >= 0 ? `: ${OBJECTS[state.items[owner]!.obj]}` : ''}`}
                disabled={disabled}
                onPress={() => {
                  haptics.tap();
                  onAction({ type: 'place', cell: c });
                }}
                style={[styles.square, { width: cell, height: cell }, owner >= 0 && owner === state.selected && styles.selected, highlightIds.includes(squareId(c)) && styles.highlight]}
              >
                {owner >= 0 ? <ObjectGlyph obj={state.items[owner]!.obj} size={cell * 0.78} /> : null}
              </Pressable>
            );
          })}
        </View>
        <AppText variant="caption" tone="secondary" style={styles.center}>
          Only the arrangement counts. Pass mark: {passMark(state.items.length)} of {state.items.length * (state.items.length - 1) / 2} pairs.
        </AppText>
        <Button label="Check" variant="play" size="sm" disabled={disabled || !all} onPress={() => onAction({ type: 'check' })} />
      </View>
    );
  }

  const r = state.lastResult;
  return (
    <View style={styles.wrapper}>
      {r ? (
        <View style={styles.feedback} accessibilityLiveRegion="polite">
          <AppText variant="heading" tone={r.passed ? 'success' : 'danger'} style={styles.center}>
            {r.passed ? `Case solved: ${r.matched} of ${r.total} pairs right` : `${r.matched} of ${r.total} pairs right. Not quite enough.`}
          </AppText>
          {!r.passed
            ? r.pairs
                .filter((p) => !p.ok)
                .slice(0, 4)
                .map((p, k) => (
                  <View key={k} style={styles.row}>
                    <Icon name="cross" size={16} color="#FF7A7A" />
                    <AppText variant="caption" tone="secondary" style={styles.flex}>
                      {relationText(state, p.a, p.b)}
                    </AppText>
                  </View>
                ))
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
            Study {spec.objects} objects for {Math.round(spec.studyMs / 1000)} seconds, then rebuild how they were arranged.
          </AppText>
          <Button label={r && !r.passed ? 'Try a fresh room' : 'Study'} variant="play" disabled={disabled} onPress={() => onAction({ type: 'watch' })} style={styles.stretch} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', gap: spacing.md },
  center: { textAlign: 'center', alignSelf: 'stretch' },
  flex: { flex: 1 },
  stretch: { alignSelf: 'stretch' },
  card: { alignSelf: 'stretch', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: radii.md, backgroundColor: 'rgba(10,6,30,0.45)' },
  room: { flexDirection: 'row', flexWrap: 'wrap', padding: 2, borderRadius: radii.md, backgroundColor: '#3A2C5E' },
  square: { alignItems: 'center', justifyContent: 'center', borderRadius: radii.sm, borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'transparent' },
  selected: { borderColor: colors.gold, borderWidth: 3 },
  highlight: { borderColor: '#FFE58A', borderWidth: 4 },
  used: { opacity: 0.45 },
  tray: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' },
  trayItem: { padding: 4, borderRadius: radii.sm, borderWidth: 2, borderStyle: 'solid', borderColor: 'transparent', backgroundColor: colors.glass },
  timer: { alignSelf: 'stretch', height: 8, borderRadius: 4, backgroundColor: colors.glass, overflow: 'hidden' },
  timerFill: { height: 8, backgroundColor: colors.gold },
  feedback: { alignSelf: 'stretch', gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});

export const memoryDetectiveUi: GameUi<DetectiveState, DetectiveAction> = {
  gameId: 'W5-G01',
  howToPlay: [
    'Press Study and memorise the room.',
    'Then rebuild it on the blank, slightly bigger map: pick an object, tap a square.',
    'Only the arrangement counts: for every pair, which is further left or right, and higher or lower. You may shift the whole room.',
    'Get enough pairs right to solve the case. A miss explains the wrong pairs and gives a fresh room.',
  ],
  tutorials: DETECTIVE_TUTORIALS.map((t) => ({ seed: t.id, difficulty: t.difficulty, intro: t.intro })),
  Board,
  statusLine: (s) => `Room ${Math.min(s.round + 1, s.rounds.length)}/${s.rounds.length} · Misses ${s.misses}`,
  levelNote: () => null,
  successMessage: (s) => (s.rounds.length === 1 ? 'Room rebuilt from memory.' : `All ${s.rounds.length} rooms rebuilt.`),
  scoreExplanation: (s, { hintsUsed }) => `100 for every room. Accuracy ${s.matchedTotal}/${s.pairTotal} pairs. ${s.misses === 0 ? 'No misses.' : `${s.misses} miss${s.misses === 1 ? '' : 'es'}.`}${hintsUsed ? ` ${hintsUsed} hint${hintsUsed === 1 ? '' : 's'}.` : ''}`,
  starsFor: (score) => (score >= 140 ? 3 : score >= 120 ? 2 : 1),
};
