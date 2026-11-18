import { fireEvent, render, screen } from '@testing-library/react-native';

import { DIFFICULTY_BANDS } from '@/game-runtime/contracts';
import { makeDeps } from '@/game-runtime/__tests__/testGame';
import { startSession, submitAction } from '@/game-runtime/session';

import { impossibleAnswerUi } from '../board';
import { applyRule, goalMet, impossibleAnswer, reachable, REFRAME_PROFILES, REFRAME_TUTORIALS, workingReadings, type ReframeState } from '../logic';

jest.setTimeout(300_000);

function solve(s0: ReframeState): ReframeState {
  const mask = workingReadings(s0)[0]!;
  let s = s0;
  s0.cards.forEach((_, i) => {
    if (mask & (1 << i)) s = impossibleAnswer.reduce(s, { type: 'flip', card: i });
  });
  const rules = s.cards.map((c, i) => ((mask & (1 << i)) !== 0 ? c.b : c.a));
  for (const m of reachable(s.piles0, rules, s.goal, s.maxMoves)!) s = impossibleAnswer.reduce(s, { type: 'use', card: m.card, pile: m.pile });
  return s;
}

describe('Impossible Answer rules', () => {
  it('applies each reading', () => {
    expect(applyRule({ k: 'take', n: 2 }, [5, 3], 0)).toEqual([3, 3]);
    expect(applyRule({ k: 'takeEach', n: 2 }, [5, 3], 0)).toEqual([3, 1]);
    expect(applyRule({ k: 'split' }, [6], 0)).toEqual([3, 3]);
    expect(applyRule({ k: 'split' }, [5], 0)).toBeNull();
    expect(applyRule({ k: 'merge' }, [2, 3, 4], 1)).toEqual([2, 7]);
    expect(goalMet({ k: 'equal' }, [3, 3])).toBe(true);
  });
});

describe('Impossible Answer levels', () => {
  it.each(DIFFICULTY_BANDS)('%s: seeds have exactly one working reading, never the literal one', (band) => {
    const count = band === 'expert' ? 60 : 150;
    for (let i = 0; i < count; i += 1) {
      const level = impossibleAnswer.createLevel(`p-${i}`, band);
      expect({ i, ok: impossibleAnswer.validateLevel(level).valid }).toEqual({ i, ok: true });
      expect(level.initialState.cards).toHaveLength(REFRAME_PROFILES[band].cards);
    }
    expect(impossibleAnswer.createLevel('d', band)).toEqual(impossibleAnswer.createLevel('d', band));
    expect(impossibleAnswer.validateLevel(impossibleAnswer.fallbackLevel(band)).valid).toBe(true);
  });

  it('tutorials validate; readings lock after a move and reset unlocks; solving completes; scores', () => {
    for (const t of REFRAME_TUTORIALS) expect(impossibleAnswer.validateLevel(impossibleAnswer.createLevel(t.id, t.difficulty)).valid).toBe(true);
    const s0 = impossibleAnswer.createLevel('tutorial-2', 'easy').initialState;
    const flipped = impossibleAnswer.reduce(s0, { type: 'flip', card: 0 });
    expect(flipped.flipped[0]).toBe(true);
    // Find any legal move to lock the readings.
    let moved = flipped;
    for (let p = 0; p < s0.piles0.length && moved === flipped; p += 1) for (let c = 0; c < s0.cards.length && moved === flipped; c += 1) moved = impossibleAnswer.reduce(flipped, { type: 'use', card: c, pile: p });
    if (moved !== flipped) {
      expect(moved.locked).toBe(true);
      expect(impossibleAnswer.reduce(moved, { type: 'flip', card: 0 })).toBe(moved);
      expect(impossibleAnswer.reduce(moved, { type: 'reset' }).locked).toBe(false);
    }
    const done = solve(s0);
    expect(impossibleAnswer.isComplete(done)).toBe(true);
    expect(impossibleAnswer.score(done, { moves: 0, hintsUsed: 0 })).toBe(150);
  });

  it('hints count wrong readings, then point at a card', () => {
    const s = impossibleAnswer.createLevel('tutorial-3', 'advanced').initialState;
    expect(impossibleAnswer.hint!(s, 1).text).toMatch(/reading/);
    expect(impossibleAnswer.hint!(s, 2).highlightIds).toHaveLength(1);
  });

  it('plays through the runtime', () => {
    const deps = makeDeps();
    let { session } = startSession(impossibleAnswer, { seed: 'rt', difficulty: 'standard' }, deps);
    const s0 = session.state;
    const mask = workingReadings(s0)[0]!;
    s0.cards.forEach((_, i) => {
      if (mask & (1 << i)) session = submitAction(impossibleAnswer, session, { type: 'flip', card: i }, deps).session;
    });
    const rules = s0.cards.map((c, i) => ((mask & (1 << i)) !== 0 ? c.b : c.a));
    for (const m of reachable(s0.piles0, rules, s0.goal, s0.maxMoves)!) session = submitAction(impossibleAnswer, session, { type: 'use', card: m.card, pile: m.pile }, deps).session;
    expect(session.status).toBe('succeeded');
  });

  it('renders the goal, piles and cards', async () => {
    const onAction = jest.fn();
    const { Board } = impossibleAnswerUi;
    const s = impossibleAnswer.createLevel('tutorial-1', 'intro').initialState;
    await render(<Board state={s} onAction={onAction} highlightIds={[]} disabled={false} />);
    expect(screen.getByLabelText(/^Goal: /)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Flip reading' }));
    expect(onAction).toHaveBeenCalledWith({ type: 'flip', card: 0 });
  });
});
