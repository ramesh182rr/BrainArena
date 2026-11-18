import { fireEvent, render, screen } from '@testing-library/react-native';

import { DIFFICULTY_BANDS } from '@/game-runtime/contracts';
import { makeDeps } from '@/game-runtime/__tests__/testGame';
import { startSession, submitAction } from '@/game-runtime/session';

import { pictureRiddleUi } from '../board';
import { applyRule, changes, consistentRules, pictureRiddle, RIDDLE_PROFILES, RIDDLE_TUTORIALS } from '../logic';

jest.setTimeout(120_000);

describe('Picture Riddle rules', () => {
  it('apply shape, colour, count and size changes with wrap-around', () => {
    const p = { shape: 2, hue: 0, count: 2, big: false };
    expect(applyRule({ shape: 1, hue: -1, count: 'double', size: 'swap' }, p, 3, 3)).toEqual({ shape: 0, hue: 2, count: 4, big: true });
    expect(applyRule({ shape: 0, hue: 0, count: 'minus', size: 'same' }, { ...p, count: 1 }, 3, 3)).toBeNull();
  });

  it('finds the rules an example allows', () => {
    const a = { shape: 0, hue: 0, count: 1, big: false };
    const b = { shape: 1, hue: 0, count: 2, big: false };
    const rules = consistentRules({ examples: [[a, b]], shapes: 4, hues: 3 });
    // +1 copy or doubling both fit a single copy becoming two.
    expect(rules.length).toBe(2);
  });
});

describe('Picture Riddle levels', () => {
  it.each(DIFFICULTY_BANDS)('%s: 200 seeds are fair (one answer for every allowed rule)', (band) => {
    const p = RIDDLE_PROFILES[band];
    for (let i = 0; i < 200; i += 1) {
      const level = pictureRiddle.createLevel(`p-${i}`, band);
      expect({ i, ok: pictureRiddle.validateLevel(level).valid }).toEqual({ i, ok: true });
      const n = changes(level.initialState.rule);
      expect(n).toBeGreaterThanOrEqual(p.changes[0]);
      expect(n).toBeLessThanOrEqual(p.changes[1]);
    }
    expect(pictureRiddle.createLevel('d', band)).toEqual(pictureRiddle.createLevel('d', band));
    expect(pictureRiddle.validateLevel(pictureRiddle.fallbackLevel(band)).valid).toBe(true);
  });

  it('tutorials validate; a wrong pick is ruled out; the right one completes; scores', () => {
    for (const t of RIDDLE_TUTORIALS) expect(pictureRiddle.validateLevel(pictureRiddle.createLevel(t.id, t.difficulty)).valid).toBe(true);
    const s0 = pictureRiddle.createLevel('tutorial-2', 'easy').initialState;
    const wrong = s0.options.findIndex((_, i) => i !== s0.answer);
    const s1 = pictureRiddle.reduce(s0, { type: 'pick', option: wrong });
    expect(s1.wrongPicks).toEqual([wrong]);
    expect(pictureRiddle.reduce(s1, { type: 'pick', option: wrong })).toBe(s1);
    const done = pictureRiddle.reduce(s1, { type: 'pick', option: s0.answer });
    expect(pictureRiddle.isComplete(done)).toBe(true);
    expect(pictureRiddle.score(done, { moves: 0, hintsUsed: 0 })).toBe(130);
  });

  it('hints count the changes, name one, then show the answer', () => {
    const s = pictureRiddle.createLevel('tutorial-3', 'advanced').initialState;
    expect(pictureRiddle.hint!(s, 1).text).toMatch(/change/);
    expect(pictureRiddle.hint!(s, 3).highlightIds).toEqual([`option-${s.answer}`]);
  });

  it('plays through the runtime', () => {
    const deps = makeDeps();
    let { session } = startSession(pictureRiddle, { seed: 'rt', difficulty: 'expert' }, deps);
    session = submitAction(pictureRiddle, session, { type: 'pick', option: session.state.answer }, deps).session;
    expect(session.status).toBe('succeeded');
  });

  it('renders examples and options, and reveals the rule', async () => {
    const onAction = jest.fn();
    const { Board } = pictureRiddleUi;
    const s = pictureRiddle.createLevel('tutorial-1', 'intro').initialState;
    const view = await render(<Board state={s} onAction={onAction} highlightIds={[]} disabled={false} />);
    expect(screen.getByLabelText(/^Example 1: /)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('option-0'));
    expect(onAction).toHaveBeenCalledWith({ type: 'pick', option: 0 });
    await view.rerender(<Board state={pictureRiddle.reduce(s, { type: 'pick', option: s.answer })} onAction={onAction} highlightIds={[]} disabled={false} />);
    expect(screen.getByText('The rule:')).toBeTruthy();
  });
});
