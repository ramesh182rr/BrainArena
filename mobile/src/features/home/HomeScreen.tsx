import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import type { RootNavigation } from '@/app/navigation/types';
import { useAppServices } from '@/app/services';
import { AppText, Button, Card, colors, Icon, Pill, radii, Screen, spacing, worldAccents } from '@/design-system';
import { games, gamesInWorld, getWorld, isPlayable, playableCount, worlds } from '@/games/catalogue';
import { getGameUi } from '@/games/ui';

import { PlayerHud } from '../common/PlayerHud';
import { WorldEmblem } from '../common/WorldEmblem';
import { playTarget, seedFromId } from '../game/levelPlan';
import { starsBySeed } from '../progress/rewards';
import { useRewards } from '../progress/useRewards';

export function HomeScreen() {
  const navigation = useNavigation<RootNavigation>();
  const { store, profile, deps } = useAppServices();
  const { bests, rewards } = useRewards();
  const [resumeGameId, setResumeGameId] = useState<string | null>(null);
  const [lastGameId, setLastGameId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      store.sessions.findLatestResumable(profile.id).then(
        (found) => active && setResumeGameId(found && isPlayable(found.gameId) ? found.gameId : null),
        () => active && setResumeGameId(null),
      );
      store.sessions.listRecent(profile.id, 1).then(
        ([latest]) => active && setLastGameId(latest && isPlayable(latest.gameId) ? latest.gameId : null),
        () => undefined,
      );
      return () => {
        active = false;
      };
    }, [store, profile]),
  );

  // Feature the unfinished game, else the one played last, else the first playable game.
  const featured =
    games.find((g) => g.id === resumeGameId) ?? games.find((g) => g.id === lastGameId) ?? games.find((g) => isPlayable(g.id));
  const featuredUi = featured ? getGameUi(featured.id) : undefined;

  const play = () => {
    if (!featured || !featuredUi) return;
    const completed = new Set(starsBySeed(bests, featured.id).keys());
    const target = playTarget(featuredUi.tutorials, completed, resumeGameId === featured.id, () => seedFromId(deps.newId()));
    navigation.navigate('Play', { gameId: featured.id, ...target });
  };

  return (
    <Screen scroll>
      <PlayerHud rewards={rewards} />

      <View style={styles.logo} accessible accessibilityRole="header" accessibilityLabel="BrainArena Solo">
        <AppText variant="hero" shadow>
          BrainArena
        </AppText>
        <View style={styles.soloRow}>
          <Pill label="SOLO" tone="gold" />
          <AppText variant="caption" tone="muted">
            Think · Play · Discover
          </AppText>
        </View>
      </View>

      {featured ? (
        <View style={styles.hero}>
          <LinearGradient colors={worldAccents[featured.worldId].gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroBg} />
          <LinearGradient colors={['rgba(18,11,51,0)', 'rgba(18,11,51,0.65)']} style={styles.heroBg} />
          <View style={styles.heroRow}>
            <View style={styles.heroText}>
              <AppText variant="caption" tone="primary" shadow>
                {resumeGameId === featured.id ? 'Continue your puzzle' : getWorld(featured.worldId).title}
              </AppText>
              <AppText variant="display" shadow>
                {featured.title}
              </AppText>
              <AppText tone="primary" shadow numberOfLines={2}>
                {featured.mechanic}
              </AppText>
            </View>
            <WorldEmblem worldId={featured.worldId} size={110} />
          </View>
          <Button
            label={resumeGameId === featured.id ? 'Continue' : 'Play'}
            variant="play"
            size="lg"
            icon={<Icon name="play" size={26} color={colors.textOnGold} />}
            onPress={play}
            testID="home-play"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`About ${featured.title}`}
            onPress={() => navigation.navigate('GameIntro', { gameId: featured.id })}
            style={styles.heroLink}
          >
            <AppText variant="label" tone="primary" shadow>
              Levels &amp; how to play ›
            </AppText>
          </Pressable>
        </View>
      ) : null}

      <Card accentColor={colors.gold} testID="arena-banner" accessibilityLabel="Daily Arena. Coming soon.">
        <View style={styles.arenaRow}>
          <View style={styles.trophy}>
            <Icon name="arena" size={30} color={colors.textOnGold} />
          </View>
          <View style={styles.flex}>
            <AppText variant="heading">Daily Arena</AppText>
            <AppText tone="muted">A short daily mix of your favourite puzzles.</AppText>
          </View>
          <Pill label="Soon" icon={<Icon name="lock" size={14} color={colors.textPrimary} />} />
        </View>
      </Card>

      <View style={styles.sectionHead}>
        <AppText variant="title" shadow>
          Worlds
        </AppText>
        <Pressable accessibilityRole="button" onPress={() => navigation.navigate('Tabs', { screen: 'Explore' })} accessibilityLabel="See all worlds">
          <AppText variant="label" tone="gold">
            See map ›
          </AppText>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carousel}>
        {worlds.map((world, i) => (
          <Pressable
            key={world.id}
            accessibilityRole="button"
            accessibilityLabel={`${world.title}. ${playableCount(world.id)} of ${gamesInWorld(world.id).length} games playable.`}
            onPress={() => navigation.navigate('World', { worldId: world.id })}
            style={({ pressed }) => [styles.worldChip, pressed && styles.pressed]}
          >
            <WorldEmblem worldId={world.id} size={92} delayMs={i * 300} />
            <AppText variant="label" style={styles.center} numberOfLines={2}>
              {world.title}
            </AppText>
            <AppText variant="caption" tone="muted">
              {playableCount(world.id)}/{gamesInWorld(world.id).length} open
            </AppText>
          </Pressable>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  logo: { alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm },
  soloRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  hero: { borderRadius: radii.lg, padding: spacing.lg, gap: spacing.md, overflow: 'hidden', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)' },
  heroBg: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  heroText: { flex: 1, gap: spacing.xs },
  heroLink: { alignSelf: 'center', padding: spacing.sm, minHeight: 44, justifyContent: 'center' },
  arenaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  trophy: { width: 52, height: 52, borderRadius: 16, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  carousel: { gap: spacing.md, paddingRight: spacing.lg },
  worldChip: {
    width: 128,
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  center: { textAlign: 'center' },
  pressed: { transform: [{ scale: 0.96 }] },
});
