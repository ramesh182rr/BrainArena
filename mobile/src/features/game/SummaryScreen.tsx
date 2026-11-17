import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { RootScreenProps } from '@/app/navigation/types';
import { useAppServices } from '@/app/services';
import { AppText, Button, Card, Screen, spacing } from '@/design-system';
import { getGameUi } from '@/games/ui';

import { formatDuration } from './format';
import { levelLabel, nextLevel, seedFromId } from './levelPlan';

export function SummaryScreen({ route, navigation }: RootScreenProps<'Summary'>) {
  const p = route.params;
  const { store, profile, deps } = useAppServices();
  const ui = getGameUi(p.gameId);
  const tutorials = ui?.tutorials ?? [];
  const [best, setBest] = useState<number | null>(null);

  useEffect(() => {
    store.sessions.bestScore(profile.id, p.gameId).then(setBest, () => setBest(null));
  }, [store, profile, p.gameId]);

  const won = p.outcome === 'succeeded';
  const next = nextLevel({ seed: p.seed, difficulty: p.difficulty }, tutorials, () => seedFromId(deps.newId()));

  return (
    <Screen scroll edges={['left', 'right', 'bottom']}>
      <AppText variant="title">{won ? 'Puzzle solved' : 'Not solved this time'}</AppText>
      <AppText tone="secondary">{levelLabel(tutorials, { seed: p.seed, difficulty: p.difficulty })}</AppText>

      <Card>
        <View style={styles.stats}>
          <Stat label="Score" value={String(p.score)} />
          <Stat label="Moves" value={String(p.moves)} />
          <Stat label="Hints" value={String(p.hintsUsed)} />
          <Stat label="Time" value={formatDuration(p.activeMs)} />
        </View>
        <AppText style={styles.topGap}>{p.explanation}</AppText>
        {best !== null ? (
          <AppText tone="secondary" style={styles.topGap}>
            {best === p.score && won ? 'A new personal best for this game.' : `Personal best: ${best}`}
          </AppText>
        ) : null}
        <AppText variant="caption" tone="secondary" style={styles.topGap}>
          Time is shown for interest only and never affects your score.
        </AppText>
      </Card>

      <Button label="Next level" onPress={() => navigation.replace('Play', { gameId: p.gameId, ...next, resume: false })} />
      <Button
        label="Replay this level"
        variant="secondary"
        onPress={() => navigation.replace('Play', { gameId: p.gameId, seed: p.seed, difficulty: p.difficulty, resume: false })}
      />
      <Button label="Done" variant="secondary" onPress={() => navigation.goBack()} />
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label}: ${value}`}>
      <AppText variant="caption" tone="secondary">
        {label}
      </AppText>
      <AppText variant="heading">{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  stat: { minWidth: 64 },
  topGap: { marginTop: spacing.md },
});
