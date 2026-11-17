import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useAppServices } from '@/app/services';
import type { SessionRecord } from '@/data/repositories/sessionRepository';
import { AppText, Card, colors, Icon, radii, Screen, spacing, StarRow } from '@/design-system';
import { getGame } from '@/games/catalogue';
import { getGameUi } from '@/games/ui';

import { PlayerHud } from '../common/PlayerHud';
import { capitalise, formatDuration } from '../game/format';
import { useRewards } from './useRewards';

function outcomeText(r: SessionRecord): string {
  if (r.outcome === 'succeeded') return `Solved · ${r.score ?? 0} pts`;
  if (r.outcome === 'failed') return 'Not solved';
  if (r.status === 'exited') return 'Left unfinished';
  return 'In progress';
}

export function ProgressScreen() {
  const { store, profile } = useAppServices();
  const { rewards } = useRewards();
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
    <Screen scroll>
      <AppText variant="display" shadow>
        Progress
      </AppText>
      <PlayerHud rewards={rewards} />
      <View style={styles.tiles}>
        <Tile icon="star" value={rewards.totalStars} label="Stars" />
        <Tile icon="check" value={rewards.levelsSolved} label="Levels solved" />
        <Tile icon="profile" value={rewards.explorerLevel} label="Explorer level" />
      </View>
      <AppText variant="title" shadow>
        Recent play
      </AppText>
      {records && records.length === 0 ? (
        <Card>
          <AppText>No games played yet. Pick a world and start exploring!</AppText>
        </Card>
      ) : null}
      {records?.map((r) => {
        const ui = getGameUi(r.gameId);
        const stars = r.outcome === 'succeeded' && r.score !== null && ui ? ui.starsFor(r.score) : 0;
        return (
          <Card key={r.id}>
            <View style={styles.row}>
              <View style={styles.flex}>
                <AppText variant="label">{getGame(r.gameId)?.title ?? r.gameId}</AppText>
                <AppText tone="secondary">{outcomeText(r)}</AppText>
                <AppText variant="caption" tone="muted">
                  {r.levelSeed.startsWith('tutorial') ? 'Tutorial' : capitalise(r.difficulty)} · {r.moves} moves · {formatDuration(r.activeMs)}
                </AppText>
              </View>
              {stars > 0 ? <StarRow stars={stars} size={18} /> : null}
            </View>
          </Card>
        );
      })}
    </Screen>
  );
}

function Tile({ icon, value, label }: { icon: 'star' | 'check' | 'profile'; value: number; label: string }) {
  return (
    <View style={styles.tile} accessible accessibilityLabel={`${label}: ${value}`}>
      <Icon name={icon} size={22} color={colors.gold} />
      <AppText variant="number">{value}</AppText>
      <AppText variant="caption" tone="muted" style={styles.center}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', gap: spacing.md },
  tile: { flex: 1, alignItems: 'center', gap: 2, padding: spacing.md, borderRadius: radii.md, backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder },
  center: { textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1, gap: 2 },
});
