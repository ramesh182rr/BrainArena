import * as Crypto from 'expo-crypto';

import { GameStore } from '@/data/repositories/gameStore';
import { openAppDatabase } from '@/data/sqlite/expoDatabase';
import type { RuntimeDeps } from '@/game-runtime/events';
import { registerAllGames } from '@/games';

import type { AppServices } from './services';

export const runtimeDeps: RuntimeDeps = {
  now: () => new Date().toISOString(),
  newId: () => Crypto.randomUUID(),
};

/** Startup: register games, open and migrate the local database, load the guest profile. */
export async function createAppServices(): Promise<AppServices> {
  registerAllGames();
  const db = await openAppDatabase();
  const store = new GameStore(db, runtimeDeps);
  const profile = await store.getProfile();
  return { store, profile, deps: runtimeDeps };
}
