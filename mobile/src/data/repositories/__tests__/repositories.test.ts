import { makeCounterGame, makeDeps } from '@/game-runtime/__tests__/testGame';
import {
  exitSession,
  pauseSession,
  restoreSession,
  resumeSession,
  startSession,
  submitAction,
} from '@/game-runtime/session';

import { migrate } from '../../sqlite/migrations';
import { createTestDatabase } from '../../sqlite/__tests__/nodeDatabase';
import { GameStore } from '../gameStore';
import { MAX_SYNC_RETRIES } from '../outboxRepository';

const game = makeCounterGame();

async function setup() {
  const db = createTestDatabase();
  await migrate(db);
  const deps = makeDeps();
  const store = new GameStore(db, deps);
  const profile = await store.getProfile();
  return { db, deps, store, profile };
}

describe('ProfileRepository', () => {
  it('creates one guest profile and reuses it', async () => {
    const { db, store, profile } = await setup();
    expect(profile.userId).toBeNull();
    expect(profile.id).not.toBe(profile.deviceId);
    expect(await store.getProfile()).toEqual(profile);
    expect(await db.first('SELECT COUNT(*) AS n FROM local_profile')).toEqual({ n: 1 });
    db.close();
  });
});

describe('SessionRepository', () => {
  it('stores a session and updates it in place', async () => {
    const { db, deps, store, profile } = await setup();
    let { session } = startSession(game, { seed: 's1', difficulty: 'easy' }, deps);
    await store.sessions.save(profile.id, session, deps.now());
    session = submitAction(game, session, { type: 'add', amount: 1 }, deps).session;
    await store.sessions.save(profile.id, session, deps.now());

    const records = await store.sessions.listRecent(profile.id);
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      id: session.sessionId,
      gameId: 'TEST-COUNTER',
      gameVersion: '1.0.0',
      status: 'playing',
      outcome: null,
      levelSeed: 's1',
      generatorVersion: '1.0.0',
      difficulty: 'easy',
      moves: 1,
      score: null,
      endedAt: null,
    });
    db.close();
  });

  it('survives an app restart: the unfinished session resumes with its board', async () => {
    const { db, deps, store, profile } = await setup();
    let { session } = startSession(game, { seed: 's1', difficulty: 'easy' }, deps);
    session = submitAction(game, session, { type: 'add', amount: 1 }, deps).session;
    await store.sessions.save(profile.id, session, deps.now());

    // "Restart": a new store over the same database, no in-memory session.
    const reopened = new GameStore(db, deps);
    const snapshot = await reopened.sessions.findResumableSnapshot(profile.id, game.id);
    const restored = restoreSession(game, snapshot!);
    expect(restored).toMatchObject({ status: 'paused', moves: 1, state: session.state });

    const resumed = resumeSession(restored!, deps).session;
    const done = submitAction(game, resumed, { type: 'add', amount: resumed.state.target - 1 }, deps).session;
    expect(done.status).toBe('succeeded');
    db.close();
  });

  it('does not offer finished or exited sessions for resume', async () => {
    const { db, deps, store, profile } = await setup();
    const a = startSession(game, { seed: 's1', difficulty: 'easy' }, deps).session;
    const done = submitAction(game, a, { type: 'add', amount: a.state.target }, deps).session;
    await store.sessions.save(profile.id, done, deps.now());
    const b = startSession(game, { seed: 's2', difficulty: 'easy' }, deps).session;
    await store.sessions.save(profile.id, exitSession(b, deps).session, deps.now());
    expect(await store.sessions.findResumableSnapshot(profile.id, game.id)).toBeNull();
    db.close();
  });

  it('resumes the most recently updated session and can abandon the rest', async () => {
    const { db, deps, store, profile } = await setup();
    const older = startSession(game, { seed: 'old', difficulty: 'easy' }, deps).session;
    await store.sessions.save(profile.id, older, deps.now());
    const newer = pauseSession(startSession(game, { seed: 'new', difficulty: 'easy' }, deps).session, deps).session;
    await store.sessions.save(profile.id, newer, deps.now());

    const snapshot = await store.sessions.findResumableSnapshot(profile.id, game.id);
    expect(restoreSession(game, snapshot!)?.sessionId).toBe(newer.sessionId);

    await store.sessions.abandonUnfinished(profile.id, game.id, deps.now(), newer.sessionId);
    const records = await store.sessions.listRecent(profile.id);
    expect(records.find((r) => r.id === older.sessionId)).toMatchObject({ status: 'exited' });
    expect(records.find((r) => r.id === newer.sessionId)).toMatchObject({ status: 'paused', endedAt: null });
    db.close();
  });

  it('derives personal best and completion count from succeeded sessions only', async () => {
    const { db, deps, store, profile } = await setup();
    expect(await store.sessions.bestScore(profile.id, game.id)).toBeNull();

    const play = async (seed: string, amounts: number[]) => {
      let { session } = startSession(game, { seed, difficulty: 'easy' }, deps);
      for (const amount of amounts) session = submitAction(game, session, { type: 'add', amount }, deps).session;
      await store.sessions.save(profile.id, session, deps.now());
      return session;
    };
    const target = startSession(game, { seed: 's1', difficulty: 'easy' }, deps).session.state.target;
    await play('s1', [target]); // 1 move: 95
    await play('s1', [1, target - 1]); // 2 moves: 90
    await play('s1', [99]); // failed: score 0, must not count

    expect(await store.sessions.bestScore(profile.id, game.id)).toBe(95);
    expect(await store.sessions.completedCount(profile.id, game.id)).toBe(2);
    expect(await store.sessions.bestScore(profile.id, 'OTHER')).toBeNull();
    db.close();
  });
});

describe('OutboxRepository', () => {
  it('appends events idempotently by event id', async () => {
    const { db, deps, store, profile } = await setup();
    const { events } = startSession(game, { seed: 's1', difficulty: 'easy' }, deps);
    await store.outbox.append(profile.id, profile.deviceId, events);
    await store.outbox.append(profile.id, profile.deviceId, events);
    const pending = await store.outbox.listPending();
    expect(pending).toHaveLength(1);
    expect(pending[0]).toMatchObject({
      eventId: events[0]!.eventId,
      eventType: 'game_started',
      profileId: profile.id,
      deviceId: profile.deviceId,
      gameId: 'TEST-COUNTER',
      gameVersion: '1.0.0',
      payloadVersion: 1,
      status: 'pending',
      retryCount: 0,
      payload: { seed: 's1' },
    });
    db.close();
  });

  it('returns pending events oldest first and drops synced ones', async () => {
    const { db, deps, store, profile } = await setup();
    const a = startSession(game, { seed: 'a', difficulty: 'easy' }, deps);
    const b = startSession(game, { seed: 'b', difficulty: 'easy' }, deps);
    await store.outbox.append(profile.id, profile.deviceId, [...b.events, ...a.events]);
    expect((await store.outbox.listPending()).map((e) => e.payload.seed)).toEqual(['a', 'b']);

    await store.outbox.markSynced([a.events[0]!.eventId]);
    expect((await store.outbox.listPending()).map((e) => e.payload.seed)).toEqual(['b']);
    expect(await store.outbox.countByStatus('synced')).toBe(1);
    db.close();
  });

  it('retries failed attempts, then parks the event as failed', async () => {
    const { db, deps, store, profile } = await setup();
    const { events } = startSession(game, { seed: 's1', difficulty: 'easy' }, deps);
    const id = events[0]!.eventId;
    await store.outbox.append(profile.id, profile.deviceId, events);

    await store.outbox.markAttemptFailed(id, 'network_unreachable');
    expect((await store.outbox.listPending())[0]).toMatchObject({ retryCount: 1, lastErrorCode: 'network_unreachable' });

    for (let i = 1; i < MAX_SYNC_RETRIES; i += 1) await store.outbox.markAttemptFailed(id, 'http_503');
    expect(await store.outbox.listPending()).toEqual([]);
    expect(await store.outbox.countByStatus('failed')).toBe(1);
    db.close();
  });
});

describe('GameStore.recordStep', () => {
  it('persists a completed offline session and its events together', async () => {
    const { db, deps, store, profile } = await setup();
    const started = startSession(game, { seed: 's1', difficulty: 'easy' }, deps);
    await store.recordStep(profile, started.session, started.events);
    const done = submitAction(game, started.session, { type: 'add', amount: started.session.state.target }, deps);
    await store.recordStep(profile, done.session, done.events);

    const records = await store.sessions.listRecent(profile.id);
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ status: 'succeeded', outcome: 'succeeded', score: 95, moves: 1 });
    expect(records[0]!.endedAt).not.toBeNull();
    expect((await store.outbox.listPending()).map((e) => e.eventType)).toEqual(['game_started', 'level_completed']);
    db.close();
  });

  it('keeps per-move events out of the outbox', async () => {
    const { db, deps, store, profile } = await setup();
    const started = startSession(game, { seed: 's1', difficulty: 'easy' }, deps);
    const moved = submitAction(game, started.session, { type: 'add', amount: 1 }, deps);
    expect(moved.events.map((e) => e.type)).toEqual(['action_submitted']);
    await store.recordStep(profile, moved.session, moved.events);
    expect(await store.outbox.listPending()).toEqual([]);
    db.close();
  });

  it('recording the same step twice does not duplicate anything', async () => {
    const { db, deps, store, profile } = await setup();
    const started = startSession(game, { seed: 's1', difficulty: 'easy' }, deps);
    await store.recordStep(profile, started.session, started.events);
    await store.recordStep(profile, started.session, started.events);
    expect(await store.sessions.listRecent(profile.id)).toHaveLength(1);
    expect(await store.outbox.listPending()).toHaveLength(1);
    db.close();
  });

  it('rolls back the session when the event write fails', async () => {
    const { db, deps, store, profile } = await setup();
    const started = startSession(game, { seed: 's1', difficulty: 'easy' }, deps);
    const ghost = { ...profile, id: 'no-such-profile' };
    await expect(store.recordStep(ghost, started.session, started.events)).rejects.toThrow(/FOREIGN KEY/i);
    expect(await db.first('SELECT COUNT(*) AS n FROM game_sessions')).toEqual({ n: 0 });
    expect(await db.first('SELECT COUNT(*) AS n FROM sync_outbox')).toEqual({ n: 0 });
    db.close();
  });

  it('serialises overlapping writes and keeps working after a failed one', async () => {
    const { db, deps, store, profile } = await setup();
    const a = startSession(game, { seed: 'a', difficulty: 'easy' }, deps);
    const b = startSession(game, { seed: 'b', difficulty: 'easy' }, deps);
    const ghost = { ...profile, id: 'no-such-profile' };
    const results = await Promise.allSettled([
      store.recordStep(profile, a.session, a.events),
      store.recordStep(ghost, b.session, b.events),
      store.recordStep(profile, b.session, b.events),
    ]);
    expect(results.map((r) => r.status)).toEqual(['fulfilled', 'rejected', 'fulfilled']);
    expect(await store.sessions.listRecent(profile.id)).toHaveLength(2);
    expect(await store.outbox.listPending()).toHaveLength(2);
    db.close();
  });
});
