import { registerAllGames } from '@/games';

import { starsBySeed, summarizeRewards } from '../rewards';

beforeAll(() => registerAllGames());

const best = (levelSeed: string, score: number) => ({ gameId: 'W3-G01', levelSeed, difficulty: 'easy' as const, best: score });

describe('rewards', () => {
  it('starts at Explorer level 1 with nothing solved', () => {
    expect(summarizeRewards([])).toEqual({ totalStars: 0, levelsSolved: 0, explorerLevel: 1, starsIntoLevel: 0 });
  });

  it('adds best stars per level and levels up every 9 stars', () => {
    const bests = [best('a', 150), best('b', 150), best('c', 150), best('d', 130)];
    expect(summarizeRewards(bests)).toEqual({ totalStars: 11, levelsSolved: 4, explorerLevel: 2, starsIntoLevel: 2 });
  });

  it('maps stars by seed for one game', () => {
    expect(starsBySeed([best('tutorial-1', 150), best('x', 100)], 'W3-G01')).toEqual(
      new Map([
        ['tutorial-1', 3],
        ['x', 1],
      ]),
    );
  });
});
