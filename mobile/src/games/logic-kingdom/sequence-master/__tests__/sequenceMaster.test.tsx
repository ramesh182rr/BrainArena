import { fireEvent, render, screen } from '@testing-library/react-native';

import { DIFFICULTY_BANDS } from '@/game-runtime/contracts';
import { makeDeps } from '@/game-runtime/__tests__/testGame';
import { startSession, submitAction } from '@/game-runtime/session';

import { blanksForced, SEQ_PROFILES, SEQ_TUTORIALS, sequenceMaster, terms, type SequenceState } from '../logic';
import { sequenceMasterUi } from '../ui/SequenceMasterBoard';

function solveRound(s: SequenceState): SequenceState {
  const r = s.rounds[s.round]!;
  const t = terms(r);
  let x = s;
  r.blanks.forEach((b, i) => {
    x = sequenceMaster.reduce(x, { type: 'select', blank: i });
    for (const ch of String(t[b])) x = sequenceMaster.reduce(x, { type: 'digit', digit: Number(ch) });
  });
  return sequenceMaster.reduce(x, { type: 'check' });
}

describe('Sequence Master', () => {
  it('builds sequences from cycles', () => {
    expect(terms({ start: 1, cycle: [{ op: 'mul', n: 2 }, { op: 'add', n: 1 }], length: 6 })).toEqual([1, 2, 3, 6, 7, 14]);
  });

  it('detects ambiguous blanks', () => {
    // 2, 4, ? fits +2 (6) and ×2 (8). 2, 4, 6, ? forces +2 with one-step cycles,
    // but two-step cycles could start with +2 or ×2.
    expect(blanksForced({ start: 2, cycle: [{ op: 'add', n: 2 }], length: 3, blanks: [2] }, [1])).toBe(false);
    expect(blanksForced({ start: 2, cycle: [{ op: 'add', n: 2 }], length: 4, blanks: [3] }, [1])).toBe(true);
    expect(blanksForced({ start: 2, cycle: [{ op: 'add', n: 2 }], length: 4, blanks: [3] }, [1, 2])).toBe(false);
  });

  it.each(DIFFICULTY_BANDS)('%s: 1,000-seed-scale validation, determinism and band shape', (band) => {
    for (let i = 0; i < 200; i += 1) {
      const level = sequenceMaster.createLevel(`p-${i}`, band);
      expect({ i, valid: sequenceMaster.validateLevel(level).valid }).toEqual({ i, valid: true });
      expect(level.initialState.rounds).toHaveLength(SEQ_PROFILES[band].rounds);
    }
    expect(sequenceMaster.createLevel('d', band)).toEqual(sequenceMaster.createLevel('d', band));
    expect(sequenceMaster.validateLevel(sequenceMaster.fallbackLevel(band)).valid).toBe(true);
  });

  it('tutorials are valid', () => {
    for (const t of SEQ_TUTORIALS) expect(sequenceMaster.validateLevel(sequenceMaster.createLevel(t.id, t.difficulty)).valid).toBe(true);
  });

  it('typing, checking, misses and completion', () => {
    let s = sequenceMaster.createLevel('tutorial-1', 'intro').initialState;
    expect(sequenceMaster.reduce(s, { type: 'check' })).toBe(s);
    s = sequenceMaster.reduce(s, { type: 'digit', digit: 9 });
    s = sequenceMaster.reduce(s, { type: 'check' });
    expect(s.misses).toBe(1);
    expect(s.wrong).toEqual([true]);
    s = sequenceMaster.reduce(s, { type: 'backspace' });
    s = solveRound(s);
    expect(sequenceMaster.isComplete(s)).toBe(true);
    expect(sequenceMaster.score(s, { moves: 0, hintsUsed: 0 })).toBe(140);
  });

  it('hints escalate to the answer', () => {
    const s = sequenceMaster.createLevel('tutorial-1', 'intro').initialState;
    expect(sequenceMaster.hint!(s, 1).text).toMatch(/single step/);
    expect(sequenceMaster.hint!(s, 2).text).toBe('The step into the first blank is +4.');
    expect(sequenceMaster.hint!(s, 3).text).toBe('The first blank is 23.');
  });

  it('plays through the runtime', () => {
    const deps = makeDeps();
    let { session } = startSession(sequenceMaster, { seed: 'rt', difficulty: 'expert' }, deps);
    while (session.status === 'playing') {
      const before = session.state;
      const after = solveRound(before);
      // Replay the same inputs through the runtime.
      const r = before.rounds[before.round]!;
      const t = terms(r);
      r.blanks.forEach((b, i) => {
        session = submitAction(sequenceMaster, session, { type: 'select', blank: i }, deps).session;
        for (const ch of String(t[b])) session = submitAction(sequenceMaster, session, { type: 'digit', digit: Number(ch) }, deps).session;
      });
      session = submitAction(sequenceMaster, session, { type: 'check' }, deps).session;
      expect(session.state.round).toBe(after.round);
    }
    expect(session.status).toBe('succeeded');
  });

  it('renders the board and sends digits', async () => {
    const onAction = jest.fn();
    const { Board } = sequenceMasterUi;
    await render(<Board state={sequenceMaster.createLevel('tutorial-2', 'easy').initialState} onAction={onAction} highlightIds={[]} disabled={false} />);
    expect(screen.getByLabelText('Term 1: 2')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Digit 7' }));
    expect(onAction).toHaveBeenCalledWith({ type: 'digit', digit: 7 });
  });
});
