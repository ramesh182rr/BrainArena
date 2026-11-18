import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { StyleSheet, View } from 'react-native';

import type { RootScreenProps } from '@/app/navigation/types';
import { AppText, Card, colors, Icon, Pill, radii, Screen, spacing, useReduceMotion, worldAccents } from '@/design-system';
import { GameIcon } from '@/games/GameIcon';
import { gamesInWorld, getWorld, isPlayable } from '@/games/catalogue';

import { ScreenHeader } from '../common/ScreenHeader';
import { WorldEmblem } from '../common/WorldEmblem';
import { starsBySeed } from '../progress/rewards';
import { useRewards } from '../progress/useRewards';

export function WorldScreen({ route, navigation }: RootScreenProps<'World'>) {
  const reduceMotion = useReduceMotion();
  const world = getWorld(route.params.worldId);
  const accent = worldAccents[world.id];
  const { bests } = useRewards();

  return (
    <Screen scroll header={<ScreenHeader title={world.title} onBack={() => navigation.goBack()} />}>
      <View style={styles.hero}>
        <LinearGradient colors={[...accent.gradient]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <LinearGradient colors={['rgba(18,11,51,0)', 'rgba(18,11,51,0.6)']} style={StyleSheet.absoluteFill} />
        <WorldEmblem worldId={world.id} size={150} />
        <AppText shadow style={styles.center}>
          {world.tagline}
        </AppText>
      </View>

      {gamesInWorld(world.id).map((game, index) => {
        const playable = isPlayable(game.id);
        const stars = [...starsBySeed(bests, game.id).values()].reduce((a, b) => a + b, 0);
        return (
          <Animated.View key={game.id} {...(reduceMotion ? {} : { entering: FadeInDown.delay(index * 70).springify().damping(14) })}>
          <Card
            testID={`game-${game.id}`}
            muted={!playable}
            {...(playable
              ? { accentColor: accent.primary, onPress: () => navigation.navigate('GameIntro', { gameId: game.id }) }
              : {})}
            accessibilityLabel={`${game.title}. ${game.mechanic}. ${playable ? 'Ready to play' : 'In development'}.`}
          >
            <View style={styles.row}>
              <LinearGradient colors={playable ? [...accent.gradient] : ['#4A3E8C', '#2C2072']} style={styles.badge}>
                {playable ? <GameIcon gameId={game.id} size={44} delayMs={index * 400} /> : <Icon name="lock" size={22} color={colors.textMuted} />}
              </LinearGradient>
              <View style={styles.flex}>
                <AppText variant="heading">{game.title}</AppText>
                <AppText tone="muted" numberOfLines={1}>
                  {game.mechanic}
                </AppText>
              </View>
              {playable ? (
                <View style={styles.right}>
                  <Pill label={`${stars}`} tone="dark" icon={<Icon name="star" size={14} color={colors.star} />} accessibilityLabel={`${stars} stars`} />
                </View>
              ) : (
                <Pill label="Soon" tone="dark" />
              )}
            </View>
          </Card>
          </Animated.View>
        );
      })}
      <View style={styles.footer}>
        <AppText variant="caption" tone="muted" style={styles.center}>
          New games arrive in this world as they are finished.
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: radii.lg, overflow: 'hidden', alignItems: 'center', padding: spacing.lg, gap: spacing.sm, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)' },
  center: { textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  badge: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  right: { alignItems: 'flex-end' },
  footer: { alignItems: 'center', gap: spacing.xs, opacity: 0.7 },
});
