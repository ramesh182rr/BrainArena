import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';

import { useAppServices } from '@/app/services';
import type { LevelBest } from '@/data/repositories/sessionRepository';

import { summarizeRewards, type RewardSummary } from './rewards';

/** Loads best scores whenever the screen gains focus, so stars update after play. */
export function useRewards(): { bests: LevelBest[]; rewards: RewardSummary } {
  const { store, profile } = useAppServices();
  const [bests, setBests] = useState<LevelBest[]>([]);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      store.sessions.bestScoresByLevel(profile.id).then(
        (rows) => active && setBests(rows),
        () => undefined,
      );
      return () => {
        active = false;
      };
    }, [store, profile]),
  );
  return { bests, rewards: summarizeRewards(bests) };
}
