/**
 * Minimal SQL port used by migrations and repositories. The app binds it to
 * expo-sqlite (`expoDatabase.ts`); tests bind it to Node's built-in SQLite, so
 * the real SQL runs in both.
 */

export type SqlValue = string | number | null;

export interface SqlDatabase {
  /** Runs one or more statements without parameters (DDL, PRAGMA). */
  exec(sql: string): Promise<void>;
  /** Runs a single write statement with positional parameters. */
  run(sql: string, params?: readonly SqlValue[]): Promise<void>;
  all<T>(sql: string, params?: readonly SqlValue[]): Promise<T[]>;
  first<T>(sql: string, params?: readonly SqlValue[]): Promise<T | null>;
  /** Commits when `task` resolves and rolls back when it throws. Do not nest. */
  transaction(task: () => Promise<void>): Promise<void>;
}
