import type { RuntimeDeps } from '@/game-runtime/events';

import type { SqlDatabase } from '../sqlite/database';

export interface LocalProfile {
  id: string;
  /** Random per-install id; not a hardware identifier. */
  deviceId: string;
  /** Null for a guest. Set when the profile is linked to an account. */
  userId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ProfileRow {
  id: string;
  device_id: string;
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

const toProfile = (row: ProfileRow): LocalProfile => ({
  id: row.id,
  deviceId: row.device_id,
  userId: row.user_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export class ProfileRepository {
  constructor(private readonly db: SqlDatabase) {}

  async get(): Promise<LocalProfile | null> {
    const row = await this.db.first<ProfileRow>(
      'SELECT id, device_id, user_id, created_at, updated_at FROM local_profile ORDER BY created_at LIMIT 1',
    );
    return row ? toProfile(row) : null;
  }

  /** Returns the single local guest profile, creating it on first launch (FR-001). */
  async getOrCreate(deps: RuntimeDeps): Promise<LocalProfile> {
    const existing = await this.get();
    if (existing) return existing;
    const now = deps.now();
    const profile: LocalProfile = {
      id: deps.newId(),
      deviceId: deps.newId(),
      userId: null,
      createdAt: now,
      updatedAt: now,
    };
    await this.db.run(
      'INSERT INTO local_profile (id, device_id, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      [profile.id, profile.deviceId, profile.userId, profile.createdAt, profile.updatedAt],
    );
    return profile;
  }
}
