import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';

import { AppText, colors, radii, spacing, typography, useHaptics } from '@/design-system';
import type { GameBoardProps, GameUi } from '@/games/ui';

import { currentCubes, frontShadow, matches, rotationId, ROTATIONS, SHAPE_TUTORIALS, sideShadow, type Cube, type Rotation, type ShapeAction, type ShapeState } from './logic';

const FACE = { top: '#9FD8FF', front: '#4FA8F0', side: '#2E6FC0' };

/** Isometric drawing; cubes drawn far to near so nearer faces overlap. */
function Iso({ cubes, size }: { cubes: readonly Cube[]; size: number }) {
  const u = size / 7;
  const cx = size / 2;
  const cy = size * 0.62;
  const p = (x: number, y: number, z: number) => `${cx + (x - z) * u * 0.87},${cy - y * u + (x + z) * u * 0.5}`;
  const sorted = [...cubes].sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]));
  return (
    <Svg width={size} height={size} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {sorted.map(([x, y, z], i) => (
        <Polygon key={`t${i}`} points={[p(x, y + 1, z), p(x + 1, y + 1, z), p(x + 1, y + 1, z + 1), p(x, y + 1, z + 1)].join(' ')} fill={FACE.top} stroke="#1A1245" strokeWidth={1.5} />
      )).flatMap((top, i) => {
        const [x, y, z] = sorted[i]!;
        return [
          top,
          <Polygon key={`f${i}`} points={[p(x, y, z + 1), p(x + 1, y, z + 1), p(x + 1, y + 1, z + 1), p(x, y + 1, z + 1)].join(' ')} fill={FACE.front} stroke="#1A1245" strokeWidth={1.5} />,
          <Polygon key={`s${i}`} points={[p(x + 1, y, z), p(x + 1, y, z + 1), p(x + 1, y + 1, z + 1), p(x + 1, y + 1, z)].join(' ')} fill={FACE.side} stroke="#1A1245" strokeWidth={1.5} />,
        ];
      })}
    </Svg>
  );
}

function ShadowGrid({ cells, label, ok }: { cells: readonly string[]; label: string; ok?: boolean | undefined }) {
  const set = new Set(cells);
  const rows = Array.from({ length: 3 }, (_, r) => 2 - r);
  const words = rows.map((y, i) => `row ${i + 1}: ${[0, 1, 2].map((x) => (set.has(`${x},${y}`) ? 'filled' : 'empty')).join(' ')}`).join('; ');
  return (
    <View style={styles.shadowWrap} accessible accessibilityLabel={`${label}. ${words}.`}>
      <AppText variant="caption" tone={ok === undefined ? 'muted' : ok ? 'success' : 'secondary'}>
        {label}
      </AppText>
      <View style={styles.shadowGrid}>
        {rows.flatMap((y) => [0, 1, 2].map((x) => <View key={`${x}${y}`} style={[styles.shadowCell, set.has(`${x},${y}`) && styles.filled]} />))}
      </View>
    </View>
  );
}

const LABEL: Record<Rotation, string> = { turn: 'Turn ↻', tilt: 'Tilt ⤵', roll: 'Roll ⟲' };

function Board({ state, onAction, highlightIds, disabled }: GameBoardProps<ShapeState, ShapeAction>) {
  const haptics = useHaptics();
  const cubes = currentCubes(state);
  const front = frontShadow(cubes);
  const frontOk = front.join() === state.targetFront.join();
  const sideOk = state.targetSide ? sideShadow(cubes).join() === state.targetSide.join() : undefined;
  return (
    <View style={styles.wrapper}>
      <Iso cubes={cubes} size={220} />
      <View style={styles.shadows}>
        <ShadowGrid cells={front} label="Your front shadow" ok={frontOk} />
        <ShadowGrid cells={state.targetFront} label="Target front" />
      </View>
      {state.targetSide ? (
        <View style={styles.shadows}>
          <ShadowGrid cells={sideShadow(cubes)} label="Your side shadow" ok={sideOk} />
          <ShadowGrid cells={state.targetSide} label="Target side" />
        </View>
      ) : null}
      <AppText variant="caption" tone={matches(state, cubes) ? 'success' : 'secondary'} accessibilityLiveRegion="polite">
        {matches(state, cubes) ? 'Shadows match!' : frontOk ? 'Front matches. Now the side.' : 'Rotate until the shadows match.'}
      </AppText>
      <View style={styles.buttons}>
        {ROTATIONS.map((r) => (
          <Pressable
            key={r}
            testID={rotationId(r)}
            accessibilityRole="button"
            accessibilityLabel={r}
            disabled={disabled}
            onPress={() => {
              haptics.tap();
              onAction({ type: 'rotate', rotation: r });
            }}
            style={({ pressed }) => [styles.button, highlightIds.includes(rotationId(r)) && styles.highlight, pressed && styles.pressed]}
          >
            <AppText style={styles.buttonText}>{LABEL[r]}</AppText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', gap: spacing.sm },
  shadows: { flexDirection: 'row', gap: spacing.xl },
  shadowWrap: { alignItems: 'center', gap: 4 },
  shadowGrid: { width: 84, flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
  shadowCell: { width: 26, height: 26, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.08)' },
  filled: { backgroundColor: '#1A1245', borderWidth: 2, borderColor: '#9FD8FF' },
  buttons: { flexDirection: 'row', gap: spacing.sm },
  button: { minWidth: 96, height: 56, borderRadius: radii.md, backgroundColor: colors.glass, borderWidth: 1.5, borderColor: colors.glassBorder, alignItems: 'center', justifyContent: 'center' },
  buttonText: { ...typography.label, color: '#FFFFFF' },
  highlight: { borderColor: '#FFE58A', borderWidth: 4 },
  pressed: { transform: [{ scale: 0.93 }] },
});

export const shapeShiftUi: GameUi<ShapeState, ShapeAction> = {
  gameId: 'W3-G04',
  howToPlay: [
    'A shape of cubes casts a shadow straight onto the wall in front of it.',
    'Turn spins it left to right, Tilt tips it towards you, Roll rolls it sideways.',
    'Match your shadow to the target shadow. Expert shapes must match a side shadow too.',
  ],
  tutorials: SHAPE_TUTORIALS.map((t) => ({ seed: t.id, difficulty: t.difficulty, intro: t.intro })),
  Board,
  statusLine: (s) => `Moves ${s.moves.length} · Best ${s.par}`,
  levelNote: (s) => (s.targetSide ? 'Two shadows to match: front and side.' : null),
  successMessage: () => 'The shadows line up perfectly.',
  scoreExplanation: (s, { hintsUsed }) => `100 for matching the shadow. ${s.moves.length <= s.par ? `Fewest rotations possible: ${s.par}.` : `${s.moves.length} rotations; the fewest is ${s.par}.`}${hintsUsed ? ` ${hintsUsed} hint${hintsUsed === 1 ? '' : 's'}.` : ''}`,
  starsFor: (score) => (score >= 140 ? 3 : score >= 120 ? 2 : 1),
  undoAction: { type: 'undo' },
  resetAction: { type: 'reset' },
};
