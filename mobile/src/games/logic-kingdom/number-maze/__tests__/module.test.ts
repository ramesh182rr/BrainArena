import { DIFFICULTY_BANDS } from '@/game-runtime/contracts';
import { makeDeps } from '@/game-runtime/__tests__/testGame';
import { pauseSession, requestHint, restoreSession, resumeSession, serializeSession, startSession, submitAction } from '@/game-runtime/session';

import { MAZE_TUTORIALS } from '../authored';
import { numberMaze, roomId } from '../module';
import type { NumberMazeState } from '../types';
import { applyAll, mazeState, solvingMoves } from './helpers';

const t1 = () => numberMaze.createLevel('tutorial-1', 'intro').initialState;

describe('authored mazes', () => {
  it.each(MAZE_TUTORIALS.map((t) => [t.id, t] as const))('%s is valid with a single route', (_id, t) => {
    const level = numberMaze.createLevel(t.id, t.difficulty);
    expect(numberMaze.validateLevel(level).valid).toBe(true);
    expect(level.source).toBe('authored');
    expect(t.intro.length).toBeGreaterThan(30);
  });

  it('tutorials add one idea at a time', () => {
    const features = MAZE_TUTORIALS.map((t) => {
      const s = numberMaze.createLevel(t.id, t.difficulty).initialState;
      return {
        ops: [...new Set(s.cells.flatMap((c) => (c.t === 'gate' ? [c.op] : [])))].sort(),
        locks: s.cells.some((c) => c.t === 'lock'),
      };
    });
    expect(features[0]).toEqual({ ops: ['add', 'sub'], locks: false });
    expect(features[1]?.ops).toContain('mul');
    expect(features[2]?.ops).toContain('div');
    expect(features[3]?.locks).toBe(true);
  });

  it.each(DIFFICULTY_BANDS)('the %s fallback is valid', (band) => {
    const level = numberMaze.fallbackLevel(band);
    expect(level.source).toBe('fallback');
    expect(numberMaze.validateLevel(level).valid).toBe(true);
  });
});

describe('validateLevel', () => {
  const level = numberMaze.createLevel('tutorial-1', 'intro');
  const patch = (p: Partial<NumberMazeState>) => ({ ...level, initialState: { ...level.initialState, ...p } });

  it.each([
    ['wrong_game', { ...level, gameId: 'W9-G9' }],
    ['bad_dimensions', patch({ width: 1 })],
    ['bad_bounds', patch({ target: 99 })],
    ['bad_start', patch({ path: [1] })],
    ['par_mismatch', patch({ par: 1 })],
    ['fingerprint_mismatch', { ...level, fingerprint: 'x' }],
  ])('rejects %s', (reasonCode, bad) => {
    expect(numberMaze.validateLevel(bad)).toEqual({ valid: false, reasonCode });
  });

  it('rejects unsolvable mazes', () => {
    const s = mazeState('start=5 target=6 min=0 max=20', ['S  ## E', '## ## ##']);
    expect(numberMaze.validateLevel({ ...level, initialState: s, fingerprint: level.fingerprint }).reasonCode).toBe('unsolvable');
  });
});

describe('reduce', () => {
  it('moves, tracks values, undoes and resets', () => {
    const s = t1();
    const a = numberMaze.reduce(s, { type: 'move', index: 1 });
    expect(a.path).toEqual([0, 1]);
    expect(a.values).toEqual([5, 7]);
    const b = numberMaze.reduce(a, { type: 'undo' });
    expect(b.path).toEqual([0]);
    const c = applyAll(s, [{ type: 'move', index: 1 }, { type: 'move', index: 2 }, { type: 'reset' }]);
    expect(c.path).toEqual([0]);
    expect(c.values).toEqual([5]);
  });

  it.each([
    ['an illegal move', { type: 'move', index: 8 } as const],
    ['undo at the start', { type: 'undo' } as const],
    ['reset at the start', { type: 'reset' } as const],
  ])('ignores %s', (_n, action) => {
    const s = t1();
    expect(numberMaze.reduce(s, action)).toBe(s);
  });

  it('completes only at the exit with the target value', () => {
    const s = t1();
    const solved = applyAll(s, solvingMoves(s));
    expect(numberMaze.isComplete(solved)).toBe(true);
    expect(numberMaze.isComplete(s)).toBe(false);
  });
});

describe('scoring', () => {
  const s = numberMaze.createLevel('fallback-easy', 'easy').initialState;
  const shortest = applyAll(s, solvingMoves(s));

  it('gives the full bonus for the shortest route', () => {
    expect(numberMaze.score(shortest, { moves: 0, hintsUsed: 0 })).toBe(150);
  });

  it('lowers only the bonus for longer routes and hints', () => {
    const longer = { ...shortest, path: [...shortest.path, 0, 0], values: [...shortest.values, 0, 0] };
    expect(numberMaze.score(longer, { moves: 0, hintsUsed: 0 })).toBe(130);
    expect(numberMaze.score(shortest, { moves: 0, hintsUsed: 2 })).toBe(130);
    expect(numberMaze.score(shortest, { moves: 0, hintsUsed: 9 })).toBe(100);
  });
});

describe('hints', () => {
  it('escalate from encouragement to the next room to the next three', () => {
    const s = t1();
    expect(numberMaze.hint!(s, 1).text).toMatch(/exit can still be reached at 9 in 4 more moves/);
    expect(numberMaze.hint!(s, 2).highlightIds).toEqual([roomId(1)]);
    expect(numberMaze.hint!(s, 3).highlightIds).toEqual([roomId(1), roomId(2), roomId(5)]);
  });

  it('point back to the last good room on a dead-end route', () => {
    const s = applyAll(t1(), [{ type: 'move', index: 3 }, { type: 'move', index: 6 }]);
    const hint = numberMaze.hint!(s, 1);
    expect(hint.text).toMatch(/can't reach 9/);
    expect(hint.highlightIds).toEqual([roomId(0)]);
  });
});

describe('through the game runtime', () => {
  it('plays a generated level to completion once, and survives restore', () => {
    const deps = makeDeps();
    let { session } = startSession(numberMaze, { seed: 'runtime', difficulty: 'advanced' }, deps);
    const moves = solvingMoves(session.state);
    const half = Math.floor(moves.length / 2);
    for (const m of moves.slice(0, half)) session = submitAction(numberMaze, session, m, deps).session;
    session = pauseSession(session, deps).session;
    let resumed = resumeSession(restoreSession(numberMaze, serializeSession(session))!, deps).session;
    expect(resumed.state).toEqual(session.state);
    const done: string[] = [];
    for (const m of moves.slice(half)) {
      const r = submitAction(numberMaze, resumed, m, deps);
      resumed = r.session;
      done.push(...r.events.filter((e) => e.type === 'level_completed').map((e) => e.type));
    }
    expect(resumed.status).toBe('succeeded');
    expect(done).toEqual(['level_completed']);
    expect(resumed.score).toBe(150);
  });

  it('counts hints through the runtime', () => {
    const deps = makeDeps();
    let { session } = startSession(numberMaze, { seed: 'tutorial-2', difficulty: 'easy' }, deps);
    session = requestHint(numberMaze, session, deps).session;
    expect(session.hintsUsed).toBe(1);
  });
});
