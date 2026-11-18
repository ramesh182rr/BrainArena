import type { DifficultyBand, GameStatus } from '@/game-runtime/contracts';
import type { Attempt, GameHistory } from '@/features/arena/dailyPlan';
import { serializeSession, type GameSession } from '@/game-runtime/session';

import type { SqlDatabase } from '../sqlite/database';

export interface LevelBest {
  gameId: string;
  levelSeed: string;
  difficulty: DifficultyBand;
  best: number;
}

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

  /** Best score per completed level, for stars and the level path. */
  async bestScoresByLevel(profileId: string): Promise<LevelBest[]> {
    const rows = await this.db.all<{ game_id: string; level_seed: string; difficulty: string; best: number }>(
      `SELECT game_id, level_seed, difficulty, MAX(score) AS best FROM game_sessions
       WHERE profile_id = ? AND outcome = 'succeeded' AND score IS NOT NULL
       GROUP BY game_id, level_seed, difficulty`,
      [profileId],
    );
    return rows.map((r) => ({ gameId: r.game_id, levelSeed: r.level_seed, difficulty: r.difficulty as DifficultyBand, best: r.best }));
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

  /**
   * Finished attempts per game, newest first (at most `perGame` each), for Daily Arena.
   * A session that ended without an outcome counts as left part-way.
   */
  async histories(profileId: string, perGame = 8): Promise<Map<string, GameHistory>> {
    const rows = await this.db.all<{ game_id: string; difficulty: string; outcome: string | null; hints_used: number; started_at: string }>(
      `SELECT game_id, difficulty, outcome, hints_used, started_at FROM game_sessions
       WHERE profile_id = ? AND ended_at IS NOT NULL ORDER BY started_at DESC`,
      [profileId],
    );
    const out = new Map<string, Attempt[]>();
    for (const r of rows) {
      const list = out.get(r.game_id) ?? [];
      if (list.length >= perGame) continue;
      const outcome = r.outcome === 'succeeded' ? 'succeeded' : r.outcome === 'failed' ? 'failed' : 'abandoned';
      list.push({ difficulty: r.difficulty as DifficultyBand, outcome, hintsUsed: r.hints_used, at: r.started_at });
      out.set(r.game_id, list);
    }
    return new Map([...out].map(([gameId, attempts]) => [gameId, { gameId, attempts }]));
  }

  /** "gameId|seed" keys of Daily Arena levels the player has completed. */
  async arenaWins(profileId: string, seeds: readonly string[]): Promise<Set<string>> {
    if (!seeds.length) return new Set();
    const rows = await this.db.all<{ game_id: string; level_seed: string }>(
      `SELECT DISTINCT game_id, level_seed FROM game_sessions
       WHERE profile_id = ? AND mode = 'arena' AND outcome = 'succeeded' AND level_seed IN (${seeds.map(() => '?').join(', ')})`,
      [profileId, ...seeds],
    );
    return new Set(rows.map((r) => `${r.game_id}|${r.level_seed}`));
  }

  /** Seed of the game's unfinished session, if any, so the Arena can resume rather than restart it. */
  async resumableSeed(profileId: string, gameId: string): Promise<string | null> {
    const row = await this.db.first<{ level_seed: string }>(
      `SELECT level_seed FROM game_sessions
       WHERE profile_id = ? AND game_id = ? AND ended_at IS NULL AND status IN ('playing', 'paused')
       ORDER BY updated_at DESC LIMIT 1`,
      [profileId, gameId],
    );
    return row?.level_seed ?? null;
  }
}
