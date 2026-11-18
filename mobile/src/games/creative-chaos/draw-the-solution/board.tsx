import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

import { AppText, Button, radii, spacing, useHaptics, useReduceMotion } from '@/design-system';
import type { GameBoardProps, GameUi } from '@/games/ui';

import { canExtend, DRAW_TUTORIALS, squareId, type DrawAction, type DrawState } from './logic';

function Board({ state, onAction, highlightIds, disabled }: GameBoardProps<DrawState, DrawAction>) {
  const { width } = useWindowDimensions();
  const haptics = useHaptics();
  const reduceMotion = useReduceMotion();
  const size = Math.floor(Math.min(50, (width - spacing.lg * 2 - spacing.md * 2) / state.width));
  const run = state.lastRun;
  const steps = run ? run.path.length : 0;
  const [shown, setShown] = useState({ key: -1, n: 0 });
  const visible = !run ? 0 : reduceMotion ? steps : shown.key === state.drops ? shown.n : 1;
  useEffect(() => {
    if (!run || reduceMotion) return;
    let k = 1;
    const id = setInterval(() => {
      k += 1;
      setShown({ key: state.drops, n: k });
      if (k >= steps) clearInterval(id);
    }, 120);
    return () => clearInterval(id);
  }, [run, reduceMotion, steps, state.drops]);
  const pts = run ? run.path.slice(0, Math.max(1, visible)) : [];
  const ballAt = pts.length ? pts[pts.length - 1]! : state.start;
  const center = (i: number) => ({ x: (i % state.width) * size + size / 2, y: Math.floor(i / state.width) * size + size / 2 });
  const drawn = new Set(state.stroke);
  const done = run && visible >= steps;
  const inkLeft = state.ink - state.stroke.length;
  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        {state.materials.map((m) => (
          <Button key={m} label={m === 'plank' ? 'Plank' : 'Spring'} variant={state.material === m ? 'primary' : 'secondary'} size="sm" disabled={disabled} onPress={() => onAction({ type: 'material', material: m })} />
        ))}
        <AppText variant="label" tone="gold">
          Ink {inkLeft}/{state.ink}
        </AppText>
      </View>
      <View style={{ width: size * state.width, height: size * state.height }}>
        <Svg width={size * state.width} height={size * state.height} style={StyleSheet.absoluteFill}>
          <Rect width={size * state.width} height={size * state.height} rx={8} fill="#1F1656" />
          {state.cells.map((c, i) => {
            const { x, y } = center(i);
            if (c === 'wall') return <Rect key={i} x={x - size / 2 + 1} y={y - size / 2 + 1} width={size - 2} height={size - 2} rx={4} fill="#4A3F8C" />;
            if (c === 'anchor') return <Circle key={i} cx={x} cy={y} r={size * 0.22} fill="#C98A4A" stroke="#FFFFFF" strokeWidth={2} />;
            if (c === 'basket') return <Path key={i} d={`M ${x - size * 0.35} ${y - size * 0.15} L ${x - size * 0.25} ${y + size * 0.35} L ${x + size * 0.25} ${y + size * 0.35} L ${x + size * 0.35} ${y - size * 0.15} Z`} fill="#5BE38F" stroke="#FFFFFF" strokeWidth={2} />;
            return null;
          })}
          {state.stroke.map((i) => {
            const { x, y } = center(i);
            return state.material === 'spring' ? (
              <Path key={i} d={`M ${x - size / 2 + 3} ${y + size * 0.3} l ${size * 0.15} -${size * 0.25} l ${size * 0.15} ${size * 0.25} l ${size * 0.15} -${size * 0.25} l ${size * 0.15} ${size * 0.25} l ${size * 0.15} -${size * 0.25}`} stroke="#FF8FB8" strokeWidth={4} fill="none" />
            ) : (
              <Rect key={i} x={x - size / 2 + 2} y={y - size * 0.15} width={size - 4} height={size * 0.3} rx={4} fill="#E0A458" stroke="#8A5A2B" strokeWidth={2} />
            );
          })}
          {pts.slice(1).map((c, k) => {
            const a = center(pts[k]!);
            const b = center(c);
            return <Line key={k} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#FFD23F" strokeOpacity={0.5} strokeWidth={3} />;
          })}
          <Circle cx={center(ballAt).x} cy={center(ballAt).y} r={size * 0.25} fill="#FFFFFF" stroke="#FFD23F" strokeWidth={3} />
        </Svg>
        <View style={[StyleSheet.absoluteFill, styles.overlay]}>
          {state.cells.map((c, i) => {
            const extendable = canExtend(state, state.stroke, i);
            const isEnd = state.stroke[state.stroke.length - 1] === i;
            return (
              <Pressable
                key={i}
                testID={squareId(i)}
                accessibilityRole="button"
                accessibilityLabel={`Row ${Math.floor(i / state.width) + 1}, column ${(i % state.width) + 1}: ${c === 'air' ? (drawn.has(i) ? state.material : 'empty') : c}${extendable ? ', can draw here' : isEnd ? ', tap to erase' : ''}`}
                disabled={disabled}
                onPress={() => {
                  if (!extendable && !isEnd) return;
                  haptics.tap();
                  onAction({ type: 'draw', cell: i });
                }}
                style={[{ width: size, height: size }, extendable && styles.can, highlightIds.includes(squareId(i)) && styles.highlight]}
              />
            );
          })}
        </View>
      </View>
      <AppText variant="caption" tone={done && run?.outcome !== 'basket' ? 'danger' : 'secondary'} accessibilityLiveRegion="polite" style={styles.center}>
        {!run
          ? state.stroke.length
            ? 'Keep drawing through neighbouring squares, or drop the ball.'
            : 'Start your stroke on a square next to an anchor peg.'
          : !done
            ? 'Rolling…'
            : run.outcome === 'basket'
              ? 'In the basket!'
              : run.outcome === 'lost'
                ? 'The ball rolled away. Redraw and try again.'
                : 'The ball got stuck. Redraw and try again.'}
      </AppText>
      <View style={styles.row}>
        <Button label="Clear" variant="secondary" size="sm" disabled={disabled || !state.stroke.length} onPress={() => onAction({ type: 'clear' })} />
        <Button label="Drop ball" variant="play" size="sm" disabled={disabled} onPress={() => onAction({ type: 'drop' })} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', gap: spacing.md },
  center: { textAlign: 'center', alignSelf: 'stretch' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  overlay: { flexDirection: 'row', flexWrap: 'wrap' },
  can: { borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255,255,255,0.45)', borderRadius: radii.sm },
  highlight: { borderWidth: 3, borderStyle: 'solid', borderColor: '#FFE58A', borderRadius: radii.sm },
});

export const drawTheSolutionUi: GameUi<DrawState, DrawAction> = {
  gameId: 'W6-G02',
  howToPlay: [
    'A ball drops from the top, falls, and rolls along whatever it lands on; it turns back at walls.',
    'Draw one continuous stroke: tap a square next to an anchor peg, then neighbouring squares. Tap the end square to erase it.',
    'Choose the material: planks are solid; springs bounce a falling ball up two squares.',
    'Drop the ball into the basket. Less ink and fewer drops earn a bigger bonus.',
  ],
  tutorials: DRAW_TUTORIALS.map((t) => ({ seed: t.id, difficulty: t.difficulty, intro: t.intro })),
  Board,
  statusLine: (s) => `Ink ${s.stroke.length}/${s.ink} · Drops ${s.drops}`,
  levelNote: (s) => (s.materials.includes('spring') ? 'Springs are available on this board.' : null),
  successMessage: () => 'Straight into the basket.',
  finishDelayMs: (s) => (s.lastRun ? s.lastRun.path.length * 120 + 400 : 0),
  scoreExplanation: (s, { hintsUsed }) => `100 for landing the ball. ${s.stroke.length} squares of ink (best ${s.minInk}), ${s.drops} drop${s.drops === 1 ? '' : 's'}${hintsUsed ? `, ${hintsUsed} hint${hintsUsed === 1 ? '' : 's'}` : ''}.`,
  starsFor: (score) => (score >= 140 ? 3 : score >= 120 ? 2 : 1),
};
