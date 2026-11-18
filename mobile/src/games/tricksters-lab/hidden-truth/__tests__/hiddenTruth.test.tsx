import { fireEvent, render, screen } from '@testing-library/react-native';

import { DIFFICULTY_BANDS } from '@/game-runtime/contracts';
import { makeDeps } from '@/game-runtime/__tests__/testGame';
import { startSession, submitAction } from '@/game-runtime/session';

import { hiddenTruthUi } from '../board';
import { alwaysTrue, hiddenTruth, holdsIn, TRUTH_PROFILES, TRUTH_TUTORIALS, viewRC } from '../logic';

jest.setTimeout(120_000);

describe('Hidden Truth viewpoints', () => {
  const scene = { size: 3, cells: [0, 1, 8], views: 4 };
  it('turning the table changes left/right and front/behind', () => {
    expect(viewRC(3, 0, 0)).toEqual([0, 0]);
    expect(viewRC(3, 0, 2)).toEqual([2, 2]);
    expect(holdsIn(scene, { k: 'left', a: 0, b: 1 }, 0)).toBe(true);
    expect(holdsIn(scene, { k: 'left', a: 0, b: 1 }, 2)).toBe(false);
  });

  it('adjacency, corners and lines hold from every side', () => {
    expect(alwaysTrue(scene, { k: 'next', a: 0, b: 1 })).toBe(true);
    expect(alwaysTrue(scene, { k: 'corner', a: 2 })).toBe(true);
    expect(alwaysTrue(scene, { k: 'left', a: 0, b: 1 })).toBe(false);
  });
});

describe('Hidden Truth levels', () => {
  it.each(DIFFICULTY_BANDS)('%s: 200 seeds have exactly one always-true statement', (band) => {
    const p = TRUTH_PROFILES[band];
    for (let i = 0; i < 200; i += 1) {
      const level = hiddenTruth.createLevel(`p-${i}`, band);
      expect({ i, ok: hiddenTruth.validateLevel(level).valid }).toEqual({ i, ok: true });
      expect(level.initialState.statements).toHaveLength(p.statements);
    }
    expect(hiddenTruth.createLevel('d', band)).toEqual(hiddenTruth.createLevel('d', band));
    expect(hiddenTruth.validateLevel(hiddenTruth.fallbackLevel(band)).valid).toBe(true);
  });

  it('tutorials validate; turning, crossing and picking work; scores', () => {
    for (const t of TRUTH_TUTORIALS) expect(hiddenTruth.validateLevel(hiddenTruth.createLevel(t.id, t.difficulty)).valid).toBe(true);
    const s0 = hiddenTruth.createLevel('tutorial-2', 'easy').initialState;
    expect(hiddenTruth.reduce(s0, { type: 'turn', dir: 1 }).view).toBe(1);
    expect(hiddenTruth.reduce(s0, { type: 'turn', dir: -1 }).view).toBe(3);
    expect(hiddenTruth.reduce(hiddenTruth.createLevel('tutorial-1', 'intro').initialState, { type: 'turn', dir: 1 }).view).toBe(2);
    const wrong = s0.statements.findIndex((_, i) => i !== s0.answer);
    const missed = hiddenTruth.reduce(s0, { type: 'pick', statement: wrong });
    expect(missed.wrongPicks).toBe(1);
    expect(missed.crossed[wrong]).toBe(true);
    const done = hiddenTruth.reduce(missed, { type: 'pick', statement: s0.answer });
    expect(hiddenTruth.isComplete(done)).toBe(true);
    expect(hiddenTruth.score(done, { moves: 0, hintsUsed: 0 })).toBe(130);
  });

  it('hints explain the trick, show a failing side, then the answer', () => {
    const s = hiddenTruth.createLevel('tutorial-3', 'advanced').initialState;
    expect(hiddenTruth.hint!(s, 2).text).toMatch(/fails when you view from the/);
    expect(hiddenTruth.hint!(s, 3).highlightIds).toEqual([`statement-${s.answer}`]);
  });

  it('plays through the runtime', () => {
    const deps = makeDeps();
    let { session } = startSession(hiddenTruth, { seed: 'rt', difficulty: 'expert' }, deps);
    session = submitAction(hiddenTruth, session, { type: 'pick', statement: session.state.answer }, deps).session;
    expect(session.status).toBe('succeeded');
  });

  it('renders the table and statements', async () => {
    const onAction = jest.fn();
    const { Board } = hiddenTruthUi;
    const s = hiddenTruth.createLevel('tutorial-1', 'intro').initialState;
    await render(<Board state={s} onAction={onAction} highlightIds={[]} disabled={false} />);
    expect(screen.getByLabelText(/^Table seen from the south/)).toBeTruthy();
    await fireEvent.press(screen.getAllByRole('button', { name: /^Always true:/ })[0]!);
    expect(onAction).toHaveBeenCalledWith({ type: 'pick', statement: 0 });
  });
});
