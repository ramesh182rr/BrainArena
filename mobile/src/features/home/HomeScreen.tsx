import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useState } from 'react';

import type { RootNavigation } from '@/app/navigation/types';
import { useAppServices } from '@/app/services';
import { AppText, Button, Card, Screen, worldAccents } from '@/design-system';
import { games, getGame, getWorld, isPlayable } from '@/games/catalogue';

export function HomeScreen() {
  const navigation = useNavigation<RootNavigation>();
  const { store, profile } = useAppServices();
  const [resumeGameId, setResumeGameId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      store.sessions.findLatestResumable(profile.id).then(
        (found) => active && setResumeGameId(found && isPlayable(found.gameId) ? found.gameId : null),
        () => active && setResumeGameId(null),
      );
      return () => {
        active = false;
      };
    }, [store, profile]),
  );

  const resumeGame = resumeGameId ? getGame(resumeGameId) : undefined;
  const playable = games.filter((g) => isPlayable(g.id));

  return (
    <Screen scroll edges={['left', 'right']}>
      <AppText variant="title">Ready for a puzzle?</AppText>

      {resumeGame ? (
        <Card accentColor={worldAccents[resumeGame.worldId].primary} testID="continue-card">
          <AppText variant="caption" tone="secondary">
            Continue where you left off
          </AppText>
          <AppText variant="heading">{resumeGame.title}</AppText>
          <Button
            label="Continue"
            onPress={() => navigation.navigate('Play', { gameId: resumeGame.id, seed: '', difficulty: 'easy', resume: true })}
          />
        </Card>
      ) : null}

      <AppText variant="heading">Play now</AppText>
      {playable.map((game) => (
        <Card
          key={game.id}
          accentColor={worldAccents[game.worldId].primary}
          onPress={() => navigation.navigate('GameIntro', { gameId: game.id })}
          accessibilityLabel={`${game.title}, ${getWorld(game.worldId).title}`}
        >
          <AppText variant="heading">{game.title}</AppText>
          <AppText tone="secondary">{game.summary}</AppText>
        </Card>
      ))}

      <Card>
        <AppText variant="heading">Daily Arena</AppText>
        <AppText tone="secondary">
          A short daily mix picked from the games you enjoy. Coming once more games are ready.
        </AppText>
      </Card>

      <Button label="Explore all worlds" variant="secondary" onPress={() => navigation.navigate('Tabs', { screen: 'Explore' })} />
    </Screen>
  );
}
