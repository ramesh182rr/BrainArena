import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppText, Screen } from '@/design-system';

/**
 * Temporary root component. Navigation, providers and startup (SQLite
 * migrations) replace this placeholder as M1 progresses.
 */
export default function App() {
  return (
    <SafeAreaProvider>
      <Screen contentStyle={{ alignItems: 'center', justifyContent: 'center' }}>
        <AppText variant="display">BrainArena Solo</AppText>
        <AppText tone="secondary">Puzzle worlds are on their way.</AppText>
      </Screen>
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}
