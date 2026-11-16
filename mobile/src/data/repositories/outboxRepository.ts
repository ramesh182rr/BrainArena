import type { GameEvent } from '@/game-runtime/events';

import type { SqlDatabase } from '../sqlite/database';

export type OutboxStatus = 'pending' | 'synced' | 'failed';

/** After this many failed attempts an event stops being retried automatically. */
export const MAX_SYNC_RETRIES = 8;

export interface OutboxEvent {
  eventId: string;
  profileId: string;
  deviceId: string;
  eventType: string;
  occurredAt: string;
  gameId: string;
  gameVersion: string;
  payloadVersion: number;
  payload: Record<string, unknown>;
  status: OutboxStatus;
  retryCount: number;
  lastErrorCode: string | null;
}

interface OutboxRow {
  event_id: string;
  profile_id: string;
  device_id: string;
  event_type: string;
  occurred_at: string;
  game_id: string;
  game_version: string;
  payload_version: number;
  payload_json: string;
  status: string;
  retry_count: number;
  last_error_code: string | null;
}

const toEvent = (row: OutboxRow): OutboxEvent => ({
  eventId: row.event_id,
  profileId: row.profile_id,
  deviceId: row.device_id,
  eventType: row.event_type,
  occurredAt: row.occurred_at,
  gameId: row.game_id,
  gameVersion: row.game_version,
  payloadVersion: row.payload_version,
  payload: JSON.parse(row.payload_json) as Record<string, unknown>,
  status: row.status as OutboxStatus,
  retryCount: row.retry_count,
  lastErrorCode: row.last_error_code,
});

/**
 * Append-only queue of events waiting to be sent to the API (FR-051/052).
 * Event ids are the idempotency key locally and on the server.
 */
export class OutboxRepository {
  constructor(private readonly db: SqlDatabase) {}

  /** Appending the same event id twice is a no-op, so retries cannot duplicate events. */
  async append(profileId: string, deviceId: string, events: readonly GameEvent[]): Promise<void> {
    for (const event of events) {
      await this.db.run(
        `INSERT OR IGNORE INTO sync_outbox (
           event_id, profile_id, device_id, event_type, occurred_at,
           game_id, game_version, payload_version, payload_json
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          event.eventId,
          profileId,
          deviceId,
          event.type,
          event.occurredAt,
          event.gameId,
          event.gameVersion,
          event.payloadVersion,
          JSON.stringify(event.payload),
        ],
      );
    }
  }

  /** Oldest pending events first, skipping those that exhausted their retries. */
  async listPending(limit = 50): Promise<OutboxEvent[]> {
    const rows = await this.db.all<OutboxRow>(
      `SELECT * FROM sync_outbox WHERE status = 'pending' AND retry_count < ?
       ORDER BY occurred_at, event_id LIMIT ?`,
      [MAX_SYNC_RETRIES, limit],
    );
    return rows.map(toEvent);
  }

  async markSynced(eventIds: readonly string[]): Promise<void> {
    for (const id of eventIds) {
      await this.db.run(
        "UPDATE sync_outbox SET status = 'synced', last_error_code = NULL WHERE event_id = ?",
        [id],
      );
    }
  }

  /** Records a failed attempt. The event stays pending until retries run out, then becomes `failed`. */
  async markAttemptFailed(eventId: string, errorCode: string): Promise<void> {
    await this.db.run(
      `UPDATE sync_outbox SET
         retry_count = retry_count + 1,
         last_error_code = ?,
         status = CASE WHEN retry_count + 1 >= ? THEN 'failed' ELSE 'pending' END
       WHERE event_id = ? AND status = 'pending'`,
      [errorCode, MAX_SYNC_RETRIES, eventId],
    );
  }

  async countByStatus(status: OutboxStatus): Promise<number> {
    const row = await this.db.first<{ n: number }>(
      'SELECT COUNT(*) AS n FROM sync_outbox WHERE status = ?',
      [status],
    );
    return row?.n ?? 0;
  }
}
