import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DarkTheme, type Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { colors } from '@/design-system/tokens';
import { ArenaScreen } from '@/features/arena/ArenaScreen';
import { ExploreScreen } from '@/features/explore/ExploreScreen';
import { WorldScreen } from '@/features/explore/WorldScreen';
import { DemoScreen } from '@/features/game/DemoScreen';
import { GameIntroScreen } from '@/features/game/GameIntroScreen';
import { PlayScreen } from '@/features/game/PlayScreen';
import { SummaryScreen } from '@/features/game/SummaryScreen';
import { HomeScreen } from '@/features/home/HomeScreen';
import { ProfileScreen } from '@/features/profile/ProfileScreen';
import { ProgressScreen } from '@/features/progress/ProgressScreen';

import { GameTabBar } from './GameTabBar';
import type { RootStackParamList, TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

export const navigationTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.gold,
    background: colors.bgTop,
    card: colors.bgTop,
    text: colors.textPrimary,
    border: colors.glassBorder,
    notification: colors.gold,
  },
};

function Tabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }} tabBar={(props) => <GameTabBar {...props} />}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Explore" component={ExploreScreen} options={{ tabBarLabel: 'Worlds' }} />
      <Tab.Screen name="Arena" component={ArenaScreen} />
      <Tab.Screen name="Progress" component={ProgressScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

/** Every screen draws its own game-style header, so native headers are hidden. */
export function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade_from_bottom', contentStyle: { backgroundColor: colors.bgTop } }}>
      <Stack.Screen name="Tabs" component={Tabs} />
      <Stack.Screen name="World" component={WorldScreen} />
      <Stack.Screen name="GameIntro" component={GameIntroScreen} />
      <Stack.Screen name="Demo" component={DemoScreen} />
      <Stack.Screen name="Play" component={PlayScreen} options={{ gestureEnabled: false }} />
      <Stack.Screen name="Summary" component={SummaryScreen} options={{ gestureEnabled: false, animation: 'fade' }} />
    </Stack.Navigator>
  );
}
