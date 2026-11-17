import type { RootScreenProps } from '@/app/navigation/types';
import { AppText, Card, Screen, worldAccents } from '@/design-system';
import { gamesInWorld, getWorld, isPlayable } from '@/games/catalogue';

export function WorldScreen({ route, navigation }: RootScreenProps<'World'>) {
  const world = getWorld(route.params.worldId);
  const accent = worldAccents[world.id];
  return (
    <Screen scroll edges={['left', 'right', 'bottom']}>
      <AppText tone="secondary">{world.tagline}</AppText>
      {gamesInWorld(world.id).map((game) => {
        const playable = isPlayable(game.id);
        const status = playable ? 'Ready to play' : 'In development';
        return (
          <Card
            key={game.id}
            {...(playable
              ? { accentColor: accent.primary, onPress: () => navigation.navigate('GameIntro', { gameId: game.id }) }
              : {})}
            accessibilityLabel={`${game.title}. ${game.mechanic}. ${status}.`}
            testID={`game-${game.id}`}
          >
            <AppText variant="heading">{game.title}</AppText>
            <AppText tone="secondary">{game.mechanic}</AppText>
            <AppText variant="caption" tone="secondary">
              {status}
            </AppText>
          </Card>
        );
      })}
    </Screen>
  );
}
