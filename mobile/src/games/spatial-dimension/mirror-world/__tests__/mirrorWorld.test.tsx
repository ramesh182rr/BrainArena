import { fireEvent, render, screen } from '@testing-library/react-native';

import { DIFFICULTY_BANDS } from '@/game-runtime/contracts';
import { makeDeps } from '@/game-runtime/__tests__/testGame';
import { pauseSession, restoreSession, resumeSession, serializeSession, startSession, submitAction } from '@/game-runtime/session';

import { mirrorWorldUi } from '../board';
import { MIRROR_PROFILES, MIRROR_TUTORIALS, mirrorWorld, moveBoth, solveMirror, transformDir, type MirrorState } from '../logic';

const solve = (s: MirrorState) => solveMirror(s, s.startA, s.startB, 0)!;

describe('Mirror World', () => {
  it('transforms directions per mode', () => {
    expect([0, 1, 2, 3].map((d) => transformDir('mirror', d as 0, 0))).toEqual([0, 3, 2, 1]);
    expect([0, 1, 2, 3].map((d) => transformDir('flip', d as 0, 0))).toEqual([2, 1, 0, 3]);
    expect([0, 1, 2, 3].map((d) => transformDir('rotate', d as 0, 0))).toEqual([1, 2, 3, 0]);
    expect(transformDir('alternate', 1, 0)).toBe(3);
    expect(transformDir('alternate', 1, 1)).toBe(2);
  });

  it('an explorer facing a wall waits while the other moves', () => {
    const s = MIRROR_TUTORIALS[1]!.make();
    // A starts top-left; moving left bumps the edge, B (mirrored) moves right.
    const r = moveBoth(s, s.startA, s.startB, 3, 0);
    expect(r.bumps).toEqual([true, false]);
    expect(r.a).toBe(s.startA);
    expect(r.b).toBe(s.startB + 1);
  });

  it.each(DIFFICULTY_BANDS)('%s: 200 seeds validate within the band, deterministic', (band) => {
    const p = MIRROR_PROFILES[band];
    for (let i = 0; i < 200; i += 1) {
      const level = mirrorWorld.createLevel(`p-${i}`, band);
      expect({ i, ok: mirrorWorld.validateLevel(level).valid }).toEqual({ i, ok: true });
      expect(level.initialState.par).toBeGreaterThanOrEqual(p.par[0]);
      expect(level.initialState.par).toBeLessThanOrEqual(p.par[1]);
      expect(level.initialState.transform).toBe(p.transform);
    }
    expect(mirrorWorld.createLevel('d', band)).toEqual(mirrorWorld.createLevel('d', band));
    expect(mirrorWorld.validateLevel(mirrorWorld.fallbackLevel(band)).valid).toBe(true);
  });

  it('tutorials are valid', () => {
    for (const t of MIRROR_TUTORIALS) expect(mirrorWorld.validateLevel(mirrorWorld.createLevel(t.id, t.difficulty)).valid).toBe(true);
  });

  it('rejects broken rooms', () => {
    const level = mirrorWorld.createLevel('tutorial-1', 'intro');
    const s = level.initialState;
    expect(mirrorWorld.validateLevel({ ...level, initialState: { ...s, exitA: s.startA, exitB: s.startB } }).reasonCode).toBe('already_solved');
    expect(mirrorWorld.validateLevel({ ...level, initialState: { ...s, par: 99 } }).reasonCode).toBe('par_mismatch');
    expect(mirrorWorld.validateLevel({ ...level, initialState: { ...s, startA: 99 } }).reasonCode).toBe('bad_positions');
  });

  it('moves, undoes, resets, completes and scores', () => {
    const s0 = mirrorWorld.createLevel('tutorial-2', 'easy').initialState;
    const one = mirrorWorld.reduce(s0, { type: 'move', dir: 2 });
    expect(one.path).toHaveLength(2);
    expect(mirrorWorld.reduce(one, { type: 'undo' }).path).toHaveLength(1);
    expect(mirrorWorld.reduce(s0, { type: 'undo' })).toBe(s0);
    let s = s0;
    for (const d of solve(s0)) s = mirrorWorld.reduce(s, { type: 'move', dir: d });
    expect(mirrorWorld.isComplete(s)).toBe(true);
    expect(mirrorWorld.score(s, { moves: 0, hintsUsed: 0 })).toBe(150);
    expect(mirrorWorld.reduce(s, { type: 'move', dir: 0 })).toBe(s);
  });

  it('hints give the next moves', () => {
    const s = mirrorWorld.createLevel('tutorial-1', 'intro').initialState;
    expect(mirrorWorld.hint!(s, 1).text).toMatch(/more moves?/);
    expect(mirrorWorld.hint!(s, 2).highlightIds).toHaveLength(1);
  });

  it('plays through the runtime with restore', () => {
    const deps = makeDeps();
    let { session } = startSession(mirrorWorld, { seed: 'rt', difficulty: 'expert' }, deps);
    const path = solve(session.state);
    session = submitAction(mirrorWorld, session, { type: 'move', dir: path[0]! }, deps).session;
    session = resumeSession(restoreSession(mirrorWorld, serializeSession(pauseSession(session, deps).session))!, deps).session;
    for (const d of path.slice(1)) session = submitAction(mirrorWorld, session, { type: 'move', dir: d }, deps).session;
    expect(session.status).toBe('succeeded');
  });

  it('renders rooms and arrows', async () => {
    const onAction = jest.fn();
    const { Board } = mirrorWorldUi;
    await render(<Board state={mirrorWorld.createLevel('tutorial-1', 'intro').initialState} onAction={onAction} highlightIds={[]} disabled={false} />);
    expect(screen.getByLabelText(/^Left room\. Explorer at row and column 1, 1\. Door at 4, 4\./)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Move down' }));
    expect(onAction).toHaveBeenCalledWith({ type: 'move', dir: 2 });
  });
});
