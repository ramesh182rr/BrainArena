import type { NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';

import type { WorldId } from '@/design-system/tokens';
import type { DifficultyBand } from '@/game-runtime/contracts';

export type TabParamList = {
  Home: undefined;
  Explore: undefined;
  Arena: undefined;
  Progress: undefined;
  Profile: undefined;
};

export interface SummaryParams {
  gameId: string;
  seed: string;
  difficulty: DifficultyBand;
  outcome: 'succeeded' | 'failed';
  score: number;
  moves: number;
  hintsUsed: number;
  activeMs: number;
  explanation: string;
  /** Set for Daily Arena levels, so the results screen leads back to the Arena. */
  mode?: 'arena';
}

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  World: { worldId: WorldId };
  GameIntro: { gameId: string };
  /** Animated how-to-play demo of a game's first tutorial. */
  Demo: { gameId: string };
  /** `resume` restores the latest unfinished session instead of starting `seed`. */
  Play: { gameId: string; seed: string; difficulty: DifficultyBand; resume: boolean; mode?: 'arena' };
  Summary: SummaryParams;
};

export type RootScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, T>;
export type RootNavigation = NativeStackNavigationProp<RootStackParamList>;
