import type { LevelBest } from '@/data/repositories/sessionRepository';
import { getGameUi } from '@/games/ui';

/** Stars needed per Explorer level. Levels only go up; nothing is ever lost. */
export const STARS_PER_LEVEL = 9;

export interface RewardSummary {
  totalStars: number;
  levelsSolved: number;
  explorerLevel: number;
  /** Stars earned towards the next Explorer level. */
  starsIntoLevel: number;
}

export function starsForLevel(best: LevelBest): number {
  return getGameUi(best.gameId)?.starsFor(best.best) ?? 1;
}

export function summarizeRewards(bests: readonly LevelBest[]): RewardSummary {
  const totalStars = bests.reduce((sum, b) => sum + starsForLevel(b), 0);
  return {
    totalStars,
    levelsSolved: bests.length,
    explorerLevel: 1 + Math.floor(totalStars / STARS_PER_LEVEL),
    starsIntoLevel: totalStars % STARS_PER_LEVEL,
  };
}

/** Best stars per level seed for one game. */
export function starsBySeed(bests: readonly LevelBest[], gameId: string): Map<string, number> {
  const map = new Map<string, number>();
  for (const b of bests) if (b.gameId === gameId) map.set(b.levelSeed, starsForLevel(b));
  return map;
}
