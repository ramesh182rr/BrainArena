/**
 * Minimal typing for Node's built-in SQLite, used only by the test database.
 * Declared here instead of installing `@types/node`, whose globals (timers,
 * `process`, `Buffer`) would leak into React Native app code.
 */
declare module 'node:sqlite' {
  type Value = string | number | bigint | null | Uint8Array;

  export class StatementSync {
    run(...params: Value[]): { changes: number | bigint; lastInsertRowid: number | bigint };
    get(...params: Value[]): Record<string, Value> | undefined;
    all(...params: Value[]): Record<string, Value>[];
  }

  export class DatabaseSync {
    constructor(path: string);
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    close(): void;
  }
}
