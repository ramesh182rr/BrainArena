import * as Haptics from 'expo-haptics';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useReducedMotion } from 'react-native-reanimated';

export type MotionPreference = 'system' | 'reduced' | 'full';

/** Player comfort settings the UI layer reacts to (PRD FR-074/075). */
export interface UiPreferences {
  motion: MotionPreference;
  haptics: boolean;
}

export const defaultPreferences: UiPreferences = { motion: 'system', haptics: true };

const PreferencesContext = createContext<UiPreferences>(defaultPreferences);

export function PreferencesProvider({ value, children }: { value: UiPreferences; children: ReactNode }) {
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): UiPreferences {
  return useContext(PreferencesContext);
}

/** True when non-essential motion should be skipped: player setting, or the OS setting by default. */
export function useReduceMotion(): boolean {
  const { motion } = usePreferences();
  const system = useReducedMotion();
  return motion === 'reduced' || (motion === 'system' && system);
}

function safely(run: () => Promise<void>): void {
  try {
    run().catch(() => undefined);
  } catch {
    // Haptics are optional reinforcement; never let them break a tap.
  }
}

export interface HapticFeedback {
  tap(): void;
  impact(): void;
  success(): void;
  warning(): void;
}

/** Haptics that respect the player's setting. Never the only feedback channel. */
export function useHaptics(): HapticFeedback {
  const { haptics } = usePreferences();
  return useMemo(
    () => ({
      tap: () => haptics && safely(() => Haptics.selectionAsync()),
      impact: () => haptics && safely(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
      success: () => haptics && safely(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
      warning: () => haptics && safely(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
    }),
    [haptics],
  );
}
