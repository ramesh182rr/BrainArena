import * as SQLite from 'expo-sqlite';

import type { SqlDatabase, SqlValue } from './database';
import { migrate } from './migrations';

export const DATABASE_NAME = 'brainarena.db';

export function wrapExpoDatabase(db: SQLite.SQLiteDatabase): SqlDatabase {
  return {
    exec: (sql) => db.execAsync(sql),
    run: async (sql, params = []) => {
      await db.runAsync(sql, [...params]);
    },
    all: <T>(sql: string, params: readonly SqlValue[] = []) => db.getAllAsync<T>(sql, [...params]),
    first: <T>(sql: string, params: readonly SqlValue[] = []) => db.getFirstAsync<T>(sql, [...params]),
    transaction: (task) => db.withTransactionAsync(task),
  };
}

/** Opens the on-device database and brings its schema up to date. */
export async function openAppDatabase(): Promise<SqlDatabase> {
  const native = await SQLite.openDatabaseAsync(DATABASE_NAME);
  const db = wrapExpoDatabase(native);
  await db.exec('PRAGMA journal_mode = WAL;');
  await migrate(db);
  return db;
}
