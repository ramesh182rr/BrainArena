import { useNavigation } from '@react-navigation/native';

import type { RootNavigation } from '@/app/navigation/types';
import { AppText, Card, Screen, worldAccents } from '@/design-system';
import { gamesInWorld, playableCount, worlds } from '@/games/catalogue';

export function ExploreScreen() {
  const navigation = useNavigation<RootNavigation>();
  return (
    <Screen scroll edges={['left', 'right']}>
      <AppText tone="secondary">Six puzzle worlds. Explore freely, in any order.</AppText>
      {worlds.map((world) => {
        const playable = playableCount(world.id);
        const total = gamesInWorld(world.id).length;
        return (
          <Card
            key={world.id}
            accentColor={worldAccents[world.id].primary}
            onPress={() => navigation.navigate('World', { worldId: world.id })}
            accessibilityLabel={`${world.title}. ${world.tagline}. ${playable} of ${total} games playable.`}
            testID={`world-${world.id}`}
          >
            <AppText variant="heading">{world.title}</AppText>
            <AppText tone="secondary">{world.tagline}</AppText>
            <AppText variant="caption" tone="secondary">
              {playable} of {total} games playable
            </AppText>
          </Card>
        );
      })}
    </Screen>
  );
}
