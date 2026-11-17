import type { DifficultyBand } from '@/game-runtime/contracts';
import type { TutorialStep } from '@/games/ui';

export interface LevelChoice {
  seed: string;
  difficulty: DifficultyBand;
}

/** First tutorial the player has not completed, or null when all are done. */
export function nextTutorial(
  tutorials: readonly TutorialStep[],
  completedSeeds: ReadonlySet<string>,
): TutorialStep | null {
  return tutorials.find((t) => !completedSeeds.has(t.seed)) ?? null;
}

export function tutorialIndex(tutorials: readonly TutorialStep[], seed: string): number {
  return tutorials.findIndex((t) => t.seed === seed);
}

/**
 * What "Next level" plays after `current`: the following tutorial while in the
 * tutorial sequence, then fresh generated levels at the same band (or `easy`
 * straight after the tutorials).
 */
export function nextLevel(
  current: LevelChoice,
  tutorials: readonly TutorialStep[],
  newSeed: () => string,
): LevelChoice {
  const i = tutorialIndex(tutorials, current.seed);
  if (i >= 0) {
    const following = tutorials[i + 1];
    if (following) return { seed: following.seed, difficulty: following.difficulty };
    return { seed: newSeed(), difficulty: 'easy' };
  }
  return { seed: newSeed(), difficulty: current.difficulty };
}

export function levelLabel(tutorials: readonly TutorialStep[], choice: LevelChoice): string {
  const i = tutorialIndex(tutorials, choice.seed);
  if (i >= 0) return `Tutorial ${i + 1} of ${tutorials.length}`;
  return `${choice.difficulty.charAt(0).toUpperCase()}${choice.difficulty.slice(1)} level`;
}

/** Short, readable seed for new generated levels. */
export function seedFromId(id: string): string {
  return id.replace(/-/g, '').slice(0, 10);
}

/**
 * What the big PLAY button starts for a game: the saved level if there is one,
 * otherwise the next unfinished tutorial, otherwise a fresh easy level.
 */
export function playTarget(
  tutorials: readonly TutorialStep[],
  completedSeeds: ReadonlySet<string>,
  canResume: boolean,
  newSeed: () => string,
): LevelChoice & { resume: boolean } {
  if (canResume) return { seed: '', difficulty: 'easy', resume: true };
  const tutorial = nextTutorial(tutorials, completedSeeds);
  if (tutorial) return { seed: tutorial.seed, difficulty: tutorial.difficulty, resume: false };
  return { seed: newSeed(), difficulty: 'easy', resume: false };
}
