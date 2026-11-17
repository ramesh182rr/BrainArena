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
}

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  World: { worldId: WorldId };
  GameIntro: { gameId: string };
  /** `resume` restores the latest unfinished session instead of starting `seed`. */
  Play: { gameId: string; seed: string; difficulty: DifficultyBand; resume: boolean };
  Summary: SummaryParams;
};

export type RootScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, T>;
export type RootNavigation = NativeStackNavigationProp<RootStackParamList>;
