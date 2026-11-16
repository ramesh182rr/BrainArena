/** Domain events emitted by the runtime. Payloads must not contain personal data. */

export const GAME_EVENT_TYPES = [
  'game_started',
  'tutorial_step_seen',
  'action_submitted',
  'hint_requested',
  'level_completed',
  'level_failed',
  'game_paused',
  'game_exited',
] as const;

export type GameEventType = (typeof GAME_EVENT_TYPES)[number];

export const GAME_EVENT_PAYLOAD_VERSION = 1;

export interface GameEvent {
  /** UUID; the sync API deduplicates on this value. */
  eventId: string;
  type: GameEventType;
  /** Client clock, ISO 8601. The server records its own received time. */
  occurredAt: string;
  gameId: string;
  gameVersion: string;
  payloadVersion: number;
  payload: Record<string, string | number | boolean | null>;
}

/** Injected side effects so the runtime stays deterministic under test. */
export interface RuntimeDeps {
  /** Current time as an ISO 8601 string. */
  now(): string;
  /** New UUID. */
  newId(): string;
}
