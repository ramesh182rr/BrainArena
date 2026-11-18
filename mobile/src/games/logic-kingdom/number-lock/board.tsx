import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { AppText, Button, colors, radii, spacing, useHaptics } from '@/design-system';
import type { GameBoardProps, GameUi } from '@/games/ui';

import { countKey, keyId, LOCK_TUTORIALS, tumblerId, type Attempt, type LockAction, type LockState, type Signal } from './logic';

const SIGNAL = {
  exact: { color: '#5BE38F', word: 'exact' },
  near: { color: '#FFD23F', word: 'one away' },
  far: { color: '#8C84C4', word: 'far' },
} as const;

/** ● exact, ◐ near, ○ far: shape carries the meaning, colour only reinforces it. */
export function SignalGlyph({ signal, size = 18 }: { signal: Signal; size?: number }) {
  const c = size / 2;
  const r = size / 2 - 2;
  const color = SIGNAL[signal].color;
  return (
    <Svg width={size} height={size}>
      <Circle cx={c} cy={c} r={r} fill={signal === 'exact' ? color : 'none'} stroke={color} strokeWidth={2} />
      {signal === 'near' ? <Path d={`M ${c} ${c - r} A ${r} ${r} 0 0 1 ${c} ${c + r} Z`} fill={color} /> : null}
    </Svg>
  );
}

function AttemptRow({ attempt, positional, index }: { attempt: Attempt; positional: boolean; index: number }) {
  const [e, n] = countKey(attempt.signals).split(',').map(Number) as [number, number];
  const f = attempt.signals.length - e - n;
  const label = positional
    ? `Try ${index + 1}: ${attempt.code.map((d, i) => `${d} ${SIGNAL[attempt.signals[i]!].word}`).join(', ')}`
    : `Try ${index + 1}: ${attempt.code.join(' ')}. ${e} exact, ${n} one away, ${f} far.`;
  return (
    <View style={styles.attempt} accessible accessibilityLabel={label}>
      <AppText variant="caption" tone="muted" style={styles.tryNo}>
        {index + 1}
      </AppText>
      <View style={styles.codeRow}>
        {attempt.code.map((d, i) => (
          <View key={i} style={styles.miniTumbler}>
            <AppText variant="label">{d}</AppText>
            {positional ? <SignalGlyph signal={attempt.signals[i]!} size={14} /> : null}
          </View>
        ))}
      </View>
      {!positional ? (
        <View style={styles.counts}>
          {(['exact', 'near', 'far'] as const).map((k) => (
            <View key={k} style={styles.count}>
              <SignalGlyph signal={k} size={14} />
              <AppText variant="caption">{k === 'exact' ? e : k === 'near' ? n : f}</AppText>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function Board({ state, onAction, highlightIds, disabled }: GameBoardProps<LockState, LockAction>) {
  const haptics = useHaptics();
  const ready = state.entry.every((e) => e !== null);
  return (
    <View style={styles.wrapper}>
      {state.sumClue !== null ? (
        <AppText variant="label" tone="gold" style={styles.center}>
          Clue: the digits add up to {state.sumClue}.
        </AppText>
      ) : null}
      <View style={styles.lock}>
        {state.entry.map((d, i) => (
          <Pressable
            key={i}
            testID={tumblerId(i)}
            accessibilityRole="button"
            accessibilityLabel={`Tumbler ${i + 1}: ${d ?? 'empty'}`}
            accessibilityState={{ selected: state.cursor === i }}
            disabled={disabled || state.solved}
            onPress={() => onAction({ type: 'select', index: i })}
            style={[styles.tumbler, state.cursor === i && !state.solved && styles.tumblerSelected, highlightIds.includes(tumblerId(i)) && styles.highlight, state.solved && styles.tumblerOpen]}
          >
            <AppText variant="title">{d ?? '·'}</AppText>
          </Pressable>
        ))}
      </View>
      <View style={styles.keys}>
        {Array.from({ length: state.maxDigit }, (_, k) => k + 1).map((d) => (
          <Pressable
            key={d}
            testID={keyId(d)}
            accessibilityRole="button"
            accessibilityLabel={`Digit ${d}`}
            disabled={disabled || state.solved}
            onPress={() => {
              haptics.tap();
              onAction({ type: 'digit', value: d });
            }}
            style={({ pressed }) => [styles.key, pressed && styles.pressed]}
          >
            <AppText variant="heading">{d}</AppText>
          </Pressable>
        ))}
      </View>
      <View style={styles.row}>
        <Button label="Clear" variant="secondary" size="sm" disabled={disabled || state.solved} onPress={() => onAction({ type: 'clear' })} />
        <Button label="Try code" variant="play" size="sm" disabled={disabled || !ready || state.solved} onPress={() => onAction({ type: 'submit' })} />
      </View>
      <View style={styles.legend} accessible accessibilityLabel="Legend: filled circle exact, half circle one away, empty circle far">
        {(['exact', 'near', 'far'] as const).map((k) => (
          <View key={k} style={styles.count}>
            <SignalGlyph signal={k} size={14} />
            <AppText variant="caption" tone="secondary">
              {SIGNAL[k].word}
            </AppText>
          </View>
        ))}
      </View>
      <View style={styles.history} accessibilityLiveRegion="polite">
        {[...state.attempts].map((a, i) => ({ a, i })).reverse().map(({ a, i }) => (
          <AttemptRow key={i} attempt={a} positional={state.positional} index={i} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', gap: spacing.md, alignSelf: 'stretch' },
  center: { textAlign: 'center', alignSelf: 'stretch' },
  lock: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderRadius: radii.lg, backgroundColor: '#1F1656', borderWidth: 2, borderStyle: 'solid', borderColor: colors.glassBorder },
  tumbler: { width: 52, height: 68, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 2, borderStyle: 'solid', borderColor: 'transparent' },
  tumblerSelected: { borderColor: colors.gold },
  tumblerOpen: { borderColor: '#5BE38F' },
  highlight: { borderColor: '#FFE58A', borderWidth: 4 },
  keys: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' },
  key: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.glass, borderWidth: 1.5, borderStyle: 'solid', borderColor: colors.glassBorder },
  pressed: { transform: [{ scale: 0.92 }] },
  row: { flexDirection: 'row', gap: spacing.md },
  legend: { flexDirection: 'row', gap: spacing.md },
  history: { alignSelf: 'stretch', gap: spacing.xs },
  attempt: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.xs, borderRadius: radii.sm, backgroundColor: 'rgba(10,6,30,0.35)' },
  tryNo: { width: 20, textAlign: 'center' },
  codeRow: { flexDirection: 'row', gap: spacing.xs },
  miniTumbler: { width: 30, alignItems: 'center', gap: 2 },
  counts: { flexDirection: 'row', gap: spacing.sm, marginLeft: 'auto' },
  count: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});

export const numberLockUi: GameUi<LockState, LockAction> = {
  gameId: 'W2-G05',
  howToPlay: [
    'Set each tumbler with the number keys (tap a tumbler to change it), then press Try code.',
    'Every try lights the tumblers: ● exact, ◐ one away (the digit is one higher or lower), ○ further off.',
    'Harder locks only tell you how many tumblers are exact, near or far, not which ones.',
    'Tries are unlimited. Crack it in few tries for a bigger bonus.',
  ],
  tutorials: LOCK_TUTORIALS.map((t) => ({ seed: t.id, difficulty: t.difficulty, intro: t.intro })),
  Board,
  statusLine: (s) => `Tries ${s.attempts.length} · Par ${s.par}`,
  levelNote: (s) => (!s.positional ? 'This lock reports only counts, not positions.' : null),
  successMessage: (s) => `Unlocked in ${s.attempts.length} ${s.attempts.length === 1 ? 'try' : 'tries'}.`,
  scoreExplanation: (s, { hintsUsed }) => `100 for opening the lock. ${s.attempts.length} tries against a par of ${s.par}${hintsUsed ? `, ${hintsUsed} hint${hintsUsed === 1 ? '' : 's'}` : ''}.`,
  starsFor: (score) => (score >= 140 ? 3 : score >= 120 ? 2 : 1),
};
