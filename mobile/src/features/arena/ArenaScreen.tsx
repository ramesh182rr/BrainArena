import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import type { RootNavigation } from '@/app/navigation/types';
import { useAppServices } from '@/app/services';
import { AppText, Button, Card, colors, Icon, Pill, radii, Screen, spacing, worldAccents } from '@/design-system';
import { getGame } from '@/games/catalogue';

import { WorldEmblem } from '../common/WorldEmblem';
import { bandName, totalMinutes, type DailyPick } from './dailyPlan';
import { useDailyArena } from './useDailyArena';

function longDate(date: string): string {
  const d = new Date(`${date}T12:00:00`);
  return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
}

function PickCard({ pick, done, onPlay, onSwap }: { pick: DailyPick; done: boolean; onPlay: () => void; onSwap: () => void }) {
  const game = getGame(pick.gameId);
  if (!game) return null;
  return (
    <Card accentColor={worldAccents[game.worldId].primary} testID={`arena-pick-${pick.slot}`}>
      <View style={styles.pickRow}>
        <WorldEmblem worldId={game.worldId} size={64} bob={false} />
        <View style={styles.flex}>
          <AppText variant="heading">{game.title}</AppText>
          <View style={styles.pills}>
            <Pill label={bandName(pick.difficulty)} tone="dark" />
            <Pill label={`≈ ${pick.minutes} min`} tone="dark" />
            {done ? <Pill label="Done" icon={<Icon name="check" size={14} color={colors.textPrimary} />} /> : null}
          </View>
        </View>
      </View>
      <AppText tone="secondary">{pick.reason}.</AppText>
      <AppText variant="caption" tone="muted">
        {pick.levelReason}.
      </AppText>
      <View style={styles.actions}>
        <Button
          label={done ? 'Play again' : 'Play'}
          variant={done ? 'secondary' : 'play'}
          size="sm"
          accessibilityHint={game.title}
          testID={`arena-play-${pick.slot}`}
          {...(done ? {} : { icon: <Icon name="play" size={18} color={colors.textOnGold} /> })}
          onPress={onPlay}
          style={styles.flex}
        />
        {!done ? <Button label="Swap" variant="secondary" size="sm" accessibilityHint={`Replace ${game.title} with another game`} testID={`arena-swap-${pick.slot}`} onPress={onSwap} /> : null}
      </View>
    </Card>
  );
}

/** Daily Arena (M6): an optional, explainable mix of 3–5 puzzles for today. */
export function ArenaScreen() {
  const navigation = useNavigation<RootNavigation>();
  const { store, profile } = useAppServices();
  const { plan, done, error, swap } = useDailyArena();

  const play = async (pick: DailyPick) => {
    const unfinished = await store.sessions.resumableSeed(profile.id, pick.gameId).catch(() => null);
    navigation.navigate('Play', { gameId: pick.gameId, seed: pick.seed, difficulty: pick.difficulty, resume: unfinished === pick.seed, mode: 'arena' });
  };

  const count = plan?.picks.length ?? 0;
  const finished = plan !== null && count > 0 && done.size >= count;
  return (
    <Screen scroll>
      <AppText variant="display" shadow>
        Daily Arena
      </AppText>
      <View style={styles.hero}>
        <LinearGradient colors={['#7B5CF0', '#F28BC2']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <View style={styles.trophy}>
          <Icon name="arena" size={48} color={colors.textOnGold} />
        </View>
        {plan ? (
          <>
            <AppText variant="heading" shadow style={styles.center}>
              {longDate(plan.date)}
            </AppText>
            <View style={styles.dots} accessible accessibilityLabel={`${done.size} of ${count} puzzles done today`}>
              {plan.picks.map((p) => (
                <View key={p.slot} style={[styles.dot, done.has(p.slot) && styles.dotDone]} />
              ))}
            </View>
            <AppText shadow style={styles.center}>
              {finished
                ? "Today's Arena is complete. Nice work! A new mix arrives tomorrow."
                : `${done.size} of ${count} done · about ${totalMinutes(plan)} minutes in all`}
            </AppText>
          </>
        ) : (
          <AppText shadow style={styles.center}>
            {error ? "Today's mix couldn't be prepared. Explore the worlds instead." : "Preparing today's mix…"}
          </AppText>
        )}
      </View>

      {plan?.picks.map((p) => <PickCard key={`${p.slot}-${p.gameId}`} pick={p} done={done.has(p.slot)} onPlay={() => void play(p)} onSwap={() => swap(p.slot)} />)}

      <AppText variant="caption" tone="muted" style={styles.center}>
        Picked on your phone from what you have played: something comfortable, something new, and variety across worlds. It&apos;s optional: swap
        any game, change the length in Profile, or explore freely.
      </AppText>
      <Button label="Explore worlds" variant="primary" onPress={() => navigation.navigate('Tabs', { screen: 'Explore' })} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: radii.lg, overflow: 'hidden', alignItems: 'center', gap: spacing.sm, padding: spacing.lg, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)' },
  trophy: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: '#FFFFFF' },
  center: { textAlign: 'center', alignSelf: 'stretch' },
  dots: { flexDirection: 'row', gap: spacing.sm },
  dot: { width: 16, height: 16, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.3)', borderWidth: 2, borderStyle: 'solid', borderColor: '#FFFFFF' },
  dotDone: { backgroundColor: colors.gold },
  pickRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
  flex: { flex: 1 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
});
