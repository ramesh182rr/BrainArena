import {
  exitSession,
  LevelUnavailableError,
  pauseSession,
  prepareLevel,
  requestHint,
  restoreSession,
  resumeSession,
  serializeSession,
  showSummary,
  startSession,
  submitAction,
} from '../session';
import { makeCounterGame, makeDeps } from './testGame';

const game = makeCounterGame();
const start = (deps = makeDeps(), seed = 'seed-a') =>
  startSession(game, { seed, difficulty: 'intro' }, deps);

describe('prepareLevel', () => {
  it('is deterministic for the same seed', () => {
    expect(prepareLevel(game, 's1', 'easy')).toEqual(prepareLevel(game, 's1', 'easy'));
  });

  it('returns a validated generated level', () => {
    const level = prepareLevel(game, 's1', 'easy');
    expect(level.source).toBe('generated');
    expect(game.validateLevel(level).valid).toBe(true);
  });

  it('serves the fallback when the generated level is invalid', () => {
    const level = prepareLevel(makeCounterGame({ brokenSeeds: ['bad'] }), 'bad', 'easy');
    expect(level.source).toBe('fallback');
    expect(level.initialState.target).toBe(3);
  });

  it('serves the fallback when the generator throws', () => {
    const level = prepareLevel(makeCounterGame({ throwingSeeds: ['boom'] }), 'boom', 'easy');
    expect(level.source).toBe('fallback');
  });

  it('throws when even the fallback is invalid', () => {
    const broken = makeCounterGame({ brokenSeeds: ['bad'], brokenFallback: true });
    expect(() => prepareLevel(broken, 'bad', 'easy')).toThrow(LevelUnavailableError);
  });
});

describe('startSession', () => {
  it('starts in playing with a game_started event', () => {
    const { session, events } = start();
    expect(session).toMatchObject({
      sessionId: 'id-1',
      gameId: 'TEST-COUNTER',
      gameVersion: '1.0.0',
      mode: 'explore',
      status: 'playing',
      moves: 0,
      hintsUsed: 0,
      outcome: null,
      score: null,
      endedAt: null,
    });
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: 'game_started',
      gameId: 'TEST-COUNTER',
      gameVersion: '1.0.0',
      payloadVersion: 1,
      payload: { sessionId: 'id-1', seed: 'seed-a', generatorVersion: '1.0.0', difficulty: 'intro', levelSource: 'generated' },
    });
  });
});

describe('submitAction', () => {
  it('applies a valid action and counts the move', () => {
    const deps = makeDeps();
    const { session } = start(deps);
    const result = submitAction(game, session, { type: 'add', amount: 1 }, deps);
    expect(result.session.state.value).toBe(1);
    expect(result.session.moves).toBe(1);
    expect(result.events.map((e) => e.type)).toEqual(['action_submitted']);
  });

  it('ignores an invalid action without changing the session', () => {
    const deps = makeDeps();
    const { session } = start(deps);
    const result = submitAction(game, session, { type: 'add', amount: -4 }, deps);
    expect(result.session).toBe(session);
    expect(result.events).toEqual([]);
  });

  it('does not mutate the previous session', () => {
    const deps = makeDeps();
    const { session } = start(deps);
    const frozen = JSON.stringify(session);
    submitAction(game, session, { type: 'add', amount: 1 }, deps);
    expect(JSON.stringify(session)).toBe(frozen);
  });

  it('completes exactly once and scores from moves and hints', () => {
    const deps = makeDeps();
    let { session } = start(deps);
    const target = session.state.target;
    session = requestHint(game, session, deps).session;
    const done = submitAction(game, session, { type: 'add', amount: target }, deps);
    expect(done.session.status).toBe('succeeded');
    expect(done.session.outcome).toBe('succeeded');
    expect(done.session.score).toBe(100 - 5 - 10);
    expect(done.session.endedAt).not.toBeNull();
    expect(done.events.map((e) => e.type)).toEqual(['action_submitted', 'level_completed']);
    expect(done.events[1]?.payload).toMatchObject({ moves: 1, hintsUsed: 1, score: 85 });

    const again = submitAction(game, done.session, { type: 'add', amount: 1 }, deps);
    expect(again.session).toBe(done.session);
    expect(again.events).toEqual([]);
  });

  it('fails when the module reports failure', () => {
    const deps = makeDeps();
    const { session } = start(deps);
    const result = submitAction(game, session, { type: 'add', amount: 99 }, deps);
    expect(result.session.status).toBe('failed');
    expect(result.session.outcome).toBe('failed');
    expect(result.session.score).toBe(0);
    expect(result.events.map((e) => e.type)).toEqual(['action_submitted', 'level_failed']);
  });

  it('is deterministic for the same action sequence', () => {
    const run = () => {
      const deps = makeDeps();
      let { session } = start(deps);
      for (const amount of [1, 1]) session = submitAction(game, session, { type: 'add', amount }, deps).session;
      return session;
    };
    expect(run()).toEqual(run());
  });
});

describe('pause and resume', () => {
  it('preserves the board and rejects actions while paused', () => {
    const deps = makeDeps();
    let { session } = start(deps);
    session = submitAction(game, session, { type: 'add', amount: 1 }, deps).session;
    const paused = pauseSession(session, deps);
    expect(paused.session.status).toBe('paused');
    expect(paused.session.state).toBe(session.state);
    expect(paused.events.map((e) => e.type)).toEqual(['game_paused']);

    const blocked = submitAction(game, paused.session, { type: 'add', amount: 1 }, deps);
    expect(blocked.session).toBe(paused.session);

    const resumed = resumeSession(paused.session, deps);
    expect(resumed.session.status).toBe('playing');
    expect(resumed.session.state).toBe(session.state);
  });

  it('excludes paused time from activeMs', () => {
    const deps = makeDeps(1000);
    const { session } = start(deps); // t0
    const paused = pauseSession(session, deps).session; // t0 + 1s
    expect(paused.activeMs).toBe(1000);
    deps.advance(60_000);
    const resumed = resumeSession(paused, deps).session;
    const done = submitAction(game, resumed, { type: 'add', amount: resumed.state.target }, deps).session;
    expect(done.activeMs).toBe(2000);
  });

  it('ignores pause when not playing and resume when not paused', () => {
    const deps = makeDeps();
    const { session } = start(deps);
    expect(resumeSession(session, deps).session).toBe(session);
    const paused = pauseSession(session, deps).session;
    expect(pauseSession(paused, deps).session).toBe(paused);
  });

  it('never records negative play time when the clock moves backwards', () => {
    const deps = makeDeps(1000);
    const { session } = start(deps);
    deps.advance(-3_600_000);
    expect(pauseSession(session, deps).session.activeMs).toBe(0);
  });
});

describe('requestHint', () => {
  it('escalates tiers and caps at 3', () => {
    const deps = makeDeps();
    let { session } = start(deps);
    const tiers: number[] = [];
    for (let i = 0; i < 4; i += 1) {
      const r = requestHint(game, session, deps);
      session = r.session;
      tiers.push(r.hint?.tier ?? 0);
      expect(r.events.map((e) => e.type)).toEqual(['hint_requested']);
    }
    expect(tiers).toEqual([1, 2, 3, 3]);
    expect(session.hintsUsed).toBe(4);
  });

  it('gives no hint while paused', () => {
    const deps = makeDeps();
    const paused = pauseSession(start(deps).session, deps).session;
    const r = requestHint(game, paused, deps);
    expect(r.hint).toBeNull();
    expect(r.session).toBe(paused);
  });
});

describe('summary and exit', () => {
  it('moves a finished level to summary then exited', () => {
    const deps = makeDeps();
    const { session } = start(deps);
    const done = submitAction(game, session, { type: 'add', amount: session.state.target }, deps).session;
    const summary = showSummary(done);
    expect(summary.status).toBe('summary');
    const exited = exitSession(summary, deps);
    expect(exited.session.status).toBe('exited');
    expect(exited.session.endedAt).toBe(done.endedAt);
    expect(exited.events[0]).toMatchObject({ type: 'game_exited', payload: { completed: true } });
  });

  it('records an abandoned level as not completed', () => {
    const deps = makeDeps();
    const exited = exitSession(start(deps).session, deps);
    expect(exited.session.outcome).toBeNull();
    expect(exited.session.endedAt).not.toBeNull();
    expect(exited.events[0]?.payload).toMatchObject({ completed: false });
    expect(exitSession(exited.session, deps).events).toEqual([]);
  });
});

describe('persistence snapshots', () => {
  it('round-trips a paused session unchanged', () => {
    const deps = makeDeps();
    let { session } = start(deps);
    session = submitAction(game, session, { type: 'add', amount: 1 }, deps).session;
    session = pauseSession(session, deps).session;
    expect(restoreSession(game, serializeSession(session))).toEqual(session);
  });

  it('restores a session killed mid-play as paused with the board intact', () => {
    const deps = makeDeps();
    let { session } = start(deps);
    session = submitAction(game, session, { type: 'add', amount: 1 }, deps).session;
    const restored = restoreSession(game, serializeSession(session));
    expect(restored).toMatchObject({ status: 'paused', activeSince: null, moves: 1, state: session.state });
    const resumed = resumeSession(restored!, deps).session;
    expect(submitAction(game, resumed, { type: 'add', amount: 1 }, deps).session.state.value).toBe(2);
  });

  it.each([
    ['not json', '{oops'],
    ['wrong shape', '"text"'],
    ['unknown snapshot version', JSON.stringify({ v: 99, session: {} })],
    ['missing fields', JSON.stringify({ v: 1, session: { gameId: 'TEST-COUNTER', gameVersion: '1.0.0' } })],
  ])('returns null for %s', (_name, snapshot) => {
    expect(restoreSession(game, snapshot)).toBeNull();
  });

  it('refuses snapshots from another game version', () => {
    const { session } = start();
    const other = { ...game, version: '2.0.0' };
    expect(restoreSession(other, serializeSession(session))).toBeNull();
  });
});
