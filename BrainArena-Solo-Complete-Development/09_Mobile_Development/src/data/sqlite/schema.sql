PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS local_profile (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS game_sessions (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  game_id TEXT NOT NULL,
  mode TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  result_json TEXT,
  FOREIGN KEY(profile_id) REFERENCES local_profile(id)
);

CREATE TABLE IF NOT EXISTS sync_outbox (
  event_id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_error_code TEXT
);

CREATE INDEX IF NOT EXISTS idx_outbox_status ON sync_outbox(status, occurred_at);
CREATE INDEX IF NOT EXISTS idx_sessions_profile ON game_sessions(profile_id, started_at);
