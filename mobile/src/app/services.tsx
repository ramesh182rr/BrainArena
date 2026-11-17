import { createContext, useContext, type ReactNode } from 'react';

import type { GameStore } from '@/data/repositories/gameStore';
import type { LocalProfile } from '@/data/repositories/profileRepository';
import type { RuntimeDeps } from '@/game-runtime/events';

/** App-wide dependencies, created once at startup and injectable in tests. */
export interface AppServices {
  store: GameStore;
  profile: LocalProfile;
  deps: RuntimeDeps;
}

const ServicesContext = createContext<AppServices | null>(null);

export function ServicesProvider({ value, children }: { value: AppServices; children: ReactNode }) {
  return <ServicesContext.Provider value={value}>{children}</ServicesContext.Provider>;
}

export function useAppServices(): AppServices {
  const services = useContext(ServicesContext);
  if (!services) throw new Error('useAppServices must be used inside ServicesProvider');
  return services;
}
