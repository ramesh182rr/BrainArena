import { parsePlan, type DailyPlan } from '@/features/arena/dailyPlan';

import type { SqlDatabase } from '../sqlite/database';

const KEY = 'daily_arena_plan';
const PREVIOUS = 'daily_arena_previous';

/** Stores today's Daily Arena plan on the device so it stays the same all day, offline (FR-036). */
export class DailyRepository {
  constructor(private readonly db: SqlDatabase) {}

  private async read(key: string): Promise<string | null> {
    const row = await this.db.first<{ value_json: string }>('SELECT value_json FROM app_settings WHERE key = ?', [key]);
    return row?.value_json ?? null;
  }

  private async write(key: string, value: string, now: string): Promise<void> {
    await this.db.run(
      `INSERT INTO app_settings (key, value_json, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at`,
      [key, value, now],
    );
  }

  /** Today's plan, or null if none was made today (or the stored one is unreadable). */
  async load(date: string): Promise<DailyPlan | null> {
    return parsePlan(await this.read(KEY), date);
  }

  /** Game ids of the most recent plan from an earlier day, to avoid repeating yesterday's games. */
  async previousGames(date: string): Promise<Set<string>> {
    const games = (raw: string | null) => {
      try {
        const p = raw ? (JSON.parse(raw) as { date?: unknown; picks?: { gameId?: unknown }[] }) : null;
        return p && Array.isArray(p.picks) ? { date: p.date, ids: p.picks.map((x) => x.gameId).filter((x): x is string => typeof x === 'string') } : null;
      } catch {
        return null;
      }
    };
    const current = games(await this.read(KEY));
    if (current && current.date !== date) return new Set(current.ids);
    return new Set(games(await this.read(PREVIOUS))?.ids ?? []);
  }

  async save(plan: DailyPlan, now: string): Promise<void> {
    const current = await this.read(KEY);
    // Keep the last plan from an earlier day for the anti-repeat rule.
    if (current && parsePlan(current, plan.date) === null) await this.write(PREVIOUS, current, now);
    await this.write(KEY, JSON.stringify(plan), now);
  }
}
