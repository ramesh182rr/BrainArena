import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { AppText, Button, colors, Icon, radii, spacing, useHaptics, useReduceMotion } from '@/design-system';
import type { GameBoardProps } from '@/games/ui';

import { currentExam, specimenId } from '../module';
import { describeSpecimen, observe, PROP_LABEL } from '../rules';
import type { RuleBreakerAction, RuleBreakerState, Specimen } from '../types';
import { SpecimenArt } from './SpecimenArt';
import { labColors } from './theme';
import { lastObservation, resultText, specimenLabel } from './view';

const COLUMNS = 3;

function Caption({ specimen }: { specimen: Specimen }) {
  return (
    <AppText variant="caption" tone="secondary" style={styles.center} numberOfLines={1}>
      {specimen.size === 'large' ? 'L' : 'S'} · {specimen.colour}
    </AppText>
  );
}

function Scanner({ state }: { state: RuleBreakerState }) {
  const reduceMotion = useReduceMotion();
  const pop = useSharedValue(1);
  const last = lastObservation(state);
  const key = state.tested.length;
  useEffect(() => {
    if (key > 0 && !reduceMotion) pop.value = withSequence(withTiming(0.85, { duration: 80 }), withSpring(1, { damping: 9 }));
  }, [key, reduceMotion, pop]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));

  const exam = state.lastExam;
  if (exam && !state.solved && state.phase === 'lab') {
    const right = exam.correct.filter(Boolean).length;
    return (
      <View style={[styles.scanner, styles.scannerWarn]} accessibilityLiveRegion="polite">
        <AppText variant="label" tone="danger">
          Not quite: {right} of {exam.correct.length} right
        </AppText>
        <AppText variant="caption" tone="secondary" style={styles.center}>
          Those specimens and their true results are now in your evidence. Experiment more, then try a fresh test.
        </AppText>
      </View>
    );
  }
  return (
    <Animated.View style={[styles.scanner, style]} accessibilityLiveRegion="polite">
      {last ? (
        <>
          <View style={styles.row}>
            <Icon name={last.pass ? 'check' : 'cross'} size={22} color={last.pass ? labColors.pass : labColors.fail} />
            <AppText variant="title" style={{ color: last.pass ? labColors.pass : labColors.fail }}>
              {last.pass ? 'PASS' : 'FAIL'}
            </AppText>
          </View>
          <AppText variant="caption" tone="secondary" style={styles.center}>
            {last.pass
              ? `${describeSpecimen(last.specimen)} passed.`
              : `Caused by ${last.causes.map((p) => PROP_LABEL[p]).join(' and ')}.`}
          </AppText>
        </>
      ) : (
        <AppText tone="secondary" style={styles.center}>
          Tap a specimen to scan it against the hidden rule.
        </AppText>
      )}
    </Animated.View>
  );
}

function Lab({ state, onAction, highlightIds, disabled, cardSize }: GameBoardProps<RuleBreakerState, RuleBreakerAction> & { cardSize: number }) {
  const haptics = useHaptics();
  const art = cardSize - spacing.lg;
  return (
    <>
      <Scanner state={state} />
      <View style={styles.grid} accessibilityLabel="Specimen tray">
        {state.tray.map((s, index) => {
          const tested = state.tested.includes(index);
          const o = tested ? observe(state.rule, s) : null;
          const highlighted = highlightIds.includes(specimenId(index));
          return (
            <Pressable
              key={index}
              testID={specimenId(index)}
              accessibilityRole="button"
              accessibilityLabel={specimenLabel(state, index)}
              accessibilityHint={tested ? undefined : 'Scans this specimen'}
              accessibilityState={{ disabled: disabled || tested }}
              disabled={disabled || tested}
              onPress={() => {
                haptics.tap();
                onAction({ type: 'test', index });
              }}
              style={({ pressed }) => [
                styles.card,
                { width: cardSize },
                tested && styles.cardTested,
                highlighted && styles.highlighted,
                pressed && styles.pressed,
              ]}
            >
              <SpecimenArt specimen={s} size={art} />
              <Caption specimen={s} />
              {o ? (
                <View style={[styles.result, { backgroundColor: o.pass ? labColors.pass : labColors.fail }]}>
                  <AppText variant="caption" tone="onGold" style={styles.resultText} numberOfLines={1}>
                    {o.pass ? '✓ PASS' : `✗ ${o.causes.map((p) => PROP_LABEL[p]).join('+')}`}
                  </AppText>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
      {state.revealed.length > 0 ? (
        <View style={styles.revealed}>
          <AppText variant="label">Evidence from earlier tests</AppText>
          <View style={styles.revealedRow}>
            {state.revealed.map((o, i) => (
              <View key={i} style={styles.mini} accessible accessibilityLabel={`${describeSpecimen(o.specimen)}: ${resultText(o)}`}>
                <SpecimenArt specimen={o.specimen} size={40} />
                <AppText variant="caption" style={{ color: o.pass ? labColors.pass : labColors.fail }}>
                  {o.pass ? '✓' : '✗'}
                </AppText>
              </View>
            ))}
          </View>
        </View>
      ) : null}
      <Button
        label="Take the test"
        variant="play"
        disabled={disabled}
        onPress={() => onAction({ type: 'startExam' })}
        accessibilityHint="Sort six new specimens using the rule you have worked out"
        style={styles.stretch}
      />
    </>
  );
}

function Exam({ state, onAction, disabled, cardSize }: GameBoardProps<RuleBreakerState, RuleBreakerAction> & { cardSize: number }) {
  const haptics = useHaptics();
  const exam = currentExam(state);
  // Answers belong to one exam batch; a new batch starts blank.
  const [answers, setAnswers] = useState<{ batch: number; values: (boolean | null)[] }>({ batch: state.examIndex, values: exam.map(() => null) });
  const values = answers.batch === state.examIndex ? answers.values : exam.map(() => null);
  const set = (i: number, v: boolean) => {
    haptics.tap();
    const next = [...values];
    next[i] = v;
    setAnswers({ batch: state.examIndex, values: next });
  };
  const complete = values.every((v) => v !== null);
  return (
    <>
      <View style={styles.scanner}>
        <AppText variant="heading" style={styles.center}>
          Sort these specimens
        </AppText>
        <AppText variant="caption" tone="secondary" style={styles.center}>
          Mark each one PASS or FAIL by the hidden rule.
        </AppText>
      </View>
      {exam.map((s, i) => (
        <View key={i} style={styles.examRow} testID={`exam-${i}`}>
          <SpecimenArt specimen={s} size={Math.min(64, cardSize * 0.6)} />
          <View style={styles.flex}>
            <AppText variant="label" numberOfLines={2}>
              {s.size} {s.colour} {s.shape}
            </AppText>
            <AppText variant="caption" tone="secondary">
              {s.marks} mark{s.marks === 1 ? '' : 's'}
            </AppText>
          </View>
          {(['PASS', 'FAIL'] as const).map((label) => {
            const v = label === 'PASS';
            const selected = values[i] === v;
            return (
              <Pressable
                key={label}
                accessibilityRole="radio"
                accessibilityState={{ selected, disabled }}
                accessibilityLabel={`${describeSpecimen(s)}: ${label}`}
                disabled={disabled}
                onPress={() => set(i, v)}
                style={[styles.choice, selected && { backgroundColor: v ? labColors.pass : labColors.fail, borderColor: '#FFFFFF' }]}
              >
                <AppText variant="label" tone={selected ? 'onGold' : 'primary'}>
                  {label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      ))}
      <Button
        label="Submit answers"
        variant="play"
        disabled={disabled || !complete}
        onPress={() => onAction({ type: 'submitExam', answers: values as boolean[] })}
        style={styles.stretch}
      />
      <Button label="Back to the lab" variant="secondary" disabled={disabled} onPress={() => onAction({ type: 'backToLab' })} style={styles.stretch} />
    </>
  );
}

export function RuleBreakerBoard(props: GameBoardProps<RuleBreakerState, RuleBreakerAction>) {
  const { width } = useWindowDimensions();
  // A few pixels of slack so borders and rounding never push the third card onto a new row.
  const cardSize = Math.floor((width - spacing.lg * 2 - spacing.md * 2 - spacing.sm * (COLUMNS - 1) - 6) / COLUMNS);
  return <View style={styles.wrapper}>{props.state.phase === 'exam' ? <Exam {...props} cardSize={cardSize} /> : <Lab {...props} cardSize={cardSize} />}</View>;
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', gap: spacing.md },
  center: { textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  stretch: { alignSelf: 'stretch' },
  scanner: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.md,
    minHeight: 76,
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: 'rgba(10,6,30,0.5)',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  scannerWarn: { borderColor: labColors.fail },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' },
  card: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: labColors.card,
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: 'rgba(255,255,255,0.15)',
    gap: 2,
  },
  cardTested: { backgroundColor: labColors.cardTested },
  highlighted: { borderColor: labColors.highlight, borderWidth: 4 },
  pressed: { transform: [{ scale: 0.95 }] },
  result: { marginTop: 2, paddingHorizontal: spacing.sm, borderRadius: radii.pill, maxWidth: '92%' },
  resultText: { fontSize: 12, lineHeight: 16 },
  revealed: { alignSelf: 'stretch', gap: spacing.xs },
  revealedRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  mini: { alignItems: 'center', padding: 2, borderRadius: radii.sm, backgroundColor: 'rgba(10,6,30,0.4)' },
  examRow: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: labColors.card,
  },
  choice: {
    minWidth: 64,
    minHeight: 48,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
