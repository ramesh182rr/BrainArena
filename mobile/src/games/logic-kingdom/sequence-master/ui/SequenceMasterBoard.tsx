import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, colors, radii, spacing, typography, useHaptics } from '@/design-system';
import type { GameBoardProps, GameUi } from '@/games/ui';

import { blankId, SEQ_TUTORIALS, terms, type SequenceAction, type SequenceState } from '../logic';

function Board({ state, onAction, highlightIds, disabled }: GameBoardProps<SequenceState, SequenceAction>) {
  const haptics = useHaptics();
  if (state.done) return <AppText tone="success" style={styles.center}>All sequences complete!</AppText>;
  const r = state.rounds[state.round]!;
  const t = terms(r);
  const blankAt = new Map(r.blanks.map((b, i) => [b, i]));
  const press = (a: SequenceAction) => {
    haptics.tap();
    onAction(a);
  };
  return (
    <View style={styles.wrapper}>
      <AppText variant="label" tone="gold">
        Sequence {state.round + 1} of {state.rounds.length}
      </AppText>
      <View style={styles.row} accessibilityLabel="Sequence">
        {t.map((v, i) => {
          const b = blankAt.get(i);
          const gap = i > 0 && state.showSteps && !blankAt.has(i) && !blankAt.has(i - 1) ? v - t[i - 1]! : null;
          return (
            <View key={i} style={styles.termWrap}>
              {b === undefined ? (
                <View style={styles.term} accessible accessibilityLabel={`Term ${i + 1}: ${v}`}>
                  <AppText style={styles.termText}>{v}</AppText>
                </View>
              ) : (
                <Pressable
                  testID={blankId(b)}
                  accessibilityRole="button"
                  accessibilityLabel={`Blank ${b + 1}${state.entries[b] ? `, entered ${state.entries[b]}` : ', empty'}`}
                  disabled={disabled}
                  onPress={() => press({ type: 'select', blank: b })}
                  style={[
                    styles.term,
                    styles.blank,
                    state.active === b && styles.active,
                    state.wrong?.[b] && styles.wrong,
                    highlightIds.includes(blankId(b)) && styles.highlight,
                  ]}
                >
                  <AppText style={styles.termText}>{state.entries[b] || '?'}</AppText>
                </Pressable>
              )}
              <AppText variant="caption" tone="muted" style={styles.gap}>
                {gap === null ? ' ' : gap >= 0 ? `+${gap}` : `${gap}`}
              </AppText>
            </View>
          );
        })}
      </View>
      {state.wrong ? (
        <AppText tone="danger" accessibilityLiveRegion="polite">
          Not quite. Check the red boxes.
        </AppText>
      ) : null}
      <View style={styles.keys}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((d) => (
          <Pressable key={d} accessibilityRole="button" accessibilityLabel={`Digit ${d}`} disabled={disabled} onPress={() => press({ type: 'digit', digit: d })} style={({ pressed }) => [styles.key, pressed && styles.pressed]}>
            <AppText style={styles.keyText}>{d}</AppText>
          </Pressable>
        ))}
        <Pressable accessibilityRole="button" accessibilityLabel="Delete" disabled={disabled} onPress={() => press({ type: 'backspace' })} style={({ pressed }) => [styles.key, pressed && styles.pressed]}>
          <AppText style={styles.keyText}>⌫</AppText>
        </Pressable>
      </View>
      <View style={styles.actions}>
        <Button label={state.showSteps ? 'Hide gaps' : 'Show gaps'} variant="secondary" size="sm" disabled={disabled} onPress={() => onAction({ type: 'toggleSteps' })} />
        <Button label="Check" variant="play" size="sm" disabled={disabled || state.entries.some((e) => e === '')} onPress={() => onAction({ type: 'check' })} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', gap: spacing.md },
  center: { textAlign: 'center' },
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.xs },
  termWrap: { alignItems: 'center' },
  term: { minWidth: 48, height: 52, paddingHorizontal: 6, borderRadius: radii.sm, backgroundColor: '#2A1F6B', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderStyle: 'solid', borderColor: 'rgba(255,255,255,0.12)' },
  termText: { ...typography.heading, color: '#FFFFFF' },
  blank: { borderColor: colors.gold, borderStyle: 'dashed' },
  active: { borderStyle: 'solid', borderWidth: 3, backgroundColor: '#3B2A8F' },
  wrong: { borderColor: colors.danger, borderStyle: 'solid' },
  highlight: { borderColor: '#FFE58A', borderWidth: 4, borderStyle: 'solid' },
  gap: { minHeight: 18 },
  keys: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm, maxWidth: 330 },
  key: { width: 56, height: 52, borderRadius: radii.md, backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder, alignItems: 'center', justifyContent: 'center' },
  keyText: { ...typography.heading, color: '#FFFFFF' },
  pressed: { transform: [{ scale: 0.93 }] },
  actions: { flexDirection: 'row', gap: spacing.md },
});

export const sequenceMasterUi: GameUi<SequenceState, SequenceAction> = {
  gameId: 'W2-G03',
  howToPlay: [
    'Each sequence grows by repeating a short cycle of steps, like +3 then ×2.',
    'Tap a blank and type the missing number.',
    'Show gaps reveals the jump between neighbouring numbers.',
    'Every blank has exactly one answer that fits the pattern.',
  ],
  tutorials: SEQ_TUTORIALS.map((t) => ({ seed: t.id, difficulty: t.difficulty, intro: t.intro })),
  Board,
  statusLine: (s) => `Sequence ${Math.min(s.round + 1, s.rounds.length)}/${s.rounds.length} · Misses ${s.misses}`,
  levelNote: () => null,
  successMessage: () => 'Every pattern cracked.',
  scoreExplanation: (s, { hintsUsed }) => `100 for completing every sequence. ${s.misses} wrong check${s.misses === 1 ? '' : 's'}${hintsUsed ? `, ${hintsUsed} hint${hintsUsed === 1 ? '' : 's'}` : ''}.`,
  starsFor: (score) => (score >= 140 ? 3 : score >= 120 ? 2 : 1),
};
