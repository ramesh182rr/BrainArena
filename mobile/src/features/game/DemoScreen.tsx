import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import type { RootScreenProps } from '@/app/navigation/types';
import { AppText, Button, colors, Icon, radii, Screen, spacing, useReduceMotion } from '@/design-system';
import { getGame } from '@/games/catalogue';
import { DEMOS, type DemoStep } from '@/games/demos';
import { getGameModule } from '@/games/registry';
import { getGameUi } from '@/games/ui';

import { ScreenHeader } from '../common/ScreenHeader';

/** How long the highlight shows before the demo performs the step. */
const LOOK_MS = 1100;
/** Pause between steps so each change can be seen. */
const BETWEEN_MS = 650;

function Pulse({ children }: { children: ReactNode }) {
  const reduce = useReduceMotion();
  const s = useSharedValue(1);
  useEffect(() => {
    if (!reduce) s.value = withRepeat(withSequence(withTiming(1.04, { duration: 500 }), withTiming(1, { duration: 500 })), -1);
  }, [reduce, s]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

/**
 * Plays a game's first tutorial by itself: each step highlights what to tap,
 * explains why, then performs it on the real board. The player can stop at any
 * time and jump straight into the tutorial.
 */
export function DemoScreen({ route, navigation }: RootScreenProps<'Demo'>) {
  const { gameId } = route.params;
  const [run, setRun] = useState(0);
  const module = getGameModule(gameId);
  const ui = getGameUi(gameId);
  const demo = DEMOS[gameId];
  const game = getGame(gameId);
  if (!module || !ui || !demo || !game) {
    return (
      <Screen header={<ScreenHeader title="Demo" onBack={() => navigation.goBack()} />}>
        <AppText>No demo for this game yet.</AppText>
      </Screen>
    );
  }
  const tutorial = ui.tutorials[0];
  const startTutorial = () => tutorial && navigation.replace('Play', { gameId, seed: tutorial.seed, difficulty: tutorial.difficulty, resume: false });
  return (
    <Screen scroll header={<ScreenHeader title={game.title} subtitle="How to play" onBack={() => navigation.goBack()} />}>
      <DemoPlayer key={run} gameId={gameId} onAgain={() => setRun((r) => r + 1)} onPlay={startTutorial} onBack={() => navigation.goBack()} />
    </Screen>
  );
}

function DemoPlayer({ gameId, onAgain, onPlay, onBack }: { gameId: string; onAgain: () => void; onPlay: () => void; onBack: () => void }) {
  const module = getGameModule(gameId)!;
  const ui = getGameUi(gameId)!;
  const demo = DEMOS[gameId]!;
  const [initial] = useState<unknown>(() => module.createLevel(demo.seed, demo.difficulty).initialState);
  const [state, setState] = useState<unknown>(initial);
  const [shown, setShown] = useState<DemoStep | null>(null);
  const [done, setDone] = useState(false);
  const [blink, setBlink] = useState(true);
  const next = useMemo(() => (module.isComplete(state) ? null : demo.next(state)), [module, demo, state]);
  const waiting = !!next && !next.action && !!next.until && !next.until(state);

  // Drive the demo: show the highlight, then act, whenever the board changes.
  useEffect(() => {
    if (done) return;
    if (!next) {
      const hold = setTimeout(() => setDone(true), 1500 + (ui.finishDelayMs ? ui.finishDelayMs(state) : 0));
      return () => clearTimeout(hold);
    }
    if (waiting || !next.action) return;
    const pause = state === initial ? 500 : BETWEEN_MS;
    const look = setTimeout(() => setShown(next), pause);
    const act = setTimeout(() => setState((s: unknown) => module.reduce(s, next.action)), pause + LOOK_MS);
    return () => {
      clearTimeout(look);
      clearTimeout(act);
    };
  }, [next, waiting, done, state, initial, module, ui]);

  useEffect(() => {
    const id = setInterval(() => setBlink((b) => !b), 350);
    return () => clearInterval(id);
  }, []);

  const current = shown === next ? shown : null;
  const caption = done ? null : waiting ? next!.caption : (current?.caption ?? 'Watch: the board plays itself.');
  const { Board } = ui;
  return (
    <>
      <View style={styles.caption} accessibilityLiveRegion="polite">
        <View style={styles.badge}>
          <Icon name="play" size={16} color={colors.textOnGold} />
        </View>
        {done ? (
          <Animated.View key="done" entering={FadeIn} style={styles.flex}>
            <AppText variant="heading">That&apos;s it! Your turn.</AppText>
          </Animated.View>
        ) : (
          <Animated.View key={caption ?? ''} entering={FadeIn.duration(250)} exiting={FadeOut.duration(150)} style={styles.flex}>
            <AppText variant="label">{caption}</AppText>
          </Animated.View>
        )}
      </View>
      {/* The board is live but untouchable: only the demo (and the board's own timers) act on it. */}
      <View pointerEvents="none" style={styles.board}>
        <Board state={state as never} onAction={(a: unknown) => setState((s: unknown) => module.reduce(s, a))} highlightIds={blink && current ? (current.highlightIds ?? []) : []} disabled={false} />
      </View>
      {done ? (
        <Pulse>
          <Button label="Play the first tutorial" variant="play" size="lg" icon={<Icon name="play" size={24} color={colors.textOnGold} />} onPress={onPlay} />
        </Pulse>
      ) : null}
      <View style={styles.row}>
        <Button label={done ? 'Watch again' : 'Skip demo'} variant="secondary" onPress={done ? onAgain : onPlay} style={styles.flex} />
        <Button label="Back" variant="secondary" onPress={onBack} style={styles.flex} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  caption: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 64, padding: spacing.md, borderRadius: radii.md, backgroundColor: 'rgba(255,210,63,0.14)', borderWidth: 1.5, borderStyle: 'solid', borderColor: colors.gold },
  badge: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.gold },
  board: { padding: spacing.md, borderRadius: radii.lg, backgroundColor: 'rgba(10,6,30,0.55)', borderWidth: 1.5, borderStyle: 'solid', borderColor: colors.glassBorder },
  row: { flexDirection: 'row', gap: spacing.md },
});
