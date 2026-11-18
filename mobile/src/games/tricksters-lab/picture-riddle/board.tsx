import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, colors, Icon, radii, spacing, useHaptics } from '@/design-system';
import type { GameBoardProps, GameUi } from '@/games/ui';

import { ShapeGlyph } from '../../memory-vault/whats-changed/board';
import { hueName, optionId, RIDDLE_TUTORIALS, ruleText, shapeName, type Picture, type RiddleAction, type RiddleState } from './logic';

export const describePicture = (p: Picture) => `${p.count} ${p.big ? 'big' : 'small'} ${hueName(p.hue)} ${shapeName(p.shape)}${p.count === 1 ? '' : 's'}`;

function Tile({ p, size = 84 }: { p: Picture; size?: number }) {
  const glyph = (p.big ? 0.42 : 0.28) * size;
  return (
    <View style={[styles.tile, { width: size, height: size }]} accessible accessibilityLabel={describePicture(p)}>
      {Array.from({ length: p.count }, (_, i) => (
        <ShapeGlyph key={i} obj={{ shape: shapeName(p.shape), hue: hueName(p.hue) }} size={glyph} />
      ))}
    </View>
  );
}

function Board({ state, onAction, highlightIds, disabled }: GameBoardProps<RiddleState, RiddleAction>) {
  const haptics = useHaptics();
  return (
    <View style={styles.wrapper}>
      {state.examples.map(([a, b], i) => (
        <View key={i} style={styles.pair} accessible accessibilityLabel={`Example ${i + 1}: ${describePicture(a)} becomes ${describePicture(b)}`}>
          <Tile p={a} />
          <AppText variant="title" tone="gold">
            →
          </AppText>
          <Tile p={b} />
        </View>
      ))}
      <View style={[styles.pair, styles.query]}>
        <Tile p={state.query} />
        <AppText variant="title" tone="gold">
          →
        </AppText>
        {state.solved ? <Tile p={state.options[state.answer]!} /> : <View style={[styles.tile, styles.unknown]}><AppText variant="display" tone="muted">?</AppText></View>}
      </View>
      {state.solved ? (
        <View style={styles.reveal} accessibilityLiveRegion="polite">
          <AppText variant="label" tone="success">
            The rule:
          </AppText>
          {ruleText(state.rule).map((t) => (
            <AppText key={t} variant="caption" tone="secondary">
              • {t}
            </AppText>
          ))}
        </View>
      ) : (
        <View style={styles.options}>
          {state.options.map((o, i) => {
            const wrong = state.wrongPicks.includes(i);
            return (
              <Pressable
                key={i}
                testID={optionId(i)}
                accessibilityRole="button"
                accessibilityLabel={`${wrong ? 'Ruled out: ' : ''}${describePicture(o)}`}
                disabled={disabled || wrong}
                onPress={() => {
                  haptics.tap();
                  onAction({ type: 'pick', option: i });
                }}
                style={[styles.option, wrong && styles.wrong, highlightIds.includes(optionId(i)) && styles.highlight]}
              >
                <Tile p={o} size={72} />
                {wrong ? <Icon name="cross" size={18} color="#FF7A7A" /> : null}
              </Pressable>
            );
          })}
        </View>
      )}
      <View style={styles.legend} accessible accessibilityLabel={`Shape row: ${Array.from({ length: state.shapes }, (_, i) => shapeName(i)).join(', ')}. Colour row: ${Array.from({ length: state.hues }, (_, i) => hueName(i)).join(', ')}.`}>
        <View style={styles.legendRow}>
          <AppText variant="caption" tone="muted" style={styles.legendLabel}>
            Shapes
          </AppText>
          {Array.from({ length: state.shapes }, (_, i) => (
            <ShapeGlyph key={i} obj={{ shape: shapeName(i), hue: 'blue' }} size={22} />
          ))}
        </View>
        <View style={styles.legendRow}>
          <AppText variant="caption" tone="muted" style={styles.legendLabel}>
            Colours
          </AppText>
          {Array.from({ length: state.hues }, (_, i) => (
            <ShapeGlyph key={i} obj={{ shape: 'circle', hue: hueName(i) }} size={22} />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', gap: spacing.sm, alignSelf: 'stretch' },
  pair: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  query: { marginTop: spacing.sm, padding: spacing.sm, borderRadius: radii.md, backgroundColor: 'rgba(255,210,63,0.12)' },
  tile: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', alignContent: 'center', borderRadius: radii.md, backgroundColor: '#2A2266' },
  unknown: { width: 84, height: 84, borderWidth: 2, borderStyle: 'solid', borderColor: colors.gold },
  options: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.sm },
  option: { alignItems: 'center', padding: 4, borderRadius: radii.md, borderWidth: 2, borderStyle: 'solid', borderColor: 'transparent' },
  wrong: { opacity: 0.4 },
  highlight: { borderColor: '#FFE58A' },
  reveal: { alignSelf: 'stretch', gap: 2, padding: spacing.md, borderRadius: radii.md, backgroundColor: 'rgba(10,6,30,0.45)' },
  legend: { alignSelf: 'stretch', gap: spacing.xs, marginTop: spacing.sm },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  legendLabel: { width: 60 },
});

export const pictureRiddleUi: GameUi<RiddleState, RiddleAction> = {
  gameId: 'W1-G04',
  howToPlay: [
    'Each example shows a picture turning into another under one hidden rule.',
    'The rule can change the shape, the colour, how many copies there are, and big or small.',
    'Shapes and colours move along the rows shown at the bottom, wrapping round at the end.',
    'Pick the picture the same rule makes from the new card. The reveal names every change.',
  ],
  tutorials: RIDDLE_TUTORIALS.map((t) => ({ seed: t.id, difficulty: t.difficulty, intro: t.intro })),
  Board,
  statusLine: (s) => `Examples ${s.examples.length} · Choices ${s.options.length}`,
  levelNote: () => null,
  successMessage: () => 'Riddle solved: the rule fits every card.',
  scoreExplanation: (s, { hintsUsed }) => `100 for solving the riddle. ${s.wrongPicks.length} wrong pick${s.wrongPicks.length === 1 ? '' : 's'}${hintsUsed ? `, ${hintsUsed} hint${hintsUsed === 1 ? '' : 's'}` : ''}.`,
  starsFor: (score) => (score >= 140 ? 3 : score >= 120 ? 2 : 1),
};
