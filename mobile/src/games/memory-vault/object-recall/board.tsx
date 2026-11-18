import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, colors, Icon, radii, spacing, useHaptics } from '@/design-system';
import type { GameBoardProps, GameUi } from '@/games/ui';

import { ObjectGlyph } from '../memory-detective/board';
import { eventText, optionId, optionText, passMark, questionText, RECALL_TUTORIALS, type RecallAction, type RecallState } from './logic';

function Board({ state, onAction, highlightIds, disabled }: GameBoardProps<RecallState, RecallAction>) {
  const haptics = useHaptics();
  const spec = state.rounds[Math.min(state.round, state.rounds.length - 1)]!;

  if (state.phase === 'story') {
    const e = state.story[state.card]!;
    return (
      <View style={styles.wrapper}>
        <AppText variant="label" tone="gold">
          Story card {state.card + 1} of {state.story.length}
        </AppText>
        <View style={styles.storyCard} accessible accessibilityLiveRegion="polite" accessibilityLabel={eventText(e)}>
          <ObjectGlyph obj={e.obj} size={72} />
          <AppText variant="heading" style={styles.center}>
            {eventText(e)}
          </AppText>
        </View>
        <Button label={state.card + 1 < state.story.length ? 'Next card' : 'Finish story'} variant="play" disabled={disabled} onPress={() => onAction({ type: 'next' })} style={styles.stretch} />
      </View>
    );
  }

  if (state.phase === 'break') {
    const [x, y] = state.breakTask[state.breakIndex]!;
    return (
      <View style={styles.wrapper}>
        <AppText variant="label" tone="gold">
          Quick break {state.breakIndex + 1} of {state.breakTask.length}
        </AppText>
        <AppText style={styles.center}>Tap the bigger number.</AppText>
        <View style={styles.row}>
          {[x, y].map((n, side) => (
            <Pressable
              key={side}
              accessibilityRole="button"
              accessibilityLabel={`Number ${n}`}
              disabled={disabled}
              onPress={() => {
                haptics.tap();
                onAction({ type: 'breakTap', side: side as 0 | 1 });
              }}
              style={({ pressed }) => [styles.number, pressed && styles.pressed]}
            >
              <AppText variant="display">{n}</AppText>
            </Pressable>
          ))}
        </View>
      </View>
    );
  }

  if (state.phase === 'quiz') {
    const q = state.questions[state.answers.length]!;
    return (
      <View style={styles.wrapper}>
        <AppText variant="label" tone="gold">
          Question {state.answers.length + 1} of {state.questions.length}
        </AppText>
        <View style={styles.storyCard}>
          {q.k !== 'first' ? <ObjectGlyph obj={q.obj} size={56} /> : null}
          <AppText variant="heading" style={styles.center} accessibilityLiveRegion="polite">
            {questionText(q)}
          </AppText>
        </View>
        <View style={styles.options}>
          {q.options.map((o, i) => (
            <Pressable
              key={o}
              testID={optionId(i)}
              accessibilityRole="button"
              accessibilityLabel={optionText(q, o)}
              disabled={disabled}
              onPress={() => {
                haptics.tap();
                onAction({ type: 'answer', option: o });
              }}
              style={({ pressed }) => [styles.option, highlightIds.includes(optionId(i)) && styles.highlight, pressed && styles.pressed]}
            >
              {q.k === 'first' ? <ObjectGlyph obj={o} size={32} /> : null}
              <AppText variant="label">{optionText(q, o)}</AppText>
            </Pressable>
          ))}
        </View>
      </View>
    );
  }

  const r = state.lastResult;
  return (
    <View style={styles.wrapper}>
      {r ? (
        <View style={styles.feedback} accessibilityLiveRegion="polite">
          <AppText variant="heading" tone={r.passed ? 'success' : 'danger'} style={styles.center}>
            {r.passed ? `${r.correct} of ${r.total} right. Well remembered!` : `${r.correct} of ${r.total} right. Not quite enough.`}
          </AppText>
          {!r.passed
            ? state.questions.map((q, i) => {
                const ok = r.answers[i] === q.answer;
                return (
                  <View key={i} style={styles.reviewRow}>
                    <Icon name={ok ? 'check' : 'cross'} size={16} color={ok ? '#5BE38F' : '#FF7A7A'} />
                    <AppText variant="caption" tone="secondary" style={styles.flex}>
                      {questionText(q)} {ok ? optionText(q, q.answer) : `It was ${optionText(q, q.answer)}, you said ${optionText(q, r.answers[i]!)}`}.
                    </AppText>
                  </View>
                );
              })
            : null}
          {!r.passed ? (
            <AppText variant="caption" tone="muted" style={styles.center}>
              Next comes a fresh story of the same length.
            </AppText>
          ) : null}
        </View>
      ) : null}
      {!state.done ? (
        <View style={styles.card}>
          <AppText variant="label" tone="gold">
            Story {state.round + 1} of {state.rounds.length}
          </AppText>
          <AppText style={styles.center}>
            {spec.events} story cards, a quick break, then {spec.questions} questions. Get {passMark(spec.questions)} right to move on.
          </AppText>
          <Button label={r && !r.passed ? 'Hear a fresh story' : 'Start the story'} variant="play" disabled={disabled} onPress={() => onAction({ type: 'begin' })} style={styles.stretch} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', gap: spacing.md, alignSelf: 'stretch' },
  center: { textAlign: 'center', alignSelf: 'stretch' },
  stretch: { alignSelf: 'stretch' },
  flex: { flex: 1 },
  card: { alignSelf: 'stretch', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: radii.md, backgroundColor: 'rgba(10,6,30,0.45)' },
  storyCard: { alignSelf: 'stretch', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: radii.lg, backgroundColor: '#2A2266', borderWidth: 1.5, borderStyle: 'solid', borderColor: colors.glassBorder },
  row: { flexDirection: 'row', gap: spacing.lg },
  number: { width: 120, height: 110, alignItems: 'center', justifyContent: 'center', borderRadius: radii.lg, backgroundColor: colors.glass, borderWidth: 1.5, borderStyle: 'solid', borderColor: colors.glassBorder },
  options: { alignSelf: 'stretch', gap: spacing.sm },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, minHeight: 52, borderRadius: radii.md, backgroundColor: colors.surface, borderWidth: 2, borderStyle: 'solid', borderColor: 'transparent' },
  highlight: { borderColor: '#FFE58A' },
  pressed: { transform: [{ scale: 0.97 }] },
  feedback: { alignSelf: 'stretch', gap: spacing.xs },
  reviewRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});

export const objectRecallUi: GameUi<RecallState, RecallAction> = {
  gameId: 'W5-G02',
  howToPlay: [
    'Read a short story one card at a time: people put objects in places and move them around.',
    'Then a quick break: tap the bigger number three times. It does not count towards your score.',
    'Answer questions about where things ended up, who handled them last, and what was put away first.',
    'Get nearly all of them right to move on. A miss shows every answer and tells a fresh story.',
  ],
  tutorials: RECALL_TUTORIALS.map((t) => ({ seed: t.id, difficulty: t.difficulty, intro: t.intro })),
  Board,
  statusLine: (s) => `Story ${Math.min(s.round + 1, s.rounds.length)}/${s.rounds.length} · Misses ${s.misses}`,
  levelNote: () => null,
  successMessage: (s) => (s.rounds.length === 1 ? 'Every detail recalled.' : `All ${s.rounds.length} stories recalled.`),
  scoreExplanation: (s, { hintsUsed }) => `100 for every story. ${s.correctTotal} of ${s.questionTotal} answers right. ${s.misses === 0 ? 'No misses.' : `${s.misses} miss${s.misses === 1 ? '' : 'es'}.`}${hintsUsed ? ` ${hintsUsed} hint${hintsUsed === 1 ? '' : 's'}.` : ''}`,
  starsFor: (score) => (score >= 140 ? 3 : score >= 120 ? 2 : 1),
};
