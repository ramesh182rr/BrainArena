import { DatabaseSync } from 'node:sqlite';

import type { SqlDatabase, SqlValue } from '../database';

/** In-memory SQLite for tests, backed by Node's built-in `node:sqlite`. */
export function createTestDatabase(): SqlDatabase & { close(): void } {
  const db = new DatabaseSync(':memory:');
  return {
    exec: async (sql) => {
      db.exec(sql);
    },
    run: async (sql, params = []) => {
      db.prepare(sql).run(...(params as SqlValue[]));
    },
    all: async <T>(sql: string, params: readonly SqlValue[] = []) =>
      db.prepare(sql).all(...(params as SqlValue[])).map((row) => ({ ...row })) as T[],
    first: async <T>(sql: string, params: readonly SqlValue[] = []) => {
      const row = db.prepare(sql).get(...(params as SqlValue[]));
      return row ? ({ ...row } as T) : null;
    },
    transaction: async (task) => {
      db.exec('BEGIN');
      try {
        await task();
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
    close: () => db.close(),
  };
}
