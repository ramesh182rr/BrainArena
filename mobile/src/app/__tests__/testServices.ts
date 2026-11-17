import { GameStore } from '@/data/repositories/gameStore';
import { migrate } from '@/data/sqlite/migrations';
import { createTestDatabase } from '@/data/sqlite/__tests__/nodeDatabase';
import { makeDeps } from '@/game-runtime/__tests__/testGame';
import { registerAllGames } from '@/games';

import type { AppServices } from '../services';

/** Real store and migrations over in-memory SQLite, with a deterministic clock and ids. */
export async function createTestServices(): Promise<{ services: AppServices; close: () => void }> {
  registerAllGames();
  const db = createTestDatabase();
  await migrate(db);
  const deps = makeDeps();
  const store = new GameStore(db, deps);
  const profile = await store.getProfile();
  const initialPreferences = await store.settings.load();
  return { services: { store, profile, deps, initialPreferences }, close: () => db.close() };
}
