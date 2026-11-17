import Constants from 'expo-constants';

import { useAppServices } from '@/app/services';
import { AppText, Card, Screen } from '@/design-system';

export function ProfileScreen() {
  const { profile } = useAppServices();
  return (
    <Screen scroll edges={['left', 'right']}>
      <Card>
        <AppText variant="heading">Playing as a guest</AppText>
        <AppText tone="secondary">
          Your progress is stored only on this device. Optional accounts and cloud backup will come in a later update.
        </AppText>
      </Card>
      <Card>
        <AppText variant="heading">About</AppText>
        <AppText tone="secondary">
          BrainArena Solo is a collection of puzzle games for fun. It is not a medical or diagnostic tool.
        </AppText>
        <AppText variant="caption" tone="secondary">
          Version {Constants.expoConfig?.version ?? 'dev'} · Profile created {profile.createdAt.slice(0, 10)}
        </AppText>
      </Card>
    </Screen>
  );
}
