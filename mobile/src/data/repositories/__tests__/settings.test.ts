import { makeDeps } from '@/game-runtime/__tests__/testGame';

import { migrate } from '../../sqlite/migrations';
import { createTestDatabase } from '../../sqlite/__tests__/nodeDatabase';
import { SettingsRepository } from '../settingsRepository';

describe('SettingsRepository', () => {
  it('returns defaults, saves and reloads preferences', async () => {
    const db = createTestDatabase();
    await migrate(db);
    const repo = new SettingsRepository(db);
    const deps = makeDeps();
    expect(await repo.load()).toEqual({ motion: 'system', haptics: true });
    await repo.save({ motion: 'reduced', haptics: false }, deps.now());
    await repo.save({ motion: 'full', haptics: false }, deps.now());
    expect(await repo.load()).toEqual({ motion: 'full', haptics: false });
    db.close();
  });

  it('falls back to defaults for corrupted or unknown values', async () => {
    const db = createTestDatabase();
    await migrate(db);
    const repo = new SettingsRepository(db);
    await db.run("INSERT INTO app_settings (key, value_json, updated_at) VALUES ('ui_preferences', '{oops', 't')");
    expect(await repo.load()).toEqual({ motion: 'system', haptics: true });
    await db.run("UPDATE app_settings SET value_json = '{\"motion\":\"wild\",\"haptics\":\"yes\"}'");
    expect(await repo.load()).toEqual({ motion: 'system', haptics: true });
    db.close();
  });
});
