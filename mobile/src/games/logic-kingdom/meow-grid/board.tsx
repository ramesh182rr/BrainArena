import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Polygon, Text as SvgText } from 'react-native-svg';

import { AppText, Button, colors, radii, spacing, useHaptics } from '@/design-system';
import type { GameBoardProps, GameUi } from '@/games/ui';

import { CATS, cellId, conflicts, MEOW_TUTORIALS, type MeowAction, type MeowState } from './logic';

const CAT_COLORS = ['#FFB547', '#FF7A59', '#9C8CFF', '#F2F2F8', '#5BE38F', '#4FD1FF'] as const;

/** Original cat-face glyph: head, ears and the cat's initial. */
function CatFace({ cat, size }: { cat: number; size: number }) {
  const c = size / 2;
  const fill = CAT_COLORS[cat]!;
  return (
    <Svg width={size} height={size} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Polygon points={`${c - size * 0.34},${c - size * 0.05} ${c - size * 0.3},${c - size * 0.42} ${c - size * 0.08},${c - size * 0.24}`} fill={fill} stroke="#1A1245" strokeWidth={1.5} />
      <Polygon points={`${c + size * 0.34},${c - size * 0.05} ${c + size * 0.3},${c - size * 0.42} ${c + size * 0.08},${c - size * 0.24}`} fill={fill} stroke="#1A1245" strokeWidth={1.5} />
      <Circle cx={c} cy={c + size * 0.05} r={size * 0.32} fill={fill} stroke="#1A1245" strokeWidth={1.5} />
      <SvgText x={c} y={c + size * 0.16} fontSize={size * 0.32} fontWeight="bold" textAnchor="middle" fill="#1A1245">
        {CATS[cat]![0]}
      </SvgText>
    </Svg>
  );
}

function Board({ state, onAction, highlightIds, disabled }: GameBoardProps<MeowState, MeowAction>) {
  const { width } = useWindowDimensions();
  const haptics = useHaptics();
  const n = state.size;
  const size = Math.floor(Math.min(64, (width - spacing.lg * 2 - spacing.md * 2 - 8) / n));
  const bad = conflicts(state);
  const echoLetter = new Map<number, string>();
  state.echoes.forEach(([a, b], k) => {
    echoLetter.set(a, String.fromCharCode(65 + k));
    echoLetter.set(b, String.fromCharCode(65 + k));
  });
  const border = (i: number) => {
    const r = Math.floor(i / n);
    const c = i % n;
    const diff = (j: number) => (state.regions[j] !== state.regions[i] ? 3 : 0.5);
    return {
      borderTopWidth: r === 0 ? 3 : diff(i - n),
      borderBottomWidth: r === n - 1 ? 3 : diff(i + n),
      borderLeftWidth: c === 0 ? 3 : diff(i - 1),
      borderRightWidth: c === n - 1 ? 3 : diff(i + 1),
    };
  };
  return (
    <View style={styles.wrapper}>
      <View style={[styles.grid, { width: size * n }]} accessibilityLabel="Cat grid">
        {state.cells.map((v, i) => {
          const given = state.givens[i] !== null;
          const label = `Row ${Math.floor(i / n) + 1}, column ${(i % n) + 1}. ${v === null ? 'Empty' : CATS[v]}${given ? ', fixed' : ''}${echoLetter.has(i) ? `, echo ${echoLetter.get(i)}` : ''}${bad.has(i) ? ', clashes' : ''}.`;
          return (
            <Pressable
              key={i}
              testID={cellId(i)}
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityState={{ selected: state.selected === i, disabled: disabled || given }}
              disabled={disabled || given}
              onPress={() => {
                haptics.tap();
                onAction({ type: 'select', cell: i });
              }}
              style={[
                styles.cell,
                { width: size, height: size },
                border(i),
                given && styles.given,
                state.selected === i && styles.selected,
                bad.has(i) && styles.bad,
                highlightIds.includes(cellId(i)) && styles.highlight,
              ]}
            >
              {v !== null ? <CatFace cat={v} size={size * 0.82} /> : null}
              {echoLetter.has(i) ? (
                <View style={styles.echo}>
                  <AppText style={styles.echoText}>{echoLetter.get(i)}</AppText>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
      <View style={styles.palette} accessibilityLabel="Cats">
        {Array.from({ length: n }, (_, k) => (
          <Pressable
            key={k}
            accessibilityRole="button"
            accessibilityLabel={`Place ${CATS[k]}`}
            disabled={disabled || state.selected === null}
            onPress={() => {
              haptics.tap();
              onAction({ type: 'place', cat: k });
            }}
            style={({ pressed }) => [styles.key, state.selected === null && styles.dim, pressed && styles.pressed]}
          >
            <CatFace cat={k} size={40} />
            <AppText variant="caption" tone="secondary">
              {CATS[k]}
            </AppText>
          </Pressable>
        ))}
      </View>
      <Button label="Clear square" variant="secondary" size="sm" disabled={disabled || state.selected === null} onPress={() => onAction({ type: 'clear' })} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', gap: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#221A5C' },
  cell: { alignItems: 'center', justifyContent: 'center', borderColor: '#E9E3FF', borderStyle: 'solid' },
  given: { backgroundColor: '#3B2A8F' },
  selected: { backgroundColor: '#5B45C8' },
  bad: { backgroundColor: '#6B2440' },
  highlight: { backgroundColor: '#7A6420' },
  echo: { position: 'absolute', top: 1, right: 1, width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  echoText: { fontSize: 10, lineHeight: 12, color: colors.gold },
  palette: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm },
  key: { width: 76, paddingVertical: spacing.xs, alignItems: 'center', borderRadius: radii.md, backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder },
  dim: { opacity: 0.45 },
  pressed: { transform: [{ scale: 0.93 }] },
});

export const meowGridUi: GameUi<MeowState, MeowAction> = {
  gameId: 'W2-G01',
  howToPlay: [
    'Fill the grid with cats: each row, column and outlined region needs every cat exactly once.',
    'Tap an empty square, then tap a cat.',
    'Squares with the same ring letter are echoes: they must hold the same cat.',
    'Clashing squares turn red. Every grid has exactly one answer.',
  ],
  tutorials: MEOW_TUTORIALS.map((t) => ({ seed: t.id, difficulty: t.difficulty, intro: t.intro })),
  Board,
  statusLine: (s) => `Filled ${s.cells.filter((v) => v !== null).length}/${s.cells.length}`,
  levelNote: (s) => (s.echoes.length ? 'Ring letters mark echo squares that share a cat.' : null),
  successMessage: () => 'Every cat is in its place.',
  scoreExplanation: (s, { hintsUsed }) => `100 for a complete grid. ${s.wrongPlacements} wrong placement${s.wrongPlacements === 1 ? '' : 's'}${hintsUsed ? `, ${hintsUsed} hint${hintsUsed === 1 ? '' : 's'}` : ''}.`,
  starsFor: (score) => (score >= 140 ? 3 : score >= 120 ? 2 : 1),
  undoAction: { type: 'undo' },
  resetAction: { type: 'reset' },
};
