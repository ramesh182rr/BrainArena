import { useNavigation } from '@react-navigation/native';

import type { RootNavigation } from '@/app/navigation/types';
import { AppText, Button, Card, Screen } from '@/design-system';

/** Placeholder until the Daily Arena milestone (M6). States plainly that it is not built yet. */
export function ArenaScreen() {
  const navigation = useNavigation<RootNavigation>();
  return (
    <Screen scroll edges={['left', 'right']}>
      <Card>
        <AppText variant="heading">Daily Arena is on its way</AppText>
        <AppText tone="secondary">
          Each day you&apos;ll get a short, optional mix of three to five puzzles chosen for variety. You can always skip
          it and explore freely.
        </AppText>
      </Card>
      <Button label="Explore worlds" onPress={() => navigation.navigate('Tabs', { screen: 'Explore' })} />
    </Screen>
  );
}
