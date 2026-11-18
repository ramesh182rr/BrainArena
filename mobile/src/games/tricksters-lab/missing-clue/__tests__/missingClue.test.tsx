import { fireEvent, render, screen } from '@testing-library/react-native';

import { DIFFICULTY_BANDS } from '@/game-runtime/contracts';
import { makeDeps } from '@/game-runtime/__tests__/testGame';
import { startSession, submitAction } from '@/game-runtime/session';

import { missingClueUi } from '../board';
import { CLUE_PROFILES, CLUE_TUTORIALS, clueStatus, clueText, consistentOrders, missingClue, type ClueState } from '../logic';

const solve = (s: ClueState) => s.truth.reduce((x, e) => missingClue.reduce(x, { type: 'place', event: e }), s);

describe('The Missing Clue', () => {
  it.each(DIFFICULTY_BANDS)('%s: 200 seeds give unique, minimal cases', (band) => {
    for (let i = 0; i < 200; i += 1) {
      const level = missingClue.createLevel(`p-${i}`, band);
      expect({ i, ok: missingClue.validateLevel(level).valid }).toEqual({ i, ok: true });
      const s = level.initialState;
      expect(s.events).toHaveLength(CLUE_PROFILES[band].events);
      if (CLUE_PROFILES[band].witness) expect(s.clues.some((c) => c.k === 'witnessSaw')).toBe(true);
    }
    expect(missingClue.createLevel('d', band)).toEqual(missingClue.createLevel('d', band));
    expect(missingClue.validateLevel(missingClue.fallbackLevel(band)).valid).toBe(true);
  });

  it('every generated clue is necessary (removing any breaks uniqueness)', () => {
    for (let i = 0; i < 20; i += 1) {
      const s = missingClue.createLevel(`min-${i}`, 'standard').initialState;
      s.clues.forEach((c) => {
        expect(consistentOrders(s.events.length, s.clues.filter((x) => x !== c), -1).length).toBeGreaterThan(1);
      });
    }
  });

  it('tutorials are valid and the witness clue is a context trap', () => {
    for (const t of CLUE_TUTORIALS) expect(missingClue.validateLevel(missingClue.createLevel(t.id, t.difficulty)).valid).toBe(true);
    const s = missingClue.createLevel('tutorial-3', 'advanced').initialState;
    expect(s.truth[0]).not.toBe(2);
    expect(clueText(s.clues[0]!, s.events)).toBe('The witness says: "The first thing I saw was when footsteps crossed the attic."');
  });

  it('places, lifts, checks clues live and completes', () => {
    const s0 = missingClue.createLevel('tutorial-1', 'intro').initialState;
    let s = missingClue.reduce(s0, { type: 'place', event: 3 });
    expect(s.slots[0]).toBe(3);
    expect(clueStatus(s, s.clues[0]!)).toBe(false);
    expect(missingClue.reduce(s, { type: 'place', event: 3 })).toBe(s);
    s = missingClue.reduce(s, { type: 'lift', slot: 0 });
    expect(s.slots[0]).toBeNull();
    expect(missingClue.reduce(s, { type: 'undo' }).slots[0]).toBe(3);
    const done = solve(s0);
    expect(missingClue.isComplete(done)).toBe(true);
    expect(missingClue.score(done, { moves: 0, hintsUsed: 0 })).toBe(150);
  });

  it('hints point at broken clues and the correct slots', () => {
    const s = missingClue.reduce(missingClue.createLevel('tutorial-1', 'intro').initialState, { type: 'place', event: 3 });
    expect(missingClue.hint!(s, 1).highlightIds).toEqual(['clue-0']);
    expect(missingClue.hint!(s, 2).text).toBe('Slot 1 holds: Rain.');
  });

  it('plays through the runtime', () => {
    const deps = makeDeps();
    let { session } = startSession(missingClue, { seed: 'rt', difficulty: 'expert' }, deps);
    for (const e of session.state.truth) session = submitAction(missingClue, session, { type: 'place', event: e }, deps).session;
    expect(session.status).toBe('succeeded');
  });

  it('renders tokens and clue status', async () => {
    const onAction = jest.fn();
    const { Board } = missingClueUi;
    await render(<Board state={missingClue.createLevel('tutorial-1', 'intro').initialState} onAction={onAction} highlightIds={[]} disabled={false} />);
    expect(screen.getByLabelText('The rain started first of all. Not checked yet.')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('token-1'));
    expect(onAction).toHaveBeenCalledWith({ type: 'place', event: 1 });
  });
});
