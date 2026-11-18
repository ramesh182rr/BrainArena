import { renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { defaultPreferences, PreferencesProvider, useHaptics, type UiPreferences } from '../preferences';
import * as sound from '../sound';

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(() => Promise.resolve()),
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning' },
}));

async function feedback(prefs: Partial<UiPreferences>) {
  const wrapper = ({ children }: { children: ReactNode }) => <PreferencesProvider value={{ ...defaultPreferences, ...prefs }}>{children}</PreferencesProvider>;
  return (await renderHook(() => useHaptics(), { wrapper })).result.current;
}

describe('sound effects', () => {
  it('play for each feedback kind when sound is on', async () => {
    const spy = jest.spyOn(sound, 'playSound');
    const f = await feedback({ sound: true, haptics: false });
    f.tap();
    f.impact();
    f.success();
    f.warning();
    expect(spy.mock.calls.map((c) => c[0])).toEqual(['tap', 'pop', 'success', 'miss']);
    spy.mockRestore();
  });

  it('stay silent when sound is off', async () => {
    const spy = jest.spyOn(sound, 'playSound');
    (await feedback({ sound: false })).success();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('never throw, even before audio is ready', () => {
    expect(() => sound.playSound('tap')).not.toThrow();
    expect(() => sound.preloadSounds()).not.toThrow();
  });
});
