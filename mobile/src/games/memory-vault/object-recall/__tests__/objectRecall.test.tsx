import { fireEvent, render, screen } from '@testing-library/react-native';

import { DIFFICULTY_BANDS } from '@/game-runtime/contracts';
import { makeDeps } from '@/game-runtime/__tests__/testGame';
import { startSession, submitAction } from '@/game-runtime/session';

import { objectRecallUi } from '../board';
import { checkQuestion, eventText, objectRecall, RECALL_PROFILES, RECALL_TUTORIALS, type RecallState } from '../logic';

jest.setTimeout(120_000);

function playRound(s0: RecallState, right = true): RecallState {
  let s = objectRecall.reduce(s0, { type: 'begin' });
  for (let i = 0; i < s.story.length; i += 1) s = objectRecall.reduce(s, { type: 'next' });
  for (let i = 0; i < s.breakTask.length; i += 1) s = objectRecall.reduce(s, { type: 'breakTap', side: 0 });
  for (const q of s.questions) s = objectRecall.reduce(s, { type: 'answer', option: right ? q.answer : q.options.find((o) => o !== q.answer) ?? q.answer });
  return s;
}

describe('Object Recall stories', () => {
  it('describes events and checks answers by replaying the story', () => {
    const story = [
      { k: 'put' as const, who: 0, obj: 6, place: 0 },
      { k: 'move' as const, who: 1, obj: 6, from: 0, to: 2 },
    ];
    expect(eventText(story[1]!)).toBe('Lin moves the key from the drawer to the box.');
    expect(checkQuestion(story, { k: 'where', obj: 6, answer: 2, options: [0, 2] })).toBe(true);
    expect(checkQuestion(story, { k: 'who', obj: 6, answer: 0, options: [0, 1] })).toBe(false);
  });
});

describe('Object Recall levels', () => {
  it.each(DIFFICULTY_BANDS)('%s: 200 seeds validate', (band) => {
    for (let i = 0; i < 200; i += 1) {
      const level = objectRecall.createLevel(`p-${i}`, band);
      expect({ i, ok: objectRecall.validateLevel(level).valid }).toEqual({ i, ok: true });
      expect(level.initialState.rounds).toEqual(RECALL_PROFILES[band].rounds);
    }
    expect(objectRecall.createLevel('d', band)).toEqual(objectRecall.createLevel('d', band));
    expect(objectRecall.validateLevel(objectRecall.fallbackLevel(band)).valid).toBe(true);
  });

  it('tutorials validate; wrong answers miss with a fresh story; right answers complete; scores', () => {
    for (const t of RECALL_TUTORIALS) expect(objectRecall.validateLevel(objectRecall.createLevel(t.id, t.difficulty)).valid).toBe(true);
    const s0 = objectRecall.createLevel('w', 'easy').initialState;
    expect(objectRecall.reduce(s0, { type: 'answer', option: 0 })).toBe(s0);
    const miss = playRound(s0, false);
    expect(miss.lastResult?.passed).toBe(false);
    expect(objectRecall.reduce(miss, { type: 'begin' }).story).not.toEqual(s0.story);
    let s = playRound(miss);
    expect(s.round).toBe(1);
    s = playRound(s);
    expect(objectRecall.isComplete(s)).toBe(true);
    expect(objectRecall.score(s, { moves: 0, hintsUsed: 0 })).toBe(135);
  });

  it('hints count related cards, rule out an option, then show the answer', () => {
    let s = objectRecall.createLevel('tutorial-3', 'standard').initialState;
    s = objectRecall.reduce(s, { type: 'begin' });
    for (let i = 0; i < s.story.length; i += 1) s = objectRecall.reduce(s, { type: 'next' });
    for (let i = 0; i < 3; i += 1) s = objectRecall.reduce(s, { type: 'breakTap', side: 1 });
    expect(objectRecall.hint!(s, 1).text).toMatch(/card/);
    expect(objectRecall.hint!(s, 3).highlightIds).toHaveLength(1);
  });

  it('plays through the runtime', () => {
    const deps = makeDeps();
    let { session } = startSession(objectRecall, { seed: 'rt', difficulty: 'expert' }, deps);
    while (session.status !== 'succeeded') {
      session = submitAction(objectRecall, session, { type: 'begin' }, deps).session;
      for (let i = 0; i < session.state.story.length; i += 1) session = submitAction(objectRecall, session, { type: 'next' }, deps).session;
      for (let i = 0; i < 3; i += 1) session = submitAction(objectRecall, session, { type: 'breakTap', side: 0 }, deps).session;
      for (const q of session.state.questions) session = submitAction(objectRecall, session, { type: 'answer', option: q.answer }, deps).session;
    }
    expect(session.state.misses).toBe(0);
  });

  it('renders story cards, the break and questions', async () => {
    const onAction = jest.fn();
    const { Board } = objectRecallUi;
    const s0 = objectRecall.reduce(objectRecall.createLevel('tutorial-1', 'intro').initialState, { type: 'begin' });
    const view = await render(<Board state={s0} onAction={onAction} highlightIds={[]} disabled={false} />);
    expect(screen.getByText(eventText(s0.story[0]!))).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: /Next card|Finish story/ }));
    expect(onAction).toHaveBeenCalledWith({ type: 'next' });
    let s = s0;
    for (let i = 0; i < s.story.length; i += 1) s = objectRecall.reduce(s, { type: 'next' });
    await view.rerender(<Board state={s} onAction={onAction} highlightIds={[]} disabled={false} />);
    expect(screen.getByText('Tap the bigger number.')).toBeTruthy();
  });
});
