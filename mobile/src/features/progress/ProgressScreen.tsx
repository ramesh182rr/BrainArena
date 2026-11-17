import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';

import { useAppServices } from '@/app/services';
import type { SessionRecord } from '@/data/repositories/sessionRepository';
import { AppText, Card, Screen, spacing } from '@/design-system';
import { getGame } from '@/games/catalogue';

import { capitalise, formatDuration } from '../game/format';

function outcomeText(r: SessionRecord): string {
  if (r.outcome === 'succeeded') return `Solved · score ${r.score ?? 0}`;
  if (r.outcome === 'failed') return 'Not solved';
  if (r.status === 'exited') return 'Left unfinished';
  return 'In progress';
}

export function ProgressScreen() {
  const { store, profile } = useAppServices();
  const [records, setRecords] = useState<SessionRecord[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      store.sessions.listRecent(profile.id, 30).then(
        (rows) => active && setRecords(rows),
        () => active && setRecords([]),
      );
      return () => {
        active = false;
      };
    }, [store, profile]),
  );

  return (
    <Screen scroll edges={['left', 'right']}>
      <AppText tone="secondary">Your recent play on this device. Trends and achievements come later.</AppText>
      {records && records.length === 0 ? <AppText>No games played yet. Pick a puzzle from Explore.</AppText> : null}
      {records?.map((r) => (
        <Card key={r.id}>
          <AppText variant="label">{getGame(r.gameId)?.title ?? r.gameId}</AppText>
          <AppText tone="secondary">{outcomeText(r)}</AppText>
          <AppText variant="caption" tone="secondary" style={styles.meta}>
            {r.levelSeed.startsWith('tutorial') ? 'Tutorial' : capitalise(r.difficulty)} · {r.moves} moves ·{' '}
            {formatDuration(r.activeMs)}
          </AppText>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  meta: { marginTop: spacing.xs },
});
