import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DefaultTheme, type Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { colors } from '@/design-system/tokens';
import { ArenaScreen } from '@/features/arena/ArenaScreen';
import { ExploreScreen } from '@/features/explore/ExploreScreen';
import { WorldScreen } from '@/features/explore/WorldScreen';
import { GameIntroScreen } from '@/features/game/GameIntroScreen';
import { PlayScreen } from '@/features/game/PlayScreen';
import { SummaryScreen } from '@/features/game/SummaryScreen';
import { HomeScreen } from '@/features/home/HomeScreen';
import { ProfileScreen } from '@/features/profile/ProfileScreen';
import { ProgressScreen } from '@/features/progress/ProgressScreen';
import { getGame, getWorld } from '@/games/catalogue';

import { TabIcon } from './TabIcon';
import type { RootStackParamList, TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

export const navigationTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.card,
    text: colors.textPrimary,
    border: colors.border,
    notification: colors.accent,
  },
};

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarIcon: ({ color, size }) => <TabIcon name={route.name} color={color} size={size} />,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'BrainArena' , tabBarLabel: 'Home' }} />
      <Tab.Screen name="Explore" component={ExploreScreen} />
      <Tab.Screen name="Arena" component={ArenaScreen} />
      <Tab.Screen name="Progress" component={ProgressScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
      <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
      <Stack.Screen name="World" component={WorldScreen} options={({ route }) => ({ title: getWorld(route.params.worldId).title })} />
      <Stack.Screen name="GameIntro" component={GameIntroScreen} options={({ route }) => ({ title: getGame(route.params.gameId)?.title ?? 'Game' })} />
      <Stack.Screen name="Play" component={PlayScreen} options={({ route }) => ({ title: getGame(route.params.gameId)?.title ?? 'Play' })} />
      <Stack.Screen name="Summary" component={SummaryScreen} options={{ title: 'Results', headerBackVisible: false, gestureEnabled: false }} />
    </Stack.Navigator>
  );
}
