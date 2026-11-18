import { fireEvent, render, screen } from '@testing-library/react-native';

import { DIFFICULTY_BANDS } from '@/game-runtime/contracts';
import { makeDeps } from '@/game-runtime/__tests__/testGame';
import { startSession, submitAction } from '@/game-runtime/session';

import { numberLockUi } from '../board';
import { LOCK_PROFILES, LOCK_TUTORIALS, numberLock, remainingCodes, signalsFor, type LockState } from '../logic';

jest.setTimeout(240_000);

function enter(s0: LockState, code: number[]): LockState {
  let s = s0;
  code.forEach((d, i) => {
    s = numberLock.reduce(s, { type: 'select', index: i });
    s = numberLock.reduce(s, { type: 'digit', value: d });
  });
  return numberLock.reduce(s, { type: 'submit' });
}

describe('Number Lock signals', () => {
  it('marks exact, one away and far per tumbler', () => {
    expect(signalsFor([3, 5, 1], [3, 4, 6])).toEqual(['exact', 'near', 'far']);
    expect(signalsFor([1, 1, 2], [2, 1, 1])).toEqual(['near', 'exact', 'near']);
  });

  it('narrows the codes that still fit, with counts only on non-positional locks', () => {
    const s = numberLock.createLevel('tutorial-3', 'advanced').initialState;
    const after = enter(s, [1, 2, 3, 4]);
    const left = remainingCodes(after);
    expect(left.length).toBeLessThan(6 ** 4);
    expect(left.some((c) => c.join() === s.secret.join())).toBe(true);
  });
});

describe('Number Lock levels', () => {
  it.each(DIFFICULTY_BANDS)('%s: 100 seeds validate within the band', (band) => {
    const p = LOCK_PROFILES[band];
    for (let i = 0; i < 100; i += 1) {
      const level = numberLock.createLevel(`p-${i}`, band);
      expect({ i, ok: numberLock.validateLevel(level).valid }).toEqual({ i, ok: true });
      const s = level.initialState;
      expect(s.par).toBeGreaterThanOrEqual(p.par[0]);
      expect(s.par).toBeLessThanOrEqual(p.par[1]);
      expect(s.sumClue === null).toBe(!p.sum);
    }
    expect(numberLock.createLevel('d', band)).toEqual(numberLock.createLevel('d', band));
    expect(numberLock.validateLevel(numberLock.fallbackLevel(band)).valid).toBe(true);
  });

  it('tutorials validate; entry, clear and submit work; solving completes; scores', () => {
    for (const t of LOCK_TUTORIALS) expect(numberLock.validateLevel(numberLock.createLevel(t.id, t.difficulty)).valid).toBe(true);
    const s0 = numberLock.createLevel('tutorial-1', 'intro').initialState;
    expect(numberLock.reduce(s0, { type: 'submit' })).toBe(s0);
    let s = numberLock.reduce(s0, { type: 'digit', value: 2 });
    expect(s.entry[0]).toBe(2);
    expect(s.cursor).toBe(1);
    expect(numberLock.reduce(s, { type: 'digit', value: 99 })).toBe(s);
    expect(numberLock.reduce(s, { type: 'clear' }).entry.every((e) => e === null)).toBe(true);
    const wrong = s0.secret.map((d) => (d === 1 ? 2 : 1));
    s = enter(s0, wrong);
    expect(s.attempts).toHaveLength(1);
    expect(s.solved).toBe(false);
    s = enter(s, s0.secret);
    expect(numberLock.isComplete(s)).toBe(true);
    expect(numberLock.score(s, { moves: 0, hintsUsed: 0 })).toBe(150);
    expect(numberLock.reduce(s, { type: 'clear' })).toBe(s);
  });

  it('hints count codes, reveal a tumbler, then suggest a try', () => {
    const s = enter(numberLock.createLevel('tutorial-2', 'standard').initialState, [1, 2, 3, 4]);
    expect(numberLock.hint!(s, 1).text).toMatch(/still fit/);
    expect(numberLock.hint!(s, 2).highlightIds).toHaveLength(1);
    expect(numberLock.hint!(s, 3).text).toMatch(/^Try /);
  });

  it('plays through the runtime', () => {
    const deps = makeDeps();
    let { session } = startSession(numberLock, { seed: 'rt', difficulty: 'expert' }, deps);
    const secret = session.state.secret;
    secret.forEach((d, i) => {
      session = submitAction(numberLock, session, { type: 'select', index: i }, deps).session;
      session = submitAction(numberLock, session, { type: 'digit', value: d }, deps).session;
    });
    session = submitAction(numberLock, session, { type: 'submit' }, deps).session;
    expect(session.status).toBe('succeeded');
  });

  it('renders tumblers, keys and history', async () => {
    const onAction = jest.fn();
    const { Board } = numberLockUi;
    const s = enter(numberLock.createLevel('tutorial-1', 'intro').initialState, [1, 2, 3]);
    await render(<Board state={s} onAction={onAction} highlightIds={[]} disabled={false} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Digit 4' }));
    expect(onAction).toHaveBeenCalledWith({ type: 'digit', value: 4 });
    await fireEvent.press(screen.getByRole('button', { name: 'Try code' }));
    expect(onAction).toHaveBeenCalledWith({ type: 'submit' });
    expect(screen.getByLabelText(/^Try 1: 1 /)).toBeTruthy();
  });
});
