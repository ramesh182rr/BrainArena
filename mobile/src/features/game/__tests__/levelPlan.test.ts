import { levelLabel, nextLevel, nextTutorial, seedFromId } from '../levelPlan';

const tutorials = [
  { seed: 'tutorial-1', difficulty: 'intro' as const, intro: 'a' },
  { seed: 'tutorial-2', difficulty: 'easy' as const, intro: 'b' },
];
const seed = () => 'fresh';

describe('levelPlan', () => {
  it('picks the first unfinished tutorial', () => {
    expect(nextTutorial(tutorials, new Set())?.seed).toBe('tutorial-1');
    expect(nextTutorial(tutorials, new Set(['tutorial-1']))?.seed).toBe('tutorial-2');
    expect(nextTutorial(tutorials, new Set(['tutorial-1', 'tutorial-2']))).toBeNull();
  });

  it('walks the tutorials, then moves on to easy generated levels', () => {
    expect(nextLevel({ seed: 'tutorial-1', difficulty: 'intro' }, tutorials, seed)).toEqual({ seed: 'tutorial-2', difficulty: 'easy' });
    expect(nextLevel({ seed: 'tutorial-2', difficulty: 'easy' }, tutorials, seed)).toEqual({ seed: 'fresh', difficulty: 'easy' });
  });

  it('keeps the band for generated levels', () => {
    expect(nextLevel({ seed: 'abc', difficulty: 'expert' }, tutorials, seed)).toEqual({ seed: 'fresh', difficulty: 'expert' });
  });

  it('labels levels', () => {
    expect(levelLabel(tutorials, { seed: 'tutorial-2', difficulty: 'easy' })).toBe('Tutorial 2 of 2');
    expect(levelLabel(tutorials, { seed: 'x', difficulty: 'advanced' })).toBe('Advanced level');
  });

  it('makes short seeds from uuids', () => {
    expect(seedFromId('1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed')).toBe('1b9d6bcdbb');
  });
});
