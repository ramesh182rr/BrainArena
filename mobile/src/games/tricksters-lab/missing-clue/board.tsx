import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, colors, Icon, radii, spacing, typography, useHaptics } from '@/design-system';
import type { GameBoardProps, GameUi } from '@/games/ui';

import { CLUE_TUTORIALS, clueId, clueStatus, clueText, tokenId, type ClueAction, type ClueState } from './logic';

function Token({ label, onPress, highlighted, disabled, a11y, testID }: { label: string; onPress: () => void; highlighted: boolean; disabled: boolean; a11y: string; testID: string }) {
  return (
    <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={a11y} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.token, highlighted && styles.highlight, pressed && styles.pressed]}>
      <AppText style={styles.tokenText}>{label}</AppText>
    </Pressable>
  );
}

function Board({ state, onAction, highlightIds, disabled }: GameBoardProps<ClueState, ClueAction>) {
  const haptics = useHaptics();
  const act = (a: ClueAction) => {
    haptics.tap();
    onAction(a);
  };
  const tray = state.events.map((e, i) => ({ e, i })).filter(({ i }) => !state.slots.includes(i));
  return (
    <View style={styles.wrapper}>
      <AppText variant="label" tone="gold">
        Timeline
      </AppText>
      <View style={styles.timeline}>
        {state.slots.map((ev, slot) => (
          <View key={slot} style={styles.slotWrap}>
            <AppText variant="caption" tone="muted">
              {slot + 1}
            </AppText>
            {ev === null ? (
              <View style={styles.empty} accessible accessibilityLabel={`Slot ${slot + 1}, empty`} />
            ) : (
              <Token
                testID={`slot-${slot}`}
                label={state.events[ev]!.short}
                a11y={`Slot ${slot + 1}: ${state.events[ev]!.short}. Tap to take it back.`}
                highlighted={highlightIds.includes(tokenId(ev))}
                disabled={disabled}
                onPress={() => act({ type: 'lift', slot })}
              />
            )}
          </View>
        ))}
      </View>
      <AppText variant="label" tone="gold">
        Events
      </AppText>
      <View style={styles.tray}>
        {tray.length === 0 ? (
          <AppText variant="caption" tone="muted">
            All events placed.
          </AppText>
        ) : (
          tray.map(({ e, i }) => (
            <Token
              key={e.id}
              testID={tokenId(i)}
              label={e.short}
              a11y={`${e.short}: ${e.phrase}. Tap to add to the timeline.`}
              highlighted={highlightIds.includes(tokenId(i))}
              disabled={disabled}
              onPress={() => act({ type: 'place', event: i })}
            />
          ))
        )}
      </View>
      <AppText variant="label" tone="gold">
        Clues
      </AppText>
      <View style={styles.clues}>
        {state.clues.map((c, i) => {
          const status = clueStatus(state, c);
          const text = clueText(c, state.events);
          return (
            <View
              key={i}
              style={[styles.clue, status === true && styles.ok, status === false && styles.bad, highlightIds.includes(clueId(i)) && styles.highlight]}
              accessible
              accessibilityLabel={`${text} ${status === null ? 'Not checked yet.' : status ? 'Agrees.' : 'Disagrees.'}`}
            >
              <View style={styles.badge}>
                {status === null ? <AppText tone="muted">?</AppText> : <Icon name={status ? 'check' : 'cross'} size={18} color={status ? colors.success : colors.danger} />}
              </View>
              <AppText style={styles.flex}>{text}</AppText>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.sm },
  timeline: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  slotWrap: { alignItems: 'center', gap: 2 },
  empty: { width: 86, height: 48, borderRadius: radii.md, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.glassBorder },
  tray: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, minHeight: 48 },
  token: { minWidth: 86, height: 48, paddingHorizontal: spacing.sm, borderRadius: radii.md, backgroundColor: '#3B2A8F', borderWidth: 2, borderStyle: 'solid', borderColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  tokenText: { ...typography.label, color: '#FFFFFF' },
  highlight: { borderColor: '#FFE58A', borderWidth: 4 },
  pressed: { transform: [{ scale: 0.95 }] },
  clues: { gap: spacing.xs },
  clue: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: radii.md, backgroundColor: 'rgba(10,6,30,0.4)', borderWidth: 1.5, borderStyle: 'solid', borderColor: 'transparent' },
  ok: { borderColor: colors.success },
  bad: { borderColor: colors.danger },
  badge: { width: 24, alignItems: 'center' },
  flex: { flex: 1 },
});

export const missingClueUi: GameUi<ClueState, ClueAction> = {
  gameId: 'W1-G01',
  howToPlay: [
    'Rebuild what happened: tap events into the timeline in order.',
    'Tap a placed event to take it back.',
    'Each clue shows a tick or cross as soon as you can check it.',
    'Read witness clues carefully: they only count from when the witness arrived.',
    'Exactly one order fits every clue.',
  ],
  tutorials: CLUE_TUTORIALS.map((t) => ({ seed: t.id, difficulty: t.difficulty, intro: t.intro })),
  Board,
  statusLine: (s) => `Placed ${s.slots.filter((x) => x !== null).length}/${s.slots.length} · Clues ${s.clues.length}`,
  levelNote: (s) => (s.events.some((e) => e.id === 'witness') ? 'A witness is part of this case.' : null),
  successMessage: () => 'Case closed: the timeline fits every clue.',
  scoreExplanation: (s, { hintsUsed }) => `100 for the correct timeline. ${s.moves} placements${hintsUsed ? `, ${hintsUsed} hint${hintsUsed === 1 ? '' : 's'}` : ''}.`,
  starsFor: (score) => (score >= 140 ? 3 : score >= 120 ? 2 : 1),
  undoAction: { type: 'undo' },
  resetAction: { type: 'reset' },
};
