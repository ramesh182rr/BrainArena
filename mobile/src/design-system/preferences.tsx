import * as Haptics from 'expo-haptics';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useReducedMotion } from 'react-native-reanimated';

import { playSound } from './sound';

export type MotionPreference = 'system' | 'reduced' | 'full';

/** Player comfort settings the UI layer reacts to (PRD FR-074/075). */
export interface UiPreferences {
  motion: MotionPreference;
  haptics: boolean;
  sound: boolean;
  /** Puzzles in the Daily Arena: short 3, medium 4, long 5 (FR-030). */
  arenaSize: 3 | 4 | 5;
}

export const defaultPreferences: UiPreferences = { motion: 'system', haptics: true, sound: true, arenaSize: 3 };

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

/**
 * Feedback for taps and outcomes: haptics and sound effects, each respecting its own setting.
 * Never the only feedback channel.
 */
export function useHaptics(): HapticFeedback {
  const { haptics, sound } = usePreferences();
  return useMemo(
    () => ({
      tap: () => {
        if (sound) playSound('tap');
        if (haptics) safely(() => Haptics.selectionAsync());
      },
      impact: () => {
        if (sound) playSound('pop');
        if (haptics) safely(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
      },
      success: () => {
        if (sound) playSound('success');
        if (haptics) safely(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
      },
      warning: () => {
        if (sound) playSound('miss');
        if (haptics) safely(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
      },
    }),
    [haptics, sound],
  );
}
