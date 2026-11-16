import type { GameStatus } from './contracts';

/** Lifecycle from PRD FR-015: load, ready, play, pause, success, fail, summary, exit. */
export type LifecycleEvent =
  | 'LOADED'
  | 'START'
  | 'PAUSE'
  | 'RESUME'
  | 'SUCCEED'
  | 'FAIL'
  | 'SHOW_SUMMARY'
  | 'EXIT';

const transitions: Record<GameStatus, Partial<Record<LifecycleEvent, GameStatus>>> = {
  loading: { LOADED: 'ready', EXIT: 'exited' },
  ready: { START: 'playing', EXIT: 'exited' },
  playing: { PAUSE: 'paused', SUCCEED: 'succeeded', FAIL: 'failed', EXIT: 'exited' },
  paused: { RESUME: 'playing', EXIT: 'exited' },
  succeeded: { SHOW_SUMMARY: 'summary', EXIT: 'exited' },
  failed: { SHOW_SUMMARY: 'summary', EXIT: 'exited' },
  summary: { EXIT: 'exited' },
  exited: {},
};

export function canTransition(status: GameStatus, event: LifecycleEvent): boolean {
  return transitions[status][event] !== undefined;
}

/** Returns the next status, or the unchanged status when the event is not allowed. */
export function transition(status: GameStatus, event: LifecycleEvent): GameStatus {
  return transitions[status][event] ?? status;
}

/** A finished level can no longer accept game actions. */
export function isTerminal(status: GameStatus): boolean {
  return status === 'succeeded' || status === 'failed' || status === 'summary' || status === 'exited';
}
