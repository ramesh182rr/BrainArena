import type { GameEvent, GameEventType, RuntimeDeps } from '@/game-runtime/events';
import type { GameSession } from '@/game-runtime/session';

import type { SqlDatabase } from '../sqlite/database';
import { OutboxRepository } from './outboxRepository';
import { ProfileRepository, type LocalProfile } from './profileRepository';
import { SessionRepository } from './sessionRepository';
import { SettingsRepository } from './settingsRepository';
import { DailyRepository } from './dailyRepository';

/**
 * Per-move events stay on the device: the session row already records the
 * move count, and queueing every tap for upload would be wasteful.
 */
const LOCAL_ONLY_EVENTS: ReadonlySet<GameEventType> = new Set(['action_submitted']);

/**
 * The single write path between the game runtime and SQLite. Game modules
 * never touch the database; screens persist runtime results through here.
 */
export class GameStore {
  readonly profiles: ProfileRepository;
  readonly sessions: SessionRepository;
  readonly outbox: OutboxRepository;
  readonly settings: SettingsRepository;
  readonly daily: DailyRepository;
  private queue: Promise<void> = Promise.resolve();

  constructor(
    private readonly db: SqlDatabase,
    private readonly deps: RuntimeDeps,
  ) {
    this.profiles = new ProfileRepository(db);
    this.sessions = new SessionRepository(db);
    this.outbox = new OutboxRepository(db);
    this.settings = new SettingsRepository(db);
    this.daily = new DailyRepository(db);
  }

  getProfile(): Promise<LocalProfile> {
    return this.profiles.getOrCreate(this.deps);
  }

  /**
   * Saves the session and queues its events in one transaction, so a crash
   * can never leave a completed level without its event or the reverse.
   * Calls are serialised because transactions on one connection cannot overlap.
   */
  recordStep<TState>(
    profile: LocalProfile,
    session: GameSession<TState>,
    events: readonly GameEvent[],
  ): Promise<void> {
    const run = async (): Promise<void> => {
      const syncable = events.filter((e) => !LOCAL_ONLY_EVENTS.has(e.type));
      await this.db.transaction(async () => {
        await this.sessions.save(profile.id, session, this.deps.now());
        await this.outbox.append(profile.id, profile.deviceId, syncable);
      });
    };
    const result = this.queue.then(run);
    this.queue = result.catch(() => undefined);
    return result;
  }
}
