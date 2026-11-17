import { LATEST_SCHEMA_VERSION, migrate, MigrationError, migrations, type Migration } from '../migrations';
import { createTestDatabase } from './nodeDatabase';

async function tableNames(db: ReturnType<typeof createTestDatabase>): Promise<string[]> {
  const rows = await db.all<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
  );
  return rows.map((r) => r.name);
}

describe('migrate', () => {
  let db: ReturnType<typeof createTestDatabase>;
  beforeEach(() => {
    db = createTestDatabase();
  });
  afterEach(() => db.close());

  it('creates the schema on a fresh database', async () => {
    expect(await migrate(db)).toBe(LATEST_SCHEMA_VERSION);
    expect(await tableNames(db)).toEqual(['app_settings', 'game_sessions', 'local_profile', 'sync_outbox']);
    expect(await db.first('PRAGMA user_version;')).toEqual({ user_version: LATEST_SCHEMA_VERSION });
  });

  it('is idempotent across app starts', async () => {
    await migrate(db);
    await db.run(
      "INSERT INTO local_profile (id, device_id, created_at, updated_at) VALUES ('p', 'd', 't', 't')",
    );
    expect(await migrate(db)).toBe(LATEST_SCHEMA_VERSION);
    expect(await db.all('SELECT id FROM local_profile')).toEqual([{ id: 'p' }]);
  });

  it('applies only pending migrations and keeps existing data', async () => {
    await migrate(db);
    await db.run(
      "INSERT INTO local_profile (id, device_id, created_at, updated_at) VALUES ('p', 'd', 't', 't')",
    );
    const next: Migration[] = [
      ...migrations,
      { version: LATEST_SCHEMA_VERSION + 1, name: 'add_note', sql: 'ALTER TABLE local_profile ADD COLUMN note TEXT;' },
    ];
    expect(await migrate(db, next)).toBe(LATEST_SCHEMA_VERSION + 1);
    expect(await db.all('SELECT id, note FROM local_profile')).toEqual([{ id: 'p', note: null }]);
  });

  it('rolls back a failing migration and leaves the version unchanged', async () => {
    await migrate(db);
    const bad: Migration[] = [
      ...migrations,
      {
        version: LATEST_SCHEMA_VERSION + 1,
        name: 'broken',
        sql: 'CREATE TABLE half_done (id TEXT); CREATE TABLE local_profile (id TEXT);',
      },
    ];
    await expect(migrate(db, bad)).rejects.toThrow();
    expect(await tableNames(db)).not.toContain('half_done');
    expect(await db.first('PRAGMA user_version;')).toEqual({ user_version: LATEST_SCHEMA_VERSION });
  });

  it('refuses a database from a newer app build', async () => {
    await db.exec('PRAGMA user_version = 999;');
    await expect(migrate(db)).rejects.toThrow(MigrationError);
  });

  it('rejects a migration list with gaps or wrong order', async () => {
    const gap: Migration[] = [{ version: 2, name: 'starts_at_two', sql: 'SELECT 1;' }];
    await expect(migrate(db, gap)).rejects.toThrow('expected 1');
  });

  it('enforces foreign keys', async () => {
    await migrate(db);
    await expect(
      db.run(
        `INSERT INTO sync_outbox (event_id, profile_id, device_id, event_type, occurred_at, game_id, game_version, payload_version, payload_json)
         VALUES ('e', 'missing-profile', 'd', 'game_started', 't', 'g', '1', 1, '{}')`,
      ),
    ).rejects.toThrow(/FOREIGN KEY/i);
  });

  it('upgrades a version-1 database to the latest without losing data', async () => {
    await migrate(db, migrations.slice(0, 1));
    await db.run(
      "INSERT INTO local_profile (id, device_id, created_at, updated_at) VALUES ('p', 'd', 't', 't')",
    );
    expect(await migrate(db)).toBe(LATEST_SCHEMA_VERSION);
    expect(await tableNames(db)).toContain('app_settings');
    expect(await db.all('SELECT id FROM local_profile')).toEqual([{ id: 'p' }]);
  });

  it('ships consecutive migration versions', () => {
    expect(migrations.map((m) => m.version)).toEqual(migrations.map((_, i) => i + 1));
  });
});
