import type {
  DifficultyBand,
  GameHint,
  GameModule,
  GameStatus,
  HintTier,
  PuzzleLevel,
} from './contracts';
import {
  GAME_EVENT_PAYLOAD_VERSION,
  type GameEvent,
  type GameEventType,
  type RuntimeDeps,
} from './events';
import { canTransition, transition } from './lifecycle';

export type SessionMode = 'explore' | 'arena';

/**
 * One attempt at one level. Plain JSON data so it can be stored in SQLite
 * and restored after the app is killed.
 */
export interface GameSession<TState = unknown> {
  sessionId: string;
  gameId: string;
  gameVersion: string;
  mode: SessionMode;
  level: PuzzleLevel<TState>;
  state: TState;
  status: GameStatus;
  /** Accepted actions only; invalid actions are not counted. */
  moves: number;
  hintsUsed: number;
  /** Set once, when the level ends. Null while in progress or if abandoned. */
  outcome: 'succeeded' | 'failed' | null;
  /** Set together with `outcome`; 0 for a failed level. */
  score: number | null;
  startedAt: string;
  endedAt: string | null;
  /** Milliseconds spent in `playing`, excluding pauses. */
  activeMs: number;
  /** Start of the current `playing` stretch, or null when not playing. */
  activeSince: string | null;
}

export interface StepResult<TState> {
  session: GameSession<TState>;
  events: GameEvent[];
}

export class LevelUnavailableError extends Error {
  constructor(gameId: string, reasonCode: string) {
    super(`No valid level available for ${gameId}: ${reasonCode}`);
    this.name = 'LevelUnavailableError';
  }
}

/**
 * Generates a level and validates it before it can be shown (FR-022).
 * Falls back to the module's curated level when generation throws or is invalid (FR-026).
 */
export function prepareLevel<TState, TAction>(
  module: GameModule<TState, TAction>,
  seed: string,
  difficulty: DifficultyBand,
): PuzzleLevel<TState> {
  try {
    const level = module.createLevel(seed, difficulty);
    if (module.validateLevel(level).valid) return level;
  } catch {
    // Fall through to the curated fallback.
  }
  const fallback = module.fallbackLevel(difficulty);
  const result = module.validateLevel(fallback);
  if (!result.valid) {
    throw new LevelUnavailableError(module.id, result.reasonCode ?? 'fallback_invalid');
  }
  return { ...fallback, source: 'fallback' };
}

function elapsedMs(fromIso: string, toIso: string): number {
  const ms = Date.parse(toIso) - Date.parse(fromIso);
  // Device clocks can move backwards; never record negative play time.
  return Number.isFinite(ms) && ms > 0 ? ms : 0;
}

function stopClock<TState>(session: GameSession<TState>, now: string): number {
  return session.activeSince ? session.activeMs + elapsedMs(session.activeSince, now) : session.activeMs;
}

function makeEvent<TState>(
  session: GameSession<TState>,
  type: GameEventType,
  now: string,
  deps: RuntimeDeps,
  extra: GameEvent['payload'] = {},
): GameEvent {
  return {
    eventId: deps.newId(),
    type,
    occurredAt: now,
    gameId: session.gameId,
    gameVersion: session.gameVersion,
    payloadVersion: GAME_EVENT_PAYLOAD_VERSION,
    payload: {
      sessionId: session.sessionId,
      levelId: session.level.levelId,
      seed: session.level.seed,
      generatorVersion: session.level.generatorVersion,
      difficulty: session.level.difficulty,
      levelSource: session.level.source,
      ...extra,
    },
  };
}

export interface StartOptions {
  seed: string;
  difficulty: DifficultyBand;
  mode?: SessionMode;
}

export function startSession<TState, TAction>(
  module: GameModule<TState, TAction>,
  options: StartOptions,
  deps: RuntimeDeps,
): StepResult<TState> {
  const level = prepareLevel(module, options.seed, options.difficulty);
  const now = deps.now();
  const status = transition(transition('loading', 'LOADED'), 'START');
  const session: GameSession<TState> = {
    sessionId: deps.newId(),
    gameId: module.id,
    gameVersion: module.version,
    mode: options.mode ?? 'explore',
    level,
    state: level.initialState,
    status,
    moves: 0,
    hintsUsed: 0,
    outcome: null,
    score: null,
    startedAt: now,
    endedAt: null,
    activeMs: 0,
    activeSince: now,
  };
  return { session, events: [makeEvent(session, 'game_started', now, deps, { mode: session.mode })] };
}

/**
 * Applies a game action. Ignored (same session returned, no events) unless the
 * session is `playing` and the module accepts the action, so invalid input can
 * never corrupt state and completion can only trigger once.
 */
export function submitAction<TState, TAction>(
  module: GameModule<TState, TAction>,
  session: GameSession<TState>,
  action: TAction,
  deps: RuntimeDeps,
): StepResult<TState> {
  if (session.status !== 'playing') return { session, events: [] };
  const nextState = module.reduce(session.state, action);
  if (nextState === session.state) return { session, events: [] };

  const now = deps.now();
  const moves = session.moves + 1;
  let next: GameSession<TState> = { ...session, state: nextState, moves };
  const events = [makeEvent(next, 'action_submitted', now, deps, { moves })];

  const complete = module.isComplete(nextState);
  const failed = !complete && (module.isFailed?.(nextState) ?? false);
  if (complete || failed) {
    const activeMs = stopClock(next, now);
    const score = complete ? module.score(nextState, { moves, hintsUsed: next.hintsUsed }) : 0;
    next = {
      ...next,
      status: transition(next.status, complete ? 'SUCCEED' : 'FAIL'),
      outcome: complete ? 'succeeded' : 'failed',
      score,
      endedAt: now,
      activeMs,
      activeSince: null,
    };
    events.push(
      makeEvent(next, complete ? 'level_completed' : 'level_failed', now, deps, {
        moves,
        hintsUsed: next.hintsUsed,
        durationMs: activeMs,
        score,
      }),
    );
  }
  return { session: next, events };
}

export function pauseSession<TState>(session: GameSession<TState>, deps: RuntimeDeps): StepResult<TState> {
  if (!canTransition(session.status, 'PAUSE')) return { session, events: [] };
  const now = deps.now();
  const next: GameSession<TState> = {
    ...session,
    status: transition(session.status, 'PAUSE'),
    activeMs: stopClock(session, now),
    activeSince: null,
  };
  return { session: next, events: [makeEvent(next, 'game_paused', now, deps)] };
}

export function resumeSession<TState>(session: GameSession<TState>, deps: RuntimeDeps): StepResult<TState> {
  if (!canTransition(session.status, 'RESUME')) return { session, events: [] };
  const next: GameSession<TState> = {
    ...session,
    status: transition(session.status, 'RESUME'),
    activeSince: deps.now(),
  };
  return { session: next, events: [] };
}

export interface HintStepResult<TState> extends StepResult<TState> {
  hint: GameHint | null;
}

/** Progressive hints: each request moves one tier up, capped at tier 3. */
export function requestHint<TState, TAction>(
  module: GameModule<TState, TAction>,
  session: GameSession<TState>,
  deps: RuntimeDeps,
): HintStepResult<TState> {
  if (session.status !== 'playing' || !module.hint) return { session, events: [], hint: null };
  const tier = Math.min(session.hintsUsed + 1, 3) as HintTier;
  const hint = module.hint(session.state, tier);
  const next: GameSession<TState> = { ...session, hintsUsed: session.hintsUsed + 1 };
  return {
    session: next,
    events: [makeEvent(next, 'hint_requested', deps.now(), deps, { tier, hintsUsed: next.hintsUsed })],
    hint,
  };
}

export function showSummary<TState>(session: GameSession<TState>): GameSession<TState> {
  return { ...session, status: transition(session.status, 'SHOW_SUMMARY') };
}

export function exitSession<TState>(session: GameSession<TState>, deps: RuntimeDeps): StepResult<TState> {
  if (!canTransition(session.status, 'EXIT')) return { session, events: [] };
  const now = deps.now();
  const next: GameSession<TState> = {
    ...session,
    status: transition(session.status, 'EXIT'),
    endedAt: session.endedAt ?? now,
    activeMs: stopClock(session, now),
    activeSince: null,
  };
  return {
    session: next,
    events: [makeEvent(next, 'game_exited', now, deps, { completed: next.outcome === 'succeeded', moves: next.moves })],
  };
}

const SNAPSHOT_VERSION = 1;

/** Serialises a session for local persistence. */
export function serializeSession<TState>(session: GameSession<TState>): string {
  return JSON.stringify({ v: SNAPSHOT_VERSION, session });
}

/**
 * Restores a persisted session, or returns null when the snapshot is unreadable
 * or was written by a different game version (the board may no longer be valid).
 * A session that was `playing` when the app died comes back `paused`; the time
 * between the last save and the kill is not counted as play time.
 */
export function restoreSession<TState, TAction>(
  module: GameModule<TState, TAction>,
  snapshot: string,
): GameSession<TState> | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(snapshot);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const { v, session } = parsed as { v?: unknown; session?: Partial<GameSession<TState>> };
  if (v !== SNAPSHOT_VERSION || typeof session !== 'object' || session === null) return null;
  if (session.gameId !== module.id || session.gameVersion !== module.version) return null;
  if (
    typeof session.sessionId !== 'string' ||
    typeof session.status !== 'string' ||
    typeof session.moves !== 'number' ||
    typeof session.hintsUsed !== 'number' ||
    typeof session.activeMs !== 'number' ||
    typeof session.startedAt !== 'string' ||
    session.level === undefined ||
    session.state === undefined
  ) {
    return null;
  }
  const restored = session as GameSession<TState>;
  if (restored.status === 'playing') {
    return { ...restored, status: 'paused', activeSince: null };
  }
  return restored;
}
