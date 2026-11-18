import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import type { RootScreenProps } from '@/app/navigation/types';
import { AppText, Button, Card, colors, Icon, IconButton, Pill, radii, Screen, spacing, StarRow, useHaptics, useReduceMotion } from '@/design-system';
import { getGameModule } from '@/games/registry';
import { getGameUi } from '@/games/ui';

import { ScreenHeader } from '../common/ScreenHeader';
import { Celebration } from './Celebration';
import { capitalise } from './format';
import { levelLabel } from './levelPlan';
import { useGameSession } from './useGameSession';

/** How long a finished board stays visible before the results dialog. */
export const FINISH_HOLD_MS = 1500;

export function PlayScreen({ route, navigation }: RootScreenProps<'Play'>) {
  const module = getGameModule(route.params.gameId);
  const ui = getGameUi(route.params.gameId);
  if (!module || !ui) {
    return (
      <Screen header={<ScreenHeader title="Unavailable" onBack={() => navigation.goBack()} />}>
        <AppText>This game is not available yet.</AppText>
      </Screen>
    );
  }
  return <PlayView route={route} navigation={navigation} />;
}

function PlayView({ route, navigation }: RootScreenProps<'Play'>) {
  const { gameId, seed, difficulty, resume, mode } = route.params;
  const module = getGameModule(gameId)!;
  const ui = getGameUi(gameId)!;
  const game = useGameSession(module, mode ? { seed, difficulty, resume, mode } : { seed, difficulty, resume });
  const haptics = useHaptics();
  const { session } = game;
  const celebrated = useRef(false);

  const won = session?.status === 'succeeded';
  const ended = session?.status === 'succeeded' || session?.status === 'failed';
  const reduceMotion = useReduceMotion();
  // Hold the finished board on screen (plus any finishing animation) so the player sees how it ended,
  // then show the results dialog.
  const [revealed, setRevealed] = useState(false);
  const delay = ended && session ? FINISH_HOLD_MS + (ui.finishDelayMs && !reduceMotion ? ui.finishDelayMs(session.state) : 0) : 0;
  useEffect(() => {
    if (!ended) return;
    const id = setTimeout(() => setRevealed(true), delay);
    return () => clearTimeout(id);
  }, [ended, delay]);
  // Cheer the moment the puzzle is solved; the stars follow after the hold.
  useEffect(() => {
    if (won && !celebrated.current) {
      celebrated.current = true;
      haptics.success();
    }
  }, [won, haptics]);

  if (game.loadError) {
    return (
      <Screen header={<ScreenHeader title="Oops" onBack={() => navigation.goBack()} />}>
        <Card>
          <AppText variant="heading">This level could not be loaded</AppText>
          <AppText tone="muted">Please try another level. Your other progress is safe.</AppText>
        </Card>
      </Screen>
    );
  }
  if (!session) {
    return (
      <Screen calm contentStyle={styles.center}>
        <ActivityIndicator color={colors.gold} size="large" accessibilityLabel="Preparing level" />
      </Screen>
    );
  }

  const level = session.level;
  const tutorial = ui.tutorials.find((t) => t.seed === level.seed);
  const note = ui.levelNote(session.state);
  const playing = session.status === 'playing';
  const finished = ended && revealed;
  const holding = ended && !revealed;
  const label = levelLabel(ui.tutorials, { seed: level.seed, difficulty: level.difficulty });
  const status = ui.statusLine(session.state);
  const { Board } = ui;
  const score = session.score ?? 0;

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
      ...(ended.mode === 'arena' ? { mode: 'arena' as const } : {}),
    });
  };

  const overlay = (
    <>
      {session.status === 'paused' ? (
        <View style={styles.overlay} testID="pause-card">
          <View style={styles.dialog}>
            <AppText variant="display" style={styles.centerText}>
              Paused
            </AppText>
            <AppText tone="muted" style={styles.centerText}>
              Your board is saved. Leave any time and continue later.
            </AppText>
            <Button label="Resume" variant="play" size="lg" icon={<Icon name="play" size={24} color={colors.textOnGold} />} onPress={game.resume} />
            <Button label="Leave" variant="secondary" onPress={() => navigation.goBack()} />
          </View>
        </View>
      ) : null}

      {finished ? (
        <View style={styles.overlay}>
          {won ? <Celebration seed={session.sessionId} /> : null}
          <View style={styles.dialog}>
            <AppText variant="display" tone={won ? 'gold' : 'primary'} style={styles.centerText} accessibilityLiveRegion="assertive">
              {won ? 'Puzzle solved!' : 'Out of options'}
            </AppText>
            {won ? (
              <View style={styles.stars}>
                <StarRow stars={ui.starsFor(score)} size={44} animate />
              </View>
            ) : null}
            <AppText tone="secondary" style={styles.centerText}>
              {won ? ui.successMessage(session.state) : 'Have another go — every attempt teaches the board.'}
            </AppText>
            <Button label="See results" variant="play" size="lg" onPress={seeResults} />
          </View>
        </View>
      ) : null}
    </>
  );

  return (
    <Screen
      calm
      scroll
      overlay={overlay}
      header={
        <ScreenHeader
          title={label}
          {...(level.source === 'fallback' ? { subtitle: `Hand-made ${capitalise(level.difficulty).toLowerCase()} board` } : {})}
          backLabel="Pause and leave"
          onBack={() => {
            game.pause();
            navigation.goBack();
          }}
        />
      }
    >
      {tutorial ? (
        <Card accentColor={colors.gold}>
          <AppText>{tutorial.intro}</AppText>
        </Card>
      ) : null}
      {note ? (
        <AppText variant="caption" tone="muted">
          {note}
        </AppText>
      ) : null}

      <View style={styles.statusRow}>
        {status.split('·').map((part) => (
          <Pill key={part} label={part.trim()} tone="dark" />
        ))}
      </View>

      <View style={styles.boardFrame}>
        {holding ? (
          <View pointerEvents="none" style={styles.endBanner} accessibilityLiveRegion="assertive">
            <AppText variant="heading" tone={won ? 'gold' : 'primary'}>
              {won ? 'Solved!' : 'Out of options'}
            </AppText>
          </View>
        ) : null}
        <Board state={session.state} onAction={game.act} highlightIds={game.hint?.highlightIds ?? []} disabled={!playing} />
      </View>

      {game.hint && playing ? (
        <Card accentColor={colors.focus} testID="hint-card">
          <View style={styles.hintHead}>
            <Icon name="hint" size={20} color={colors.gold} />
            <AppText variant="label" tone="gold">
              Hint {game.hint.tier}
            </AppText>
          </View>
          <AppText accessibilityLiveRegion="polite">{game.hint.text}</AppText>
        </Card>
      ) : null}

      {game.saveFailed ? (
        <AppText variant="caption" tone="danger" accessibilityRole="alert">
          Progress could not be saved just now. We&apos;ll try again on your next move.
        </AppText>
      ) : null}

      {!finished && session.status !== 'paused' ? (
        <View style={styles.toolbar}>
          {ui.undoAction ? <IconButton icon="undo" label="Undo" onPress={() => game.act(ui.undoAction)} disabled={!playing} /> : null}
          {ui.resetAction ? <IconButton icon="reset" label="Reset" onPress={() => game.act(ui.resetAction)} disabled={!playing} /> : null}
          {module.hint ? (
            <IconButton
              icon="hint"
              label="Hint"
              onPress={game.askHint}
              disabled={!playing}
              badge={session.hintsUsed}
              accessibilityHint="Shows a hint. Each hint is a little more specific."
            />
          ) : null}
          <IconButton icon="pause" label="Pause" onPress={game.pause} disabled={!playing} />
        </View>
      ) : null}

    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  endBanner: { position: 'absolute', top: -18, alignSelf: 'center', zIndex: 2, paddingHorizontal: spacing.lg, paddingVertical: spacing.xs, borderRadius: radii.pill, backgroundColor: 'rgba(26,18,69,0.92)', borderWidth: 2, borderStyle: 'solid', borderColor: colors.gold },
  boardFrame: {
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(10,6,30,0.45)',
    borderWidth: 1.5,
    borderColor: 'rgba(160,140,255,0.45)',
  },
  statusRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
  hintHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  toolbar: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: spacing.sm },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.scrim,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    zIndex: 10,
  },
  dialog: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'stretch',
    gap: spacing.lg,
    padding: spacing.xl,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: 'rgba(255,229,138,0.5)',
  },
  centerText: { textAlign: 'center', alignSelf: 'center' },
  stars: { alignItems: 'center' },
});
