import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';

import { AppText, Button, colors, radii, spacing, useHaptics } from '@/design-system';
import type { GameBoardProps, GameUi } from '@/games/ui';

import { ObjectGlyph } from '../../memory-vault/memory-detective/board';
import { OBJECTS } from '../../memory-vault/memory-detective/logic';
import { SIDES, statementId, statementText, TRUTH_TUTORIALS, viewRC, type TruthAction, type TruthState } from './logic';

/** The table as seen from the current side: far rows drawn smaller, as if receding. */
function TableView({ state, width }: { state: TruthState; width: number }) {
  const n = state.size;
  const rows = Array.from({ length: n }, (_, r) => r);
  const scale = (r: number) => 0.7 + (0.3 * r) / Math.max(1, n - 1);
  const rowH = (width / n) * 0.75;
  const height = rows.reduce((h, r) => h + rowH * scale(r), 0);
  const placed = new Map<string, number>();
  state.cells.forEach((cell, i) => {
    const [r, c] = viewRC(n, cell, state.view);
    placed.set(`${r},${c}`, i);
  });
  let y = 0;
  const top = width * 0.15;
  return (
    <View style={{ width, height: height + 8 }} accessible accessibilityLabel={`Table seen from the ${SIDES[state.view]}. ${rows
      .map((r) => Array.from({ length: n }, (_, c) => placed.get(`${r},${c}`)).filter((x): x is number => x !== undefined).map((i) => OBJECTS[state.objs[i]!]).join(' and '))
      .filter(Boolean)
      .join(', then nearer: ')}`}>
      <Svg width={width} height={height + 8} style={StyleSheet.absoluteFill}>
        <Polygon points={`${top},0 ${width - top},0 ${width},${height} 0,${height}`} fill="#8A5A2B" stroke="#C98A4A" strokeWidth={3} />
      </Svg>
      {rows.map((r) => {
        const s = scale(r);
        const h = rowH * s;
        const inset = (1 - s) * (width / 2);
        const rowY = y;
        y += h;
        return (
          <View key={r} style={[styles.tableRow, { top: rowY, left: inset, width: width - inset * 2, height: h }]}>
            {Array.from({ length: n }, (_, c) => {
              const i = placed.get(`${r},${c}`);
              return (
                <View key={c} style={styles.tableCell}>
                  {i !== undefined ? <ObjectGlyph obj={state.objs[i]!} size={h * 0.8} /> : null}
                </View>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}

function Board({ state, onAction, highlightIds, disabled }: GameBoardProps<TruthState, TruthAction>) {
  const { width } = useWindowDimensions();
  const haptics = useHaptics();
  const tableW = Math.min(320, width - spacing.lg * 2 - spacing.md * 2);
  return (
    <View style={styles.wrapper}>
      <View style={styles.turnRow}>
        <Button label="◀" variant="secondary" size="sm" disabled={disabled} onPress={() => onAction({ type: 'turn', dir: -1 })} />
        <AppText variant="label" tone="gold" accessibilityLiveRegion="polite" style={styles.side}>
          Standing on the {SIDES[state.view]} side
        </AppText>
        <Button label="▶" variant="secondary" size="sm" disabled={disabled} onPress={() => onAction({ type: 'turn', dir: 1 })} />
      </View>
      <TableView state={state} width={tableW} />
      <AppText variant="caption" tone="secondary" style={styles.center}>
        Which statement is true from every side?
      </AppText>
      <View style={styles.list}>
        {state.statements.map((st, i) => (
          <View key={i} testID={statementId(i)} style={[styles.statement, state.crossed[i] && styles.crossed, highlightIds.includes(statementId(i)) && styles.highlight]}>
            <AppText variant="label" tone={state.crossed[i] ? 'muted' : 'primary'} style={[styles.flex, state.crossed[i] && styles.strike]}>
              {statementText(state, st)}
            </AppText>
            <View style={styles.actions}>
              <Pressable accessibilityRole="button" accessibilityLabel={`${state.crossed[i] ? 'Uncross' : 'Cross out'}: ${statementText(state, st)}`} disabled={disabled} onPress={() => onAction({ type: 'cross', statement: i })} style={styles.small}>
                <AppText variant="caption">{state.crossed[i] ? 'Undo' : '✕'}</AppText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Always true: ${statementText(state, st)}`}
                disabled={disabled}
                onPress={() => {
                  haptics.tap();
                  onAction({ type: 'pick', statement: i });
                }}
                style={[styles.small, styles.pick]}
              >
                <AppText variant="caption" tone="onGold">
                  Always true
                </AppText>
              </Pressable>
            </View>
          </View>
        ))}
      </View>
      {state.wrongPicks ? (
        <AppText variant="caption" tone="danger" style={styles.center} accessibilityLiveRegion="polite">
          That one fails from some side. It has been crossed out.
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', gap: spacing.md, alignSelf: 'stretch' },
  center: { textAlign: 'center', alignSelf: 'stretch' },
  flex: { flex: 1 },
  turnRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  side: { minWidth: 170, textAlign: 'center' },
  tableRow: { position: 'absolute', flexDirection: 'row' },
  tableCell: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { alignSelf: 'stretch', gap: spacing.xs },
  statement: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: radii.sm, backgroundColor: 'rgba(10,6,30,0.4)', borderWidth: 2, borderStyle: 'solid', borderColor: 'transparent' },
  crossed: { opacity: 0.55 },
  strike: { textDecorationLine: 'line-through' },
  highlight: { borderColor: '#FFE58A' },
  actions: { flexDirection: 'row', gap: spacing.xs },
  small: { minHeight: 40, minWidth: 40, paddingHorizontal: spacing.sm, alignItems: 'center', justifyContent: 'center', borderRadius: radii.pill, backgroundColor: colors.glass },
  pick: { backgroundColor: colors.gold },
});

export const hiddenTruthUi: GameUi<TruthState, TruthAction> = {
  gameId: 'W1-G03',
  howToPlay: [
    'Objects sit on a small table. Use the arrows to walk round it and see it from each side.',
    'Some statements depend on where you stand: left of, in front of. Others do not.',
    'Exactly one statement is true from every side. Tap ✕ to cross out any you see fail.',
    'Tap Always true on the one that never fails. A wrong pick only lowers the bonus.',
  ],
  tutorials: TRUTH_TUTORIALS.map((t) => ({ seed: t.id, difficulty: t.difficulty, intro: t.intro })),
  Board,
  statusLine: (s) => `Sides ${s.views} · Wrong picks ${s.wrongPicks}`,
  levelNote: (s) => (s.views === 2 ? 'You can view this table from two opposite sides.' : null),
  successMessage: () => 'You found the truth that holds from every side.',
  scoreExplanation: (s, { hintsUsed }) => `100 for the right statement. ${s.wrongPicks} wrong pick${s.wrongPicks === 1 ? '' : 's'}${hintsUsed ? `, ${hintsUsed} hint${hintsUsed === 1 ? '' : 's'}` : ''}.`,
  starsFor: (score) => (score >= 140 ? 3 : score >= 120 ? 2 : 1),
};
