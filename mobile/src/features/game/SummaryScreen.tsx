import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { RootScreenProps } from '@/app/navigation/types';
import { useAppServices } from '@/app/services';
import { AppText, Button, Card, colors, Icon, radii, Screen, spacing, StarRow, useReduceMotion } from '@/design-system';
import { getGameUi } from '@/games/ui';

import { Celebration } from './Celebration';
import { formatDuration } from './format';
import { levelLabel, nextLevel, seedFromId } from './levelPlan';

const HEADLINES = ['Solved!', 'Great job!', 'Brilliant!'] as const;

/** Counts up to `target` once, or shows it immediately when motion is reduced. */
function useCountUp(target: number, reduceMotion: boolean): number {
  const [value, setValue] = useState(reduceMotion ? target : 0);
  useEffect(() => {
    if (reduceMotion) return;
    const started = Date.now();
    const id = setInterval(() => {
      const t = Math.min(1, (Date.now() - started) / 900);
      setValue(Math.round(target * (1 - (1 - t) ** 3)));
      if (t >= 1) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [target, reduceMotion]);
  return reduceMotion ? target : value;
}

export function SummaryScreen({ route, navigation }: RootScreenProps<'Summary'>) {
  const p = route.params;
  const { store, profile, deps } = useAppServices();
  const reduceMotion = useReduceMotion();
  const ui = getGameUi(p.gameId);
  const tutorials = ui?.tutorials ?? [];
  const [best, setBest] = useState<number | null>(null);
  const won = p.outcome === 'succeeded';
  const stars = won && ui ? ui.starsFor(p.score) : 0;
  const shownScore = useCountUp(p.score, reduceMotion);

  useEffect(() => {
    store.sessions.bestScore(profile.id, p.gameId).then(setBest, () => setBest(null));
  }, [store, profile, p.gameId]);

  const next = nextLevel({ seed: p.seed, difficulty: p.difficulty }, tutorials, () => seedFromId(deps.newId()));

  return (
    <Screen scroll edges={['top', 'left', 'right', 'bottom']} overlay={won ? <Celebration seed={`${p.seed}-summary`} /> : null}>
      <View style={styles.head}>
        {/* Full width: Android can clip the last glyph of shrink-wrapped centred text in custom fonts. */}
        <AppText variant="caption" tone="muted" style={styles.fullWidth}>
          {levelLabel(tutorials, { seed: p.seed, difficulty: p.difficulty })}
        </AppText>
        <AppText variant="hero" tone={won ? 'gold' : 'primary'} shadow style={styles.center}>
          {won ? HEADLINES[stars - 1] : 'Not solved this time'}
        </AppText>
        {won ? <StarRow stars={stars} size={48} animate /> : null}
      </View>

      <Card style={styles.scoreCard}>
        <AppText variant="caption" tone="muted">
          SCORE
        </AppText>
        <AppText variant="hero" tone="gold" accessible accessibilityLabel={`Score: ${p.score}`}>
          {shownScore}
        </AppText>
        {best !== null && won && best === p.score ? (
          <View style={styles.best}>
            <Icon name="star" size={16} color={colors.textOnGold} />
            <AppText variant="label" tone="onGold">
              New personal best!
            </AppText>
          </View>
        ) : best !== null ? (
          <AppText tone="muted">Personal best: {best}</AppText>
        ) : null}
      </Card>

      <View style={styles.stats}>
        <Stat label="Moves" value={String(p.moves)} />
        <Stat label="Hints" value={String(p.hintsUsed)} />
        <Stat label="Time" value={formatDuration(p.activeMs)} />
      </View>

      <Card>
        <AppText>{p.explanation}</AppText>
        <AppText variant="caption" tone="muted" style={styles.topGap}>
          Time is shown for interest only and never affects your score.
        </AppText>
      </Card>

      {p.mode === 'arena' ? (
        <Button
          label="Back to Daily Arena"
          variant="play"
          size="lg"
          icon={<Icon name="arena" size={24} color={colors.textOnGold} />}
          onPress={() => navigation.navigate('Tabs', { screen: 'Arena' })}
        />
      ) : (
        <Button
          label="Next level"
          variant="play"
          size="lg"
          icon={<Icon name="play" size={24} color={colors.textOnGold} />}
          onPress={() => navigation.replace('Play', { gameId: p.gameId, ...next, resume: false })}
        />
      )}
      <View style={styles.row}>
        <Button
          label="Replay"
          variant="primary"
          icon={<Icon name="reset" size={20} color={colors.textPrimary} />}
          onPress={() => navigation.replace('Play', { gameId: p.gameId, seed: p.seed, difficulty: p.difficulty, resume: false, ...(p.mode ? { mode: p.mode } : {}) })}
          style={styles.flex}
        />
        <Button label="Done" variant="secondary" onPress={() => navigation.goBack()} style={styles.flex} />
      </View>
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label}: ${value}`}>
      <AppText variant="caption" tone="muted">
        {label}
      </AppText>
      <AppText variant="heading">{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.lg },
  center: { textAlign: 'center' },
  fullWidth: { alignSelf: 'stretch', textAlign: 'center' },
  scoreCard: { alignItems: 'center', gap: spacing.xs },
  best: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.gold, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  stats: { flexDirection: 'row', gap: spacing.md },
  stat: { flex: 1, alignItems: 'center', padding: spacing.md, borderRadius: radii.md, backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder },
  topGap: { marginTop: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
});
