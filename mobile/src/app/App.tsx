import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppText, Button, colors, spacing } from '@/design-system';

import { createAppServices } from './createAppServices';
import { ErrorBoundary } from './ErrorBoundary';
import { navigationTheme, RootNavigator } from './navigation/RootNavigator';
import { ServicesProvider, type AppServices } from './services';

/** Navigation tree with its services. Tests render this with in-memory services. */
export function AppShell({ services }: { services: AppServices }) {
  return (
    <ServicesProvider value={services}>
      <NavigationContainer theme={navigationTheme}>
        <RootNavigator />
      </NavigationContainer>
    </ServicesProvider>
  );
}

type Startup = { phase: 'loading' } | { phase: 'ready'; services: AppServices } | { phase: 'failed'; message: string };

function Bootstrap() {
  const [startup, setStartup] = useState<Startup>({ phase: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    createAppServices().then(
      (services) => active && setStartup({ phase: 'ready', services }),
      (error: unknown) =>
        active && setStartup({ phase: 'failed', message: error instanceof Error ? error.message : String(error) }),
    );
    return () => {
      active = false;
    };
  }, [attempt]);

  const retry = () => {
    setStartup({ phase: 'loading' });
    setAttempt((n) => n + 1);
  };

  if (startup.phase === 'ready') return <AppShell services={startup.services} />;
  return (
    <View style={styles.center}>
      <AppText variant="display">BrainArena Solo</AppText>
      {startup.phase === 'loading' ? (
        <ActivityIndicator color={colors.primary} accessibilityLabel="Loading" />
      ) : (
        <>
          <AppText tone="secondary" style={styles.text}>
            We couldn&apos;t open your saved progress on this device.
          </AppText>
          {__DEV__ ? (
            <AppText variant="caption" tone="secondary" style={styles.text}>
              {startup.message}
            </AppText>
          ) : null}
          <Button label="Try again" onPress={retry} />
        </>
      )}
    </View>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <Bootstrap />
        <StatusBar style="dark" />
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  text: { textAlign: 'center' },
});
