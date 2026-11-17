import type { DifficultyBand, GameStatus } from '@/game-runtime/contracts';
import { serializeSession, type GameSession } from '@/game-runtime/session';

import type { SqlDatabase } from '../sqlite/database';

/** Summary columns of a stored session, for history and progress views. */
export interface SessionRecord {
  id: string;
  gameId: string;
  gameVersion: string;
  mode: string;
  status: GameStatus;
  outcome: 'succeeded' | 'failed' | null;
  levelSeed: string;
  generatorVersion: string;
  difficulty: DifficultyBand;
  moves: number;
  hintsUsed: number;
  score: number | null;
  activeMs: number;
  startedAt: string;
  endedAt: string | null;
}

interface SessionRow {
  id: string;
  game_id: string;
  game_version: string;
  mode: string;
  status: string;
  outcome: string | null;
  level_seed: string;
  generator_version: string;
  difficulty: string;
  moves: number;
  hints_used: number;
  score: number | null;
  active_ms: number;
  started_at: string;
  ended_at: string | null;
}

const RECORD_COLUMNS =
  'id, game_id, game_version, mode, status, outcome, level_seed, generator_version, difficulty, moves, hints_used, score, active_ms, started_at, ended_at';

const toRecord = (row: SessionRow): SessionRecord => ({
  id: row.id,
  gameId: row.game_id,
  gameVersion: row.game_version,
  mode: row.mode,
  status: row.status as GameStatus,
  outcome: row.outcome as SessionRecord['outcome'],
  levelSeed: row.level_seed,
  generatorVersion: row.generator_version,
  difficulty: row.difficulty as DifficultyBand,
  moves: row.moves,
  hintsUsed: row.hints_used,
  score: row.score,
  activeMs: row.active_ms,
  startedAt: row.started_at,
  endedAt: row.ended_at,
});

export class SessionRepository {
  constructor(private readonly db: SqlDatabase) {}

  /** Inserts or updates the session row, including the full resumable snapshot. */
  async save<TState>(profileId: string, session: GameSession<TState>, updatedAt: string): Promise<void> {
    await this.db.run(
      `INSERT INTO game_sessions (
         id, profile_id, game_id, game_version, mode, status, outcome,
         level_id, level_seed, generator_version, difficulty, level_source, level_fingerprint,
         moves, hints_used, score, active_ms, started_at, ended_at, updated_at, snapshot_json
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         status = excluded.status,
         outcome = excluded.outcome,
         moves = excluded.moves,
         hints_used = excluded.hints_used,
         score = excluded.score,
         active_ms = excluded.active_ms,
         ended_at = excluded.ended_at,
         updated_at = excluded.updated_at,
         snapshot_json = excluded.snapshot_json`,
      [
        session.sessionId,
        profileId,
        session.gameId,
        session.gameVersion,
        session.mode,
        session.status,
        session.outcome,
        session.level.levelId,
        session.level.seed,
        session.level.generatorVersion,
        session.level.difficulty,
        session.level.source,
        session.level.fingerprint,
        session.moves,
        session.hintsUsed,
        session.score,
        session.activeMs,
        session.startedAt,
        session.endedAt,
        updatedAt,
        serializeSession(session),
      ],
    );
  }

  /**
   * Snapshot of the most recent unfinished session for a game, or null.
   * Pass it to `restoreSession` to resume (FR-013).
   */
  async findResumableSnapshot(profileId: string, gameId: string): Promise<string | null> {
    const row = await this.db.first<{ snapshot_json: string }>(
      `SELECT snapshot_json FROM game_sessions
       WHERE profile_id = ? AND game_id = ? AND ended_at IS NULL AND status IN ('playing', 'paused')
       ORDER BY updated_at DESC LIMIT 1`,
      [profileId, gameId],
    );
    return row?.snapshot_json ?? null;
  }

  /** Most recently updated unfinished session across all games, for the Home "Continue" card. */
  async findLatestResumable(profileId: string): Promise<{ gameId: string; sessionId: string } | null> {
    const row = await this.db.first<{ game_id: string; id: string }>(
      `SELECT game_id, id FROM game_sessions
       WHERE profile_id = ? AND ended_at IS NULL AND status IN ('playing', 'paused')
       ORDER BY updated_at DESC LIMIT 1`,
      [profileId],
    );
    return row ? { gameId: row.game_id, sessionId: row.id } : null;
  }

  /** Seeds of levels the player has completed for a game, e.g. to track tutorial progress. */
  async completedSeeds(profileId: string, gameId: string): Promise<Set<string>> {
    const rows = await this.db.all<{ level_seed: string }>(
      `SELECT DISTINCT level_seed FROM game_sessions WHERE profile_id = ? AND game_id = ? AND outcome = 'succeeded'`,
      [profileId, gameId],
    );
    return new Set(rows.map((r) => r.level_seed));
  }

  /** Marks leftover unfinished sessions of a game as exited, e.g. when the player starts a new level. */
  async abandonUnfinished(profileId: string, gameId: string, now: string, exceptSessionId?: string): Promise<void> {
    await this.db.run(
      `UPDATE game_sessions SET status = 'exited', ended_at = ?, updated_at = ?
       WHERE profile_id = ? AND game_id = ? AND ended_at IS NULL AND id <> ?`,
      [now, now, profileId, gameId, exceptSessionId ?? ''],
    );
  }

  async listRecent(profileId: string, limit = 20): Promise<SessionRecord[]> {
    const rows = await this.db.all<SessionRow>(
      `SELECT ${RECORD_COLUMNS} FROM game_sessions WHERE profile_id = ? ORDER BY started_at DESC LIMIT ?`,
      [profileId, limit],
    );
    return rows.map(toRecord);
  }

  /** Personal best is derived from completed sessions, never stored separately. */
  async bestScore(profileId: string, gameId: string): Promise<number | null> {
    const row = await this.db.first<{ best: number | null }>(
      `SELECT MAX(score) AS best FROM game_sessions WHERE profile_id = ? AND game_id = ? AND outcome = 'succeeded'`,
      [profileId, gameId],
    );
    return row?.best ?? null;
  }

  async completedCount(profileId: string, gameId: string): Promise<number> {
    const row = await this.db.first<{ n: number }>(
      `SELECT COUNT(*) AS n FROM game_sessions WHERE profile_id = ? AND game_id = ? AND outcome = 'succeeded'`,
      [profileId, gameId],
    );
    return row?.n ?? 0;
  }
}
