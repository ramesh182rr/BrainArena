import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, colors, Icon, radii, spacing, useHaptics } from '@/design-system';
import type { GameBoardProps, GameUi } from '@/games/ui';

import { cellId, clueId, clueStatus, clueText, GRID_TUTORIALS, ITEMS, PEOPLE, TIMES, type GridAction, type GridState } from './logic';

const STATUS = { ok: '#5BE38F', broken: '#FF7A7A', open: 'rgba(255,255,255,0.25)' };

function Board({ state, onAction, highlightIds, disabled }: GameBoardProps<GridState, GridAction>) {
  const haptics = useHaptics();
  const sel = state.selected;
  const options = sel ? (sel.col === 'item' ? ITEMS : TIMES).slice(0, state.n) : [];
  const cell = (p: number, col: 'item' | 'time') => {
    const v = state[col][p];
    const label = v === null || v === undefined ? '—' : col === 'item' ? ITEMS[v]! : TIMES[v]!;
    const selected = sel?.p === p && sel.col === col;
    return (
      <Pressable
        testID={cellId(p, col)}
        accessibilityRole="button"
        accessibilityLabel={`${PEOPLE[p]} ${col === 'item' ? 'item' : 'time'}: ${v === null || v === undefined ? 'not set' : label}`}
        accessibilityState={{ selected }}
        disabled={disabled}
        onPress={() => onAction({ type: 'select', p, col })}
        style={[styles.cell, selected && styles.cellSelected, highlightIds.includes(cellId(p, col)) && styles.highlight]}
      >
        <AppText variant="label" tone={v === null || v === undefined ? 'muted' : 'primary'}>
          {label}
        </AppText>
      </Pressable>
    );
  };
  return (
    <View style={styles.wrapper}>
      <View style={styles.clues}>
        {state.clues.map((c, i) => {
          const st = clueStatus(c, state);
          return (
            <View
              key={i}
              testID={clueId(i)}
              accessible
              accessibilityLabel={`Clue ${i + 1}: ${clueText(c)} ${st === true ? 'Satisfied.' : st === false ? 'Broken by your entries.' : ''}`}
              style={[styles.clue, { borderColor: st === true ? STATUS.ok : st === false ? STATUS.broken : STATUS.open }, highlightIds.includes(clueId(i)) && styles.highlight]}
            >
              {st === null ? <View style={styles.dot} /> : <Icon name={st ? 'check' : 'cross'} size={16} color={st ? STATUS.ok : STATUS.broken} />}
              <AppText variant="caption" style={styles.flex}>
                {clueText(c)}
              </AppText>
            </View>
          );
        })}
      </View>
      <View style={styles.table}>
        <View style={styles.headRow}>
          <AppText variant="caption" tone="muted" style={styles.nameCol}>
            Traveller
          </AppText>
          <AppText variant="caption" tone="muted" style={styles.flex}>
            Item
          </AppText>
          {state.useTimes ? (
            <AppText variant="caption" tone="muted" style={styles.flex}>
              Sets out
            </AppText>
          ) : null}
        </View>
        {PEOPLE.slice(0, state.n).map((name, p) => (
          <View key={name} style={styles.row}>
            <AppText variant="label" style={styles.nameCol}>
              {name}
            </AppText>
            {cell(p, 'item')}
            {state.useTimes ? cell(p, 'time') : null}
          </View>
        ))}
      </View>
      {sel ? (
        <View style={styles.palette} accessibilityLabel={`Choose ${sel.col === 'item' ? 'an item' : 'a time'} for ${PEOPLE[sel.p]}`}>
          {options.map((o, v) => (
            <Pressable
              key={o}
              accessibilityRole="button"
              accessibilityLabel={`Set ${o}`}
              disabled={disabled}
              onPress={() => {
                haptics.tap();
                onAction({ type: 'set', value: v });
              }}
              style={({ pressed }) => [styles.option, pressed && styles.pressed]}
            >
              <AppText variant="label">{o}</AppText>
            </Pressable>
          ))}
          <Pressable accessibilityRole="button" accessibilityLabel="Clear entry" disabled={disabled} onPress={() => onAction({ type: 'set', value: null })} style={styles.option}>
            <AppText variant="label" tone="muted">
              clear
            </AppText>
          </Pressable>
        </View>
      ) : (
        <AppText variant="caption" tone="secondary" style={styles.center}>
          Tap a cell to fill it in.
        </AppText>
      )}
      <Button label="Start over" variant="secondary" size="sm" disabled={disabled} onPress={() => onAction({ type: 'reset' })} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignSelf: 'stretch', alignItems: 'center', gap: spacing.md },
  center: { textAlign: 'center' },
  flex: { flex: 1 },
  clues: { alignSelf: 'stretch', gap: spacing.xs },
  clue: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: radii.sm, borderWidth: 1.5, borderStyle: 'solid', backgroundColor: 'rgba(10,6,30,0.35)' },
  dot: { width: 10, height: 10, margin: 3, borderRadius: 5, backgroundColor: STATUS.open },
  table: { alignSelf: 'stretch', gap: spacing.xs, padding: spacing.sm, borderRadius: radii.md, backgroundColor: '#1F1656' },
  headRow: { flexDirection: 'row', gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  nameCol: { width: 64 },
  cell: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radii.sm, backgroundColor: colors.glass, borderWidth: 2, borderStyle: 'solid', borderColor: 'transparent' },
  cellSelected: { borderColor: colors.gold },
  highlight: { borderColor: '#FFE58A', borderWidth: 3 },
  palette: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm },
  option: { minHeight: 44, paddingHorizontal: spacing.md, alignItems: 'center', justifyContent: 'center', borderRadius: radii.pill, backgroundColor: colors.surface, borderWidth: 1.5, borderStyle: 'solid', borderColor: colors.glassBorder },
  pressed: { transform: [{ scale: 0.94 }] },
});

export const logicGridUi: GameUi<GridState, GridAction> = {
  gameId: 'W2-G04',
  howToPlay: [
    'Each traveller carries a different item and sets out at a different time of day.',
    'Read the clue tiles, then tap a cell and choose its item or time.',
    'Clues tick green when your entries satisfy them and turn red when your entries break them.',
    'There is exactly one answer. Fill every cell correctly to finish.',
  ],
  tutorials: GRID_TUTORIALS.map((t) => ({ seed: t.id, difficulty: t.difficulty, intro: t.intro })),
  Board,
  statusLine: (s) => `Clues ${s.clues.length} · Filled ${s.item.filter((v) => v !== null).length + s.time.filter((v) => v !== null).length}/${s.n * (s.useTimes ? 2 : 1)}`,
  levelNote: () => null,
  successMessage: () => 'Every clue fits. Case closed!',
  scoreExplanation: (s, { hintsUsed }) => `100 for solving the grid${hintsUsed ? `, ${hintsUsed} hint${hintsUsed === 1 ? '' : 's'} used` : ''}. Extra changes beyond twice the cells reduce the bonus a little.`,
  starsFor: (score) => (score >= 140 ? 3 : score >= 120 ? 2 : 1),
};
