import { DIFFICULTY_BANDS } from '@/game-runtime/contracts';
import { makeDeps } from '@/game-runtime/__tests__/testGame';
import { pauseSession, restoreSession, resumeSession, serializeSession, startSession, submitAction } from '@/game-runtime/session';

import { RECALL_PROFILES } from '../generator';
import { placeId, RECALL_TUTORIALS, sequenceRecall, symbolId } from '../module';
import { expectedAnswer } from '../rules';
import type { RecallState } from '../types';
import { apply, playRoundCorrectly } from './helpers';

const intro = () => sequenceRecall.createLevel('seed-x', 'intro').initialState;

describe('levels', () => {
  it.each(DIFFICULTY_BANDS)('%s levels validate for many seeds and are deterministic', (band) => {
    for (let i = 0; i < 200; i += 1) {
      expect(sequenceRecall.validateLevel(sequenceRecall.createLevel(`property-${i}`, band)).valid).toBe(true);
    }
    expect(sequenceRecall.createLevel('same', band)).toEqual(sequenceRecall.createLevel('same', band));
    const p = RECALL_PROFILES[band];
    const s = sequenceRecall.createLevel('same', band).initialState;
    expect([s.gridSize, s.palette.length, s.rounds]).toEqual([p.gridSize, p.symbols, p.rounds]);
  });

  it('bands grow longer and faster', () => {
    const longest = DIFFICULTY_BANDS.map((b) => Math.max(...RECALL_PROFILES[b].rounds.map((r) => r.length)));
    const speed = DIFFICULTY_BANDS.map((b) => RECALL_PROFILES[b].showMs);
    for (let i = 1; i < longest.length; i += 1) {
      expect(longest[i]!).toBeGreaterThanOrEqual(longest[i - 1]!);
      expect(speed[i]!).toBeLessThan(speed[i - 1]!);
    }
  });

  it('tutorials and fallbacks validate, one channel idea per tutorial', () => {
    expect(RECALL_TUTORIALS.map((t) => sequenceRecall.createLevel(t.id, t.difficulty).initialState.rounds[0]!.channel)).toEqual([
      'places',
      'symbols',
      'reversePlaces',
    ]);
    for (const t of RECALL_TUTORIALS) expect(sequenceRecall.validateLevel(sequenceRecall.createLevel(t.id, t.difficulty)).valid).toBe(true);
    for (const b of DIFFICULTY_BANDS) {
      const level = sequenceRecall.fallbackLevel(b);
      expect(level.source).toBe('fallback');
      expect(sequenceRecall.validateLevel(level).valid).toBe(true);
    }
  });
});

describe('validateLevel', () => {
  const level = sequenceRecall.createLevel('v', 'easy');
  const patch = (p: Partial<RecallState>) => ({ ...level, initialState: { ...level.initialState, ...p } });
  it.each([
    ['wrong_game', { ...level, gameId: 'x' }],
    ['bad_grid', patch({ gridSize: 4 as 2 })],
    ['bad_palette', patch({ palette: ['star', 'star'] })],
    ['bad_rounds', patch({ rounds: [{ length: 1, channel: 'places' }] })],
    ['bad_timing', patch({ showMs: 50 })],
    ['bad_start', patch({ misses: 2 })],
    ['sequence_mismatch', patch({ sequence: [] })],
    ['fingerprint_mismatch', { ...level, fingerprint: 'x' }],
  ])('rejects %s', (reasonCode, bad) => {
    expect(sequenceRecall.validateLevel(bad)).toEqual({ valid: false, reasonCode });
  });
});

describe('round flow', () => {
  it('watch → shown → answer; a correct answer moves to the next round', () => {
    const s = intro();
    const watching = sequenceRecall.reduce(s, { type: 'watch' });
    expect(watching.phase).toBe('showing');
    expect(sequenceRecall.reduce(watching, { type: 'input', value: 0 })).toBe(watching);
    const after = apply(s, playRoundCorrectly(s));
    expect(after).toMatchObject({ phase: 'feedback', round: 1, attempt: 0, misses: 0 });
    expect(after.lastResult?.correct).toBe(true);
  });

  it('a wrong answer counts a miss and gives a fresh sequence for the same round', () => {
    const s = apply(intro(), [{ type: 'watch' }, { type: 'shown' }]);
    const wrong = expectedAnswer(s.sequence, 'places').map((v) => (v + 1) % 4);
    const after = apply(s, wrong.map((value) => ({ type: 'input', value }) as const));
    expect(after).toMatchObject({ phase: 'feedback', round: 0, attempt: 1, misses: 1 });
    expect(after.sequence).not.toEqual(s.sequence);
    expect(after.lastResult).toMatchObject({ correct: false, given: wrong });
  });

  it('undoes an input and ignores out-of-range keys', () => {
    const s = apply(intro(), [{ type: 'watch' }, { type: 'shown' }, { type: 'input', value: 2 }]);
    expect(sequenceRecall.reduce(s, { type: 'undoInput' }).answer).toEqual([]);
    expect(sequenceRecall.reduce(s, { type: 'input', value: 9 })).toBe(s);
    expect(sequenceRecall.reduce(s, { type: 'input', value: 1.5 })).toBe(s);
  });

  it('restarts an interrupted show', () => {
    const s = sequenceRecall.reduce(intro(), { type: 'watch' });
    expect(sequenceRecall.reduce(s, { type: 'watch' }).phase).toBe('showing');
  });

  it('completes after the last round', () => {
    let s = intro();
    for (let r = 0; r < s.rounds.length; r += 1) s = apply(s, playRoundCorrectly(s));
    expect(s.done).toBe(true);
    expect(sequenceRecall.isComplete(s)).toBe(true);
    expect(sequenceRecall.reduce(s, { type: 'watch' })).toBe(s);
  });
});

describe('scoring and hints', () => {
  it('scores misses and hints against the bonus only', () => {
    const s = intro();
    expect(sequenceRecall.score({ ...s, done: true }, { moves: 0, hintsUsed: 0 })).toBe(150);
    expect(sequenceRecall.score({ ...s, misses: 1 }, { moves: 0, hintsUsed: 1 })).toBe(125);
    expect(sequenceRecall.score({ ...s, misses: 9 }, { moves: 0, hintsUsed: 0 })).toBe(100);
  });

  it('hints point at the first, next and next two keys', () => {
    const s = apply(intro(), [{ type: 'watch' }, { type: 'shown' }]);
    const exp = expectedAnswer(s.sequence, 'places');
    expect(sequenceRecall.hint!(s, 1).highlightIds).toEqual([placeId(exp[0]!)]);
    const one = sequenceRecall.reduce(s, { type: 'input', value: exp[0]! });
    expect(sequenceRecall.hint!(one, 2).highlightIds).toEqual([placeId(exp[1]!)]);
    expect(sequenceRecall.hint!(one, 3).highlightIds).toEqual([placeId(exp[1]!), placeId(exp[2]!)]);
    expect(sequenceRecall.hint!(intro(), 1).highlightIds).toEqual([]);
    expect(symbolId(2)).toBe('symbol-2');
  });
});

describe('through the game runtime', () => {
  it('survives a restore mid-show and completes once', () => {
    const deps = makeDeps();
    let { session } = startSession(sequenceRecall, { seed: 'runtime', difficulty: 'standard' }, deps);
    session = submitAction(sequenceRecall, session, { type: 'watch' }, deps).session;
    session = resumeSession(restoreSession(sequenceRecall, serializeSession(pauseSession(session, deps).session))!, deps).session;
    expect(session.state.phase).toBe('showing');
    const completions: string[] = [];
    for (let r = 0; r < session.state.rounds.length; r += 1) {
      for (const a of playRoundCorrectly(session.state)) {
        const step = submitAction(sequenceRecall, session, a, deps);
        session = step.session;
        completions.push(...step.events.filter((e) => e.type === 'level_completed').map((e) => e.type));
      }
    }
    expect(session.status).toBe('succeeded');
    expect(completions).toHaveLength(1);
    expect(session.score).toBe(150);
  });
});
