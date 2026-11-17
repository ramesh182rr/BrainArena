import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { RootScreenProps } from '@/app/navigation/types';
import { useAppServices } from '@/app/services';
import { AppText, Button, Card, colors, minTouchTarget, radii, Screen, spacing, worldAccents } from '@/design-system';
import { DIFFICULTY_BANDS, type DifficultyBand } from '@/game-runtime/contracts';
import { getGame, getWorld, isPlayable } from '@/games/catalogue';
import { getGameUi } from '@/games/ui';

import { capitalise } from './format';
import { nextTutorial, seedFromId } from './levelPlan';

interface Progress {
  completedSeeds: Set<string>;
  canResume: boolean;
  best: number | null;
}

export function GameIntroScreen({ route, navigation }: RootScreenProps<'GameIntro'>) {
  const { gameId } = route.params;
  const { store, profile, deps } = useAppServices();
  const game = getGame(gameId);
  const ui = getGameUi(gameId);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [band, setBand] = useState<DifficultyBand>('easy');

  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([
        store.sessions.completedSeeds(profile.id, gameId),
        store.sessions.findResumableSnapshot(profile.id, gameId),
        store.sessions.bestScore(profile.id, gameId),
      ]).then(
        ([completedSeeds, snapshot, best]) => {
          if (active) setProgress({ completedSeeds, canResume: snapshot !== null, best });
        },
        () => {
          if (active) setProgress({ completedSeeds: new Set(), canResume: false, best: null });
        },
      );
      return () => {
        active = false;
      };
    }, [store, profile, gameId]),
  );

  if (!game) return null;
  const accent = worldAccents[game.worldId];
  const playable = isPlayable(gameId) && ui !== undefined;
  const tutorial = ui && progress ? nextTutorial(ui.tutorials, progress.completedSeeds) : null;
  const tutorialsDone = ui && progress ? ui.tutorials.filter((t) => progress.completedSeeds.has(t.seed)).length : 0;

  const play = (seed: string, difficulty: DifficultyBand, resume = false) =>
    navigation.navigate('Play', { gameId, seed, difficulty, resume });

  return (
    <Screen scroll edges={['left', 'right', 'bottom']}>
      <Card accentColor={accent.primary}>
        <AppText variant="caption" tone="secondary">
          {getWorld(game.worldId).title} · {game.mechanic}
        </AppText>
        <AppText style={styles.topGap}>{game.summary}</AppText>
        <AppText variant="caption" tone="secondary" style={styles.topGap}>
          {game.offline ? 'Works offline' : 'Needs a connection'} · Not timed
        </AppText>
      </Card>

      {!playable ? (
        <AppText tone="secondary">This game is still in development.</AppText>
      ) : (
        <>
          <View style={styles.section}>
            <AppText variant="heading">How to play</AppText>
            {ui!.howToPlay.map((line) => (
              <AppText key={line}>• {line}</AppText>
            ))}
          </View>

          {progress?.canResume ? <Button label="Continue saved level" onPress={() => play('', 'easy', true)} /> : null}

          <View style={styles.section}>
            <AppText variant="heading">Tutorial</AppText>
            <AppText tone="secondary">
              {tutorialsDone} of {ui!.tutorials.length} complete
            </AppText>
            {tutorial ? (
              <Button
                label={`Start tutorial ${ui!.tutorials.indexOf(tutorial) + 1}`}
                variant={progress?.canResume ? 'secondary' : 'primary'}
                onPress={() => play(tutorial.seed, tutorial.difficulty)}
              />
            ) : (
              <Button label="Replay tutorial 1" variant="secondary" onPress={() => play(ui!.tutorials[0]!.seed, ui!.tutorials[0]!.difficulty)} />
            )}
          </View>

          <View style={styles.section}>
            <AppText variant="heading">Puzzles</AppText>
            <View accessibilityRole="radiogroup" accessibilityLabel="Difficulty" style={styles.chips}>
              {DIFFICULTY_BANDS.map((b) => {
                const selected = b === band;
                return (
                  <Pressable
                    key={b}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={capitalise(b)}
                    onPress={() => setBand(b)}
                    style={[styles.chip, selected && styles.chipSelected]}
                  >
                    <AppText variant="label" tone={selected ? 'onDark' : 'primary'}>
                      {capitalise(b)}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
            <Button
              label={`Play ${capitalise(band)}`}
              variant={tutorial || progress?.canResume ? 'secondary' : 'primary'}
              onPress={() => play(seedFromId(deps.newId()), band)}
            />
            {progress?.best != null ? <AppText tone="secondary">Personal best: {progress.best}</AppText> : null}
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  topGap: { marginTop: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minHeight: minTouchTarget,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: colors.primary,
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  chipSelected: { backgroundColor: colors.primary },
});
