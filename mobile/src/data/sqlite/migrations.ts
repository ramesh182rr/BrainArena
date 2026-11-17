import type { SqlDatabase } from './database';

/**
 * Local schema migrations. Rules:
 * - Never edit a migration that has shipped; append a new one.
 * - Versions are consecutive integers starting at 1.
 * - The applied version is stored in `PRAGMA user_version`.
 */
export interface Migration {
  version: number;
  name: string;
  sql: string;
}

export const migrations: readonly Migration[] = [
  {
    version: 1,
    name: 'initial_schema',
    sql: `
      CREATE TABLE local_profile (
        id TEXT PRIMARY KEY,
        device_id TEXT NOT NULL,
        user_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE game_sessions (
        id TEXT PRIMARY KEY,
        profile_id TEXT NOT NULL,
        game_id TEXT NOT NULL,
        game_version TEXT NOT NULL,
        mode TEXT NOT NULL,
        status TEXT NOT NULL,
        outcome TEXT,
        level_id TEXT NOT NULL,
        level_seed TEXT NOT NULL,
        generator_version TEXT NOT NULL,
        difficulty TEXT NOT NULL,
        level_source TEXT NOT NULL,
        level_fingerprint TEXT NOT NULL,
        moves INTEGER NOT NULL DEFAULT 0,
        hints_used INTEGER NOT NULL DEFAULT 0,
        score INTEGER,
        active_ms INTEGER NOT NULL DEFAULT 0,
        started_at TEXT NOT NULL,
        ended_at TEXT,
        updated_at TEXT NOT NULL,
        snapshot_json TEXT NOT NULL,
        FOREIGN KEY(profile_id) REFERENCES local_profile(id)
      );

      CREATE TABLE sync_outbox (
        event_id TEXT PRIMARY KEY,
        profile_id TEXT NOT NULL,
        device_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        occurred_at TEXT NOT NULL,
        game_id TEXT NOT NULL,
        game_version TEXT NOT NULL,
        payload_version INTEGER NOT NULL,
        payload_json TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        retry_count INTEGER NOT NULL DEFAULT 0,
        last_error_code TEXT,
        FOREIGN KEY(profile_id) REFERENCES local_profile(id)
      );

      CREATE INDEX idx_outbox_status ON sync_outbox(status, occurred_at);
      CREATE INDEX idx_sessions_profile ON game_sessions(profile_id, started_at);
      CREATE INDEX idx_sessions_game ON game_sessions(profile_id, game_id, updated_at);
    `,
  },
  {
    version: 2,
    name: 'app_settings',
    sql: `
      CREATE TABLE app_settings (
        key TEXT PRIMARY KEY,
        value_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `,
  },
];

export const LATEST_SCHEMA_VERSION = migrations[migrations.length - 1]?.version ?? 0;

export class MigrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MigrationError';
  }
}

/**
 * Applies pending migrations in order, each in its own transaction, and
 * returns the resulting schema version. Safe to call on every app start.
 */
export async function migrate(
  db: SqlDatabase,
  list: readonly Migration[] = migrations,
): Promise<number> {
  list.forEach((m, index) => {
    if (m.version !== index + 1) {
      throw new MigrationError(`Migration "${m.name}" has version ${m.version}, expected ${index + 1}`);
    }
  });

  await db.exec('PRAGMA foreign_keys = ON;');
  const row = await db.first<{ user_version: number }>('PRAGMA user_version;');
  let current = row?.user_version ?? 0;
  const latest = list.length;
  if (current > latest) {
    // The database was written by a newer app build; refuse to run against an unknown schema.
    throw new MigrationError(`Database schema version ${current} is newer than this app supports (${latest})`);
  }

  for (const m of list) {
    if (m.version <= current) continue;
    await db.transaction(async () => {
      await db.exec(m.sql);
      // PRAGMA does not accept bound parameters; the value is a validated integer.
      await db.exec(`PRAGMA user_version = ${m.version};`);
    });
    current = m.version;
  }
  return current;
}
