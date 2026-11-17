import { DIFFICULTY_BANDS } from '@/game-runtime/contracts';
import { makeDeps } from '@/game-runtime/__tests__/testGame';
import { restoreSession, resumeSession, pauseSession, serializeSession, startSession, submitAction } from '@/game-runtime/session';

import { LAB_TUTORIALS, parseTray } from '../authored';
import { evidence, ruleBreaker, specimenId } from '../module';
import type { RuleBreakerState } from '../types';
import { correctAnswers, testAll } from './helpers';

const t1 = () => ruleBreaker.createLevel('tutorial-1', 'intro').initialState;
const apply = (s: RuleBreakerState, actions: Parameters<typeof ruleBreaker.reduce>[1][]) => actions.reduce((x, a) => ruleBreaker.reduce(x, a), s);

describe('authored labs', () => {
  it.each(LAB_TUTORIALS.map((t) => [t.id, t] as const))('%s is valid', (_id, t) => {
    const level = ruleBreaker.createLevel(t.id, t.difficulty);
    expect(ruleBreaker.validateLevel(level).valid).toBe(true);
    expect(level.source).toBe('authored');
  });

  it('tutorials introduce one rule form at a time', () => {
    expect(LAB_TUTORIALS.map((t) => ruleBreaker.createLevel(t.id, t.difficulty).initialState.rule.k)).toEqual(['is', 'isNot', 'marksAtLeast', 'and']);
  });

  it.each(DIFFICULTY_BANDS)('the %s fallback is valid', (band) => {
    const level = ruleBreaker.fallbackLevel(band);
    expect(level.source).toBe('fallback');
    expect(ruleBreaker.validateLevel(level).valid).toBe(true);
  });
});

describe('validateLevel', () => {
  const level = ruleBreaker.createLevel('tutorial-1', 'intro');
  const patch = (p: Partial<RuleBreakerState>) => ({ ...level, initialState: { ...level.initialState, ...p } });
  it.each([
    ['wrong_game', { ...level, gameId: 'x' }],
    ['bad_tray', patch({ tray: [] })],
    ['bad_start', patch({ tested: [0] })],
    ['rule_outside_band', patch({ rule: { k: 'isNot', a: { p: 'shape', v: 'circle' } } })],
    ['no_exam', patch({ exams: [] })],
    ['par_mismatch', patch({ par: 0 })],
    ['fingerprint_mismatch', { ...level, fingerprint: 'x' }],
  ])('rejects %s', (reasonCode, bad) => {
    expect(ruleBreaker.validateLevel(bad)).toEqual({ valid: false, reasonCode });
  });

  it('rejects an exam the tray cannot decide', () => {
    // Three large red triangles cannot tell shape, colour and size apart.
    const undecided = patch({ tray: parseTray(['Lrt1', 'Lrt2', 'Lrt3']) });
    expect(ruleBreaker.validateLevel(undecided).reasonCode).toBe('exam_undetermined');
  });
});

describe('reduce', () => {
  it('records tests once and in order', () => {
    const s = apply(t1(), [{ type: 'test', index: 2 }, { type: 'test', index: 0 }, { type: 'test', index: 2 }]);
    expect(s.tested).toEqual([2, 0]);
    expect(evidence(s)).toHaveLength(2);
  });

  it.each([
    ['an index off the tray', { type: 'test', index: 99 } as const],
    ['a fractional index', { type: 'test', index: 0.5 } as const],
    ['going back to the lab from the lab', { type: 'backToLab' } as const],
    ['submitting outside the exam', { type: 'submitExam', answers: [] } as const],
  ])('ignores %s', (_n, action) => {
    const s = t1();
    expect(ruleBreaker.reduce(s, action)).toBe(s);
  });

  it('opens the exam, can return to the lab, and refuses answers of the wrong length', () => {
    const exam = ruleBreaker.reduce(t1(), { type: 'startExam' });
    expect(exam.phase).toBe('exam');
    expect(ruleBreaker.reduce(exam, { type: 'test', index: 0 })).toBe(exam);
    expect(ruleBreaker.reduce(exam, { type: 'submitExam', answers: [true] })).toBe(exam);
    expect(ruleBreaker.reduce(exam, { type: 'backToLab' }).phase).toBe('lab');
  });

  it('solves with all answers right', () => {
    const exam = apply(t1(), [...testAll(t1()), { type: 'startExam' }]);
    const done = ruleBreaker.reduce(exam, { type: 'submitExam', answers: correctAnswers(exam) });
    expect(done.solved).toBe(true);
    expect(ruleBreaker.isComplete(done)).toBe(true);
    expect(ruleBreaker.reduce(done, { type: 'test', index: 4 })).toBe(done);
  });

  it('a wrong answer reveals the batch as evidence and moves to the next batch', () => {
    const exam = ruleBreaker.reduce(t1(), { type: 'startExam' });
    const answers = correctAnswers(exam);
    answers[0] = !answers[0];
    const after = ruleBreaker.reduce(exam, { type: 'submitExam', answers });
    expect(after).toMatchObject({ phase: 'lab', failedExams: 1, examIndex: 1, solved: false });
    expect(after.lastExam?.correct[0]).toBe(false);
    expect(after.revealed).toHaveLength(exam.exams[0]!.length);
    expect(ruleBreaker.isComplete(after)).toBe(false);
  });
});

describe('scoring', () => {
  const exam = (s: RuleBreakerState) => ruleBreaker.reduce(s, { type: 'startExam' });
  it('rewards few experiments; hints and failed tests lower only the bonus', () => {
    const lean = ruleBreaker.reduce(exam(apply(t1(), testAll(t1()))), { type: 'submitExam', answers: correctAnswers(exam(apply(t1(), testAll(t1())))) });
    expect(ruleBreaker.score(lean, { moves: 0, hintsUsed: 0 })).toBe(150);
    // Tutorial 1 has par 2: two extra tests keep 30 of the bonus, three extra keep 15.
    expect(ruleBreaker.score({ ...lean, tested: [0, 1, 2, 3] }, { moves: 0, hintsUsed: 0 })).toBe(130);
    expect(ruleBreaker.score({ ...lean, tested: [0, 1, 2, 3, 4] }, { moves: 0, hintsUsed: 0 })).toBe(115);
    expect(ruleBreaker.score({ ...lean, failedExams: 1 }, { moves: 0, hintsUsed: 1 })).toBe(125);
    expect(ruleBreaker.score({ ...lean, failedExams: 9 }, { moves: 0, hintsUsed: 0 })).toBe(100);
  });
});

describe('hints', () => {
  it('name the properties, suggest the best experiment, then give the rule shape', () => {
    const s = t1();
    expect(ruleBreaker.hint!(s, 1).text).toBe('The rule only cares about shape.');
    const h2 = ruleBreaker.hint!(s, 2);
    expect(h2.highlightIds).toHaveLength(1);
    expect(h2.highlightIds[0]).toMatch(/^specimen-\d$/);
    expect(ruleBreaker.hint!(s, 3).text).toBe('Specimens pass when their shape is one particular value.');
  });

  it('say so when the evidence is already enough', () => {
    const tested = apply(t1(), testAll(t1(), t1().tray.length));
    expect(ruleBreaker.hint!(tested, 2).text).toMatch(/enough evidence/);
    expect(specimenId(3)).toBe('specimen-3');
  });
});

describe('through the game runtime', () => {
  it('plays a generated lab, survives restore, completes once', () => {
    const deps = makeDeps();
    let { session } = startSession(ruleBreaker, { seed: 'runtime', difficulty: 'expert' }, deps);
    for (let i = 0; i < session.state.tray.length; i += 1) session = submitAction(ruleBreaker, session, { type: 'test', index: i }, deps).session;
    session = pauseSession(session, deps).session;
    session = resumeSession(restoreSession(ruleBreaker, serializeSession(session))!, deps).session;
    session = submitAction(ruleBreaker, session, { type: 'startExam' }, deps).session;
    const result = submitAction(ruleBreaker, session, { type: 'submitExam', answers: correctAnswers(session.state) }, deps);
    expect(result.session.status).toBe('succeeded');
    expect(result.events.map((e) => e.type)).toContain('level_completed');
  });
});
