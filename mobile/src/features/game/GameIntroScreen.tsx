import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { RootScreenProps } from '@/app/navigation/types';
import { useAppServices } from '@/app/services';
import { DEMOS } from '@/games/demos';
import { AppText, Button, Card, colors, Icon, Pill, radii, Screen, spacing, StarRow, worldAccents } from '@/design-system';
import { DIFFICULTY_BANDS, type DifficultyBand } from '@/game-runtime/contracts';
import { getGame, getWorld, isPlayable } from '@/games/catalogue';
import { getGameUi } from '@/games/ui';

import { ScreenHeader } from '../common/ScreenHeader';
import { WorldEmblem } from '../common/WorldEmblem';
import { starsBySeed } from '../progress/rewards';
import { useRewards } from '../progress/useRewards';
import { capitalise } from './format';
import { nextTutorial, seedFromId } from './levelPlan';

export function GameIntroScreen({ route, navigation }: RootScreenProps<'GameIntro'>) {
  const { gameId } = route.params;
  const { store, profile, deps } = useAppServices();
  const game = getGame(gameId);
  const ui = getGameUi(gameId);
  const { bests } = useRewards();
  const [canResume, setCanResume] = useState(false);
  const [band, setBand] = useState<DifficultyBand>('easy');

  useFocusEffect(
    useCallback(() => {
      let active = true;
      store.sessions.findResumableSnapshot(profile.id, gameId).then(
        (snapshot) => active && setCanResume(snapshot !== null),
        () => active && setCanResume(false),
      );
      return () => {
        active = false;
      };
    }, [store, profile, gameId]),
  );

  if (!game) return null;
  const accent = worldAccents[game.worldId];
  const playable = isPlayable(gameId) && ui !== undefined;
  const stars = starsBySeed(bests, gameId);
  const tutorial = ui ? nextTutorial(ui.tutorials, new Set(stars.keys())) : null;
  const solvedIn = (b: DifficultyBand) => bests.filter((x) => x.gameId === gameId && x.difficulty === b && !x.levelSeed.startsWith('tutorial')).length;

  const play = (seed: string, difficulty: DifficultyBand, resume = false) =>
    navigation.navigate('Play', { gameId, seed, difficulty, resume });

  return (
    <Screen scroll header={<ScreenHeader title={game.title} subtitle={getWorld(game.worldId).title} onBack={() => navigation.goBack()} />}>
      <View style={styles.hero}>
        <LinearGradient colors={[...accent.gradient]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <LinearGradient colors={['rgba(18,11,51,0.05)', 'rgba(18,11,51,0.7)']} style={StyleSheet.absoluteFill} />
        <WorldEmblem worldId={game.worldId} size={110} />
        <View style={styles.flex}>
          <AppText variant="label" shadow>
            {game.mechanic}
          </AppText>
          <AppText shadow>{game.summary}</AppText>
          <View style={styles.tags}>
            <Pill label={game.offline ? 'Offline' : 'Online'} tone="dark" />
            <Pill label="No timer" tone="dark" />
          </View>
        </View>
      </View>

      {!playable ? (
        <Card>
          <AppText variant="heading">In development</AppText>
          <AppText tone="muted">This puzzle is being built. Check back soon!</AppText>
        </Card>
      ) : (
        <>
          {canResume ? (
            <Button label="Continue saved level" variant="play" icon={<Icon name="play" size={22} color={colors.textOnGold} />} onPress={() => play('', 'easy', true)} />
          ) : null}

          {DEMOS[gameId] ? (
            <Card accentColor={colors.gold} onPress={() => navigation.navigate('Demo', { gameId })} testID="watch-demo" accessibilityLabel="Watch how to play. The board plays a level by itself.">
              <View style={styles.demoRow}>
                <View style={styles.demoBadge}>
                  <Icon name="play" size={26} color={colors.textOnGold} />
                </View>
                <View style={styles.flex}>
                  <AppText variant="heading">Watch how to play</AppText>
                  <AppText tone="muted">A 30-second animated demo on a real board.</AppText>
                </View>
              </View>
            </Card>
          ) : null}

          <Card>
            <AppText variant="heading">How to play</AppText>
            {ui!.howToPlay.map((line, i) => (
              <View key={line} style={styles.step}>
                <View style={styles.stepNum}>
                  <AppText variant="label" tone="onGold">
                    {i + 1}
                  </AppText>
                </View>
                <AppText style={styles.flex}>{line}</AppText>
              </View>
            ))}
          </Card>

          <AppText variant="title" shadow>
            Training path
          </AppText>
          <View style={styles.path}>
            {ui!.tutorials.map((t, i) => {
              const earned = stars.get(t.seed) ?? 0;
              const isNext = tutorial?.seed === t.seed;
              return (
                <Pressable
                  key={t.seed}
                  accessibilityRole="button"
                  accessibilityLabel={`Tutorial ${i + 1}. ${earned > 0 ? `${earned} of 3 stars` : isNext ? 'Up next' : 'Not played yet'}.`}
                  onPress={() => play(t.seed, t.difficulty)}
                  style={({ pressed }) => [styles.node, i % 2 === 1 && styles.nodeOffset, pressed && styles.pressed]}
                >
                  <LinearGradient
                    colors={earned > 0 ? ['#FFE58A', '#FFAE1A'] : isNext ? [...accent.gradient] : ['#4A3E8C', '#2C2072']}
                    style={[styles.nodeCircle, isNext && styles.nodeNext]}
                  >
                    {earned > 0 ? <Icon name="check" size={30} color={colors.textOnGold} /> : <AppText variant="title">{i + 1}</AppText>}
                  </LinearGradient>
                  <StarRow stars={earned} size={16} />
                  <AppText variant="caption" tone={isNext ? 'gold' : 'muted'} numberOfLines={1}>
                    {isNext ? 'Up next' : earned > 0 ? 'Done' : ' '}
                  </AppText>
                </Pressable>
              );
            })}
          </View>

          <Card accentColor={colors.gold}>
            <AppText variant="heading">Endless puzzles</AppText>
            <AppText tone="muted">Fresh boards every time. Pick a challenge.</AppText>
            <View accessibilityRole="radiogroup" accessibilityLabel="Difficulty" style={styles.bands}>
              {DIFFICULTY_BANDS.map((b) => {
                const selected = b === band;
                const solved = solvedIn(b);
                return (
                  <Pressable
                    key={b}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={capitalise(b)}
                    onPress={() => setBand(b)}
                    style={[styles.band, selected && styles.bandSelected]}
                  >
                    <AppText variant="label" tone={selected ? 'onGold' : 'primary'}>
                      {capitalise(b)}
                    </AppText>
                    <AppText variant="caption" tone={selected ? 'onGold' : 'muted'}>
                      {solved} solved
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
            <Button
              label={`Play ${capitalise(band)}`}
              variant={tutorial || canResume ? 'primary' : 'play'}
              icon={<Icon name="play" size={20} color={tutorial || canResume ? colors.textPrimary : colors.textOnGold} />}
              onPress={() => play(seedFromId(deps.newId()), band)}
              style={styles.topGap}
            />
          </Card>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: radii.lg, overflow: 'hidden', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)' },
  flex: { flex: 1, gap: spacing.xs },
  tags: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  step: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md, alignItems: 'flex-start' },
  stepNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  path: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-start' },
  node: { flex: 1, alignItems: 'center', gap: spacing.xs, maxWidth: 110 },
  nodeOffset: { marginTop: spacing.xl },
  nodeCircle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.6)' },
  nodeNext: { borderColor: colors.gold, shadowColor: colors.gold, shadowOpacity: 0.9, shadowRadius: 14, shadowOffset: { width: 0, height: 0 }, elevation: 10 },
  bands: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  band: {
    minHeight: 56,
    minWidth: 92,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bandSelected: { backgroundColor: colors.gold, borderColor: '#FFFFFF' },
  topGap: { marginTop: spacing.lg },
  pressed: { transform: [{ scale: 0.95 }] },
  demoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  demoBadge: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.gold, borderWidth: 3, borderStyle: 'solid', borderColor: '#FFFFFF' },
});
