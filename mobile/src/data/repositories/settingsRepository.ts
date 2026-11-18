import { defaultPreferences, type MotionPreference, type UiPreferences } from '@/design-system/preferences';

import type { SqlDatabase } from '../sqlite/database';

const KEY = 'ui_preferences';
const MOTION: readonly MotionPreference[] = ['system', 'reduced', 'full'];

/** Reads stored JSON defensively: unknown or malformed values fall back to defaults. */
function sanitize(raw: unknown): UiPreferences {
  const value = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  return {
    motion: MOTION.includes(value.motion as MotionPreference) ? (value.motion as MotionPreference) : defaultPreferences.motion,
    haptics: typeof value.haptics === 'boolean' ? value.haptics : defaultPreferences.haptics,
    sound: typeof value.sound === 'boolean' ? value.sound : defaultPreferences.sound,
    arenaSize: value.arenaSize === 3 || value.arenaSize === 4 || value.arenaSize === 5 ? value.arenaSize : defaultPreferences.arenaSize,
  };
}

export class SettingsRepository {
  constructor(private readonly db: SqlDatabase) {}

  async load(): Promise<UiPreferences> {
    const row = await this.db.first<{ value_json: string }>('SELECT value_json FROM app_settings WHERE key = ?', [KEY]);
    if (!row) return { ...defaultPreferences };
    try {
      return sanitize(JSON.parse(row.value_json));
    } catch {
      return { ...defaultPreferences };
    }
  }

  async save(preferences: UiPreferences, now: string): Promise<void> {
    await this.db.run(
      `INSERT INTO app_settings (key, value_json, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at`,
      [KEY, JSON.stringify(sanitize(preferences)), now],
    );
  }
}
