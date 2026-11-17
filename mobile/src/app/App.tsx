import { NavigationContainer } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppText, Button, colors, GameBackground, PreferencesProvider, spacing, type UiPreferences } from '@/design-system';
import { appFonts } from '@/design-system/fonts';

import { createAppServices } from './createAppServices';
import { ErrorBoundary } from './ErrorBoundary';
import { navigationTheme, RootNavigator } from './navigation/RootNavigator';
import { PreferencesControlProvider, ServicesProvider, type AppServices, type PreferencesControl } from './services';

/** Navigation tree with its services. Tests render this with in-memory services. */
export function AppShell({ services }: { services: AppServices }) {
  const [preferences, setPreferences] = useState<UiPreferences>(services.initialPreferences);

  const update = useCallback(
    (change: Partial<UiPreferences>) => {
      setPreferences((current) => {
        const next = { ...current, ...change };
        services.store.settings.save(next, services.deps.now()).catch(() => undefined);
        return next;
      });
    },
    [services],
  );
  const control = useMemo<PreferencesControl>(() => ({ preferences, update }), [preferences, update]);

  return (
    <ServicesProvider value={services}>
      <PreferencesControlProvider value={control}>
        <PreferencesProvider value={preferences}>
          <NavigationContainer theme={navigationTheme}>
            <RootNavigator />
          </NavigationContainer>
        </PreferencesProvider>
      </PreferencesControlProvider>
    </ServicesProvider>
  );
}

type Startup = { phase: 'loading' } | { phase: 'ready'; services: AppServices } | { phase: 'failed'; message: string };

function Bootstrap() {
  const [startup, setStartup] = useState<Startup>({ phase: 'loading' });
  const [attempt, setAttempt] = useState(0);
  // Fonts are decoration: if they fail to load, the system font is used instead.
  const [fontsLoaded, fontError] = useFonts(appFonts);
  const fontsReady = fontsLoaded || fontError !== null;

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

  if (startup.phase === 'ready' && fontsReady) return <AppShell services={startup.services} />;
  return (
    <View style={styles.center}>
      <GameBackground />
      <AppText variant="hero" shadow>
        BrainArena
      </AppText>
      <AppText variant="title" tone="gold">
        SOLO
      </AppText>
      {startup.phase === 'failed' ? (
        <>
          <AppText tone="secondary" style={styles.text}>
            We couldn&apos;t open your saved progress on this device.
          </AppText>
          {__DEV__ ? (
            <AppText variant="caption" tone="muted" style={styles.text}>
              {startup.message}
            </AppText>
          ) : null}
          <Button label="Try again" variant="play" onPress={retry} />
        </>
      ) : (
        <ActivityIndicator color={colors.gold} size="large" accessibilityLabel="Loading" />
      )}
    </View>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <Bootstrap />
        <StatusBar style="light" />
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
  },
  text: { textAlign: 'center' },
});
