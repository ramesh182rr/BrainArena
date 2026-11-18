import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { AppText, Button, colors, radii, spacing, useHaptics } from '@/design-system';
import type { GameBoardProps, GameUi } from '@/games/ui';

import { cardId, currentRules, goalMet, goalText, pileId, REFRAME_TUTORIALS, ruleText, type ReframeAction, type ReframeState } from './logic';

function Sparks({ n }: { n: number }) {
  const shown = Math.min(n, 12);
  return (
    <Svg width={64} height={52}>
      {Array.from({ length: shown }, (_, i) => (
        <Circle key={i} cx={10 + (i % 4) * 14} cy={44 - Math.floor(i / 4) * 14} r={6} fill="#FFD23F" stroke="#FFFFFF" strokeWidth={1.5} />
      ))}
    </Svg>
  );
}

function Board({ state, onAction, highlightIds, disabled }: GameBoardProps<ReframeState, ReframeAction>) {
  const haptics = useHaptics();
  const [card, setCard] = useState<number | null>(null);
  const rules = currentRules(state);
  const left = state.maxMoves - state.moves.length;
  return (
    <View style={styles.wrapper}>
      <View style={styles.goal} accessible accessibilityLabel={`Goal: ${goalText(state.goal)}`}>
        <AppText variant="label" tone="gold">
          Goal
        </AppText>
        <AppText variant="heading" style={styles.center}>
          {goalText(state.goal)}
        </AppText>
        <AppText variant="caption" tone="secondary">
          {left} move{left === 1 ? '' : 's'} left
        </AppText>
      </View>
      <View style={styles.piles}>
        {state.piles.map((n, i) => (
          <Pressable
            key={i}
            testID={pileId(i)}
            accessibilityRole="button"
            accessibilityLabel={`Pile ${i + 1}: ${n} spark${n === 1 ? '' : 's'}${card !== null ? '. Tap to use the chosen card here.' : ''}`}
            disabled={disabled || card === null}
            onPress={() => {
              if (card === null) return;
              haptics.tap();
              onAction({ type: 'use', card, pile: i });
              setCard(null);
            }}
            style={[styles.pile, card !== null && styles.pileReady, highlightIds.includes(pileId(i)) && styles.highlight]}
          >
            <Sparks n={n} />
            <AppText variant="label">{n}</AppText>
          </Pressable>
        ))}
      </View>
      <View style={styles.cards}>
        {state.cards.map((_, i) => {
          const flipped = state.flipped[i]!;
          return (
            <View key={i} testID={cardId(i)} style={[styles.card, flipped && styles.cardFlipped, card === i && styles.cardChosen, highlightIds.includes(cardId(i)) && styles.highlight]}>
              <AppText variant="caption" tone={flipped ? 'gold' : 'muted'}>
                {flipped ? 'Read another way' : 'Read literally'}
              </AppText>
              <AppText variant="label">{ruleText(rules[i]!)}</AppText>
              <View style={styles.cardRow}>
                <Button label={state.locked ? 'Reading locked' : 'Flip reading'} variant="secondary" size="sm" disabled={disabled || state.locked} onPress={() => onAction({ type: 'flip', card: i })} />
                <Button label={card === i ? 'Choose a pile' : 'Use'} variant={card === i ? 'primary' : 'play'} size="sm" disabled={disabled || left === 0} onPress={() => setCard(card === i ? null : i)} />
              </View>
            </View>
          );
        })}
      </View>
      {left === 0 && !goalMet(state.goal, state.piles) ? (
        <AppText variant="caption" tone="danger" style={styles.center}>
          Out of moves. Reset to try other readings.
        </AppText>
      ) : null}
      <Button label="Reset" variant="secondary" size="sm" disabled={disabled || (!state.moves.length && !state.locked)} onPress={() => onAction({ type: 'reset' })} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', gap: spacing.md, alignSelf: 'stretch' },
  center: { textAlign: 'center', alignSelf: 'stretch' },
  goal: { alignSelf: 'stretch', alignItems: 'center', gap: spacing.xs, padding: spacing.md, borderRadius: radii.md, backgroundColor: 'rgba(10,6,30,0.45)' },
  piles: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm },
  pile: { alignItems: 'center', padding: spacing.sm, borderRadius: radii.md, backgroundColor: '#2A2266', borderWidth: 2, borderStyle: 'solid', borderColor: 'transparent' },
  pileReady: { borderColor: colors.gold },
  highlight: { borderColor: '#FFE58A', borderWidth: 4 },
  cards: { alignSelf: 'stretch', gap: spacing.sm },
  card: { gap: spacing.xs, padding: spacing.md, borderRadius: radii.md, backgroundColor: colors.surface, borderWidth: 2, borderStyle: 'solid', borderColor: 'transparent' },
  cardFlipped: { backgroundColor: '#3D2E8C' },
  cardChosen: { borderColor: colors.gold },
  cardRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
});

export const impossibleAnswerUi: GameUi<ReframeState, ReframeAction> = {
  gameId: 'W1-G02',
  howToPlay: [
    'The goal looks impossible with the rule cards read literally.',
    'Every rule card can be read another way: tap Flip reading to switch it.',
    'Then use the cards: tap Use on a card, then tap a pile. Readings lock once you make a move; Reset unlocks them.',
    'Exactly one set of readings makes the goal possible within the move limit.',
  ],
  tutorials: REFRAME_TUTORIALS.map((t) => ({ seed: t.id, difficulty: t.difficulty, intro: t.intro })),
  Board,
  statusLine: (s) => `Moves ${s.moves.length}/${s.maxMoves} · Flips ${s.flips}`,
  levelNote: () => null,
  successMessage: () => 'Not so impossible after all.',
  scoreExplanation: (s, { hintsUsed }) => `100 for meeting the goal. ${s.flips} flip${s.flips === 1 ? '' : 's'}${hintsUsed ? `, ${hintsUsed} hint${hintsUsed === 1 ? '' : 's'}` : ''}.`,
  starsFor: (score) => (score >= 140 ? 3 : score >= 120 ? 2 : 1),
};
