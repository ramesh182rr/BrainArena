import { createContext, useContext, type ReactNode } from 'react';

import type { GameStore } from '@/data/repositories/gameStore';
import type { LocalProfile } from '@/data/repositories/profileRepository';
import type { UiPreferences } from '@/design-system/preferences';
import type { RuntimeDeps } from '@/game-runtime/events';

/** App-wide dependencies, created once at startup and injectable in tests. */
export interface AppServices {
  store: GameStore;
  profile: LocalProfile;
  deps: RuntimeDeps;
  /** Preferences loaded from SQLite at startup. */
  initialPreferences: UiPreferences;
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

export interface PreferencesControl {
  preferences: UiPreferences;
  /** Applies a change immediately and saves it on the device. */
  update(change: Partial<UiPreferences>): void;
}

const PreferencesControlContext = createContext<PreferencesControl | null>(null);

export const PreferencesControlProvider = PreferencesControlContext.Provider;

export function usePreferencesControl(): PreferencesControl {
  const control = useContext(PreferencesControlContext);
  if (!control) throw new Error('usePreferencesControl must be used inside PreferencesControlProvider');
  return control;
}
