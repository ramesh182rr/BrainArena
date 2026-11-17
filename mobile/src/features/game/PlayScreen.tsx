import { ActivityIndicator, StyleSheet, View } from 'react-native';

import type { RootScreenProps } from '@/app/navigation/types';
import { AppText, Button, Card, colors, Screen, spacing } from '@/design-system';
import { getGameModule } from '@/games/registry';
import { getGameUi } from '@/games/ui';

import { capitalise } from './format';
import { levelLabel } from './levelPlan';
import { useGameSession } from './useGameSession';

export function PlayScreen({ route, navigation }: RootScreenProps<'Play'>) {
  const { gameId } = route.params;
  const module = getGameModule(gameId);
  const ui = getGameUi(gameId);
  if (!module || !ui) {
    return (
      <Screen edges={['left', 'right', 'bottom']}>
        <AppText>This game is not available yet.</AppText>
        <Button label="Go back" onPress={() => navigation.goBack()} />
      </Screen>
    );
  }
  return <PlayView {...{ route, navigation }} />;
}

function PlayView({ route, navigation }: RootScreenProps<'Play'>) {
  const { gameId, seed, difficulty, resume } = route.params;
  const module = getGameModule(gameId)!;
  const ui = getGameUi(gameId)!;
  const game = useGameSession(module, { seed, difficulty, resume });
  const { session } = game;

  if (game.loadError) {
    return (
      <Screen edges={['left', 'right', 'bottom']}>
        <AppText variant="heading">This level could not be loaded</AppText>
        <AppText tone="secondary">Please try another level. Your other progress is safe.</AppText>
        <Button label="Go back" onPress={() => navigation.goBack()} />
      </Screen>
    );
  }
  if (!session) {
    return (
      <Screen edges={['left', 'right', 'bottom']} contentStyle={styles.center}>
        <ActivityIndicator color={colors.primary} accessibilityLabel="Preparing level" />
      </Screen>
    );
  }

  const level = session.level;
  const tutorial = ui.tutorials.find((t) => t.seed === level.seed);
  const note = ui.levelNote(session.state);
  const playing = session.status === 'playing';
  const finished = session.status === 'succeeded' || session.status === 'failed';
  const { Board } = ui;

  const seeResults = () => {
    const ended = game.finish() ?? session;
    navigation.replace('Summary', {
      gameId,
      seed: level.seed,
      difficulty: level.difficulty,
      outcome: ended.outcome === 'succeeded' ? 'succeeded' : 'failed',
      score: ended.score ?? 0,
      moves: ended.moves,
      hintsUsed: ended.hintsUsed,
      activeMs: ended.activeMs,
      explanation: ui.scoreExplanation(ended.state, { moves: ended.moves, hintsUsed: ended.hintsUsed }),
    });
  };

  return (
    <Screen scroll edges={['left', 'right', 'bottom']}>
      <View style={styles.header}>
        <AppText variant="label">{levelLabel(ui.tutorials, { seed: level.seed, difficulty: level.difficulty })}</AppText>
        <AppText tone="secondary" accessibilityLabel={ui.statusLine(session.state).replace('·', ',')}>
          {ui.statusLine(session.state)}
        </AppText>
      </View>
      {level.source === 'fallback' ? (
        <AppText variant="caption" tone="secondary">
          Showing a hand-made {capitalise(level.difficulty).toLowerCase()} board.
        </AppText>
      ) : null}
      {tutorial ? <AppText>{tutorial.intro}</AppText> : null}
      {note ? (
        <AppText variant="caption" tone="secondary">
          {note}
        </AppText>
      ) : null}

      <Board state={session.state} onAction={game.act} highlightIds={game.hint?.highlightIds ?? []} disabled={!playing} />

      {game.hint && playing ? (
        <Card accentColor={colors.focus} testID="hint-card">
          <AppText variant="label">Hint {game.hint.tier}</AppText>
          <AppText accessibilityLiveRegion="polite">{game.hint.text}</AppText>
        </Card>
      ) : null}

      {game.saveFailed ? (
        <AppText variant="caption" style={styles.warning} accessibilityRole="alert">
          Progress could not be saved just now. We&apos;ll try again on your next move.
        </AppText>
      ) : null}

      {finished ? (
        <Card accentColor={session.status === 'succeeded' ? colors.success : colors.danger}>
          <AppText variant="heading" accessibilityLiveRegion="assertive">
            {session.status === 'succeeded' ? 'Every receiver is powered!' : 'Out of options this time.'}
          </AppText>
          <Button label="See results" onPress={seeResults} style={styles.topGap} />
        </Card>
      ) : session.status === 'paused' ? (
        <Card testID="pause-card">
          <AppText variant="heading">Paused</AppText>
          <AppText tone="secondary">Your board is saved. You can leave and continue later.</AppText>
          <View style={styles.row}>
            <Button label="Resume" onPress={game.resume} />
            <Button label="Leave" variant="secondary" onPress={() => navigation.goBack()} />
          </View>
        </Card>
      ) : (
        <View style={styles.toolbar}>
          {ui.undoAction ? <Button label="Undo" variant="secondary" onPress={() => game.act(ui.undoAction)} disabled={!playing} /> : null}
          {ui.resetAction ? <Button label="Reset" variant="secondary" onPress={() => game.act(ui.resetAction)} disabled={!playing} /> : null}
          {module.hint ? (
            <Button
              label="Hint"
              variant="secondary"
              onPress={game.askHint}
              disabled={!playing}
              accessibilityHint="Shows a hint. Each hint is a little more specific."
            />
          ) : null}
          <Button label="Pause" variant="secondary" onPress={game.pause} disabled={!playing} />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' },
  row: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, flexWrap: 'wrap' },
  topGap: { marginTop: spacing.md },
  warning: { color: colors.danger },
});
