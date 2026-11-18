import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { useAppServices } from '@/app/services';
import type { DifficultyBand, GameHint, GameModule } from '@/game-runtime/contracts';
import {
  exitSession,
  pauseSession,
  requestHint,
  restoreSession,
  resumeSession,
  showSummary,
  startSession,
  submitAction,
  type GameSession,
  type StepResult,
} from '@/game-runtime/session';

export interface GameSessionController {
  session: GameSession | null;
  loadError: string | null;
  /** True when the last save failed; play continues and the next step retries. */
  saveFailed: boolean;
  hint: GameHint | null;
  act: (action: unknown) => void;
  askHint: () => void;
  pause: () => void;
  resume: () => void;
  /** Moves a finished session through summary to exited and returns it. */
  finish: () => GameSession | null;
}

/**
 * Connects one play screen to the pure runtime and the local store. Every
 * runtime step is persisted with its events, so progress survives the app
 * being closed at any moment (FR-013, FR-050).
 */
export function useGameSession(
  module: GameModule,
  params: { seed: string; difficulty: DifficultyBand; resume: boolean; mode?: 'arena' },
): GameSessionController {
  const { store, profile, deps } = useAppServices();
  const [session, setSession] = useState<GameSession | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const [hint, setHint] = useState<GameHint | null>(null);
  const ref = useRef<GameSession | null>(null);

  const commit = useCallback(
    (step: StepResult<unknown>) => {
      if (step.session === ref.current && step.events.length === 0) return;
      ref.current = step.session;
      setSession(step.session);
      store.recordStep(profile, step.session, step.events).then(
        () => setSaveFailed(false),
        () => setSaveFailed(true),
      );
    },
    [store, profile],
  );

  const { seed, difficulty, resume, mode } = params;
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (resume) {
          const snapshot = await store.sessions.findResumableSnapshot(profile.id, module.id);
          const restored = snapshot ? restoreSession(module, snapshot) : null;
          if (cancelled) return;
          if (restored) {
            commit(restored.status === 'paused' ? resumeSession(restored, deps) : { session: restored, events: [] });
            return;
          }
        }
        // Starting a new level closes any older unfinished one for this game.
        await store.sessions.abandonUnfinished(profile.id, module.id, deps.now());
        if (cancelled) return;
        commit(startSession(module, { seed, difficulty, mode: mode ?? 'explore' }, deps));
      } catch (error) {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : String(error));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [module, seed, difficulty, resume, mode, store, profile, deps, commit]);

  // Pause (and save) when the app is backgrounded or the screen is left mid-level.
  useEffect(() => {
    const pauseIfPlaying = () => {
      if (ref.current?.status === 'playing') commit(pauseSession(ref.current, deps));
    };
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'active') pauseIfPlaying();
    });
    return () => {
      sub.remove();
      pauseIfPlaying();
    };
  }, [commit, deps]);

  const act = useCallback(
    (action: unknown) => {
      if (!ref.current) return;
      const step = submitAction(module, ref.current, action, deps);
      if (step.session !== ref.current) setHint(null);
      commit(step);
    },
    [module, deps, commit],
  );

  const askHint = useCallback(() => {
    if (!ref.current) return;
    const result = requestHint(module, ref.current, deps);
    commit(result);
    setHint(result.hint);
  }, [module, deps, commit]);

  const pause = useCallback(() => {
    if (ref.current) commit(pauseSession(ref.current, deps));
  }, [deps, commit]);

  const resumePlay = useCallback(() => {
    if (ref.current) commit(resumeSession(ref.current, deps));
  }, [deps, commit]);

  const finish = useCallback(() => {
    if (!ref.current) return null;
    const result = exitSession(showSummary(ref.current), deps);
    commit(result);
    return result.session;
  }, [deps, commit]);

  return { session, loadError, saveFailed, hint, act, askHint, pause, resume: resumePlay, finish };
}
