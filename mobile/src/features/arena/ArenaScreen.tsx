import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import type { RootNavigation } from '@/app/navigation/types';
import { AppText, Button, colors, Icon, Pill, radii, Screen, spacing } from '@/design-system';

/** Placeholder until the Daily Arena milestone (M6). States plainly that it is not built yet. */
export function ArenaScreen() {
  const navigation = useNavigation<RootNavigation>();
  return (
    <Screen scroll>
      <AppText variant="display" shadow>
        Daily Arena
      </AppText>
      <View style={styles.hero}>
        <LinearGradient colors={['#7B5CF0', '#F28BC2']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <View style={styles.trophy}>
          <Icon name="arena" size={56} color={colors.textOnGold} />
        </View>
        <Pill label="Coming soon" tone="dark" icon={<Icon name="lock" size={14} color={colors.textPrimary} />} />
        <AppText shadow style={styles.center}>
          Each day you&apos;ll get a short, optional mix of three to five puzzles picked for variety. Skip it whenever you
          like and explore freely.
        </AppText>
      </View>
      <View style={styles.slots}>
        {[1, 2, 3].map((n) => (
          <View key={n} style={styles.slot} accessible accessibilityLabel={`Puzzle slot ${n}, locked`}>
            <Icon name="lock" size={22} color={colors.textMuted} />
            <AppText variant="caption" tone="muted">
              Puzzle {n}
            </AppText>
          </View>
        ))}
      </View>
      <Button label="Explore worlds" variant="primary" onPress={() => navigation.navigate('Tabs', { screen: 'Explore' })} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: radii.lg, overflow: 'hidden', alignItems: 'center', gap: spacing.md, padding: spacing.xl, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)' },
  trophy: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: '#FFFFFF' },
  center: { textAlign: 'center' },
  slots: { flexDirection: 'row', gap: spacing.md },
  slot: { flex: 1, aspectRatio: 1, borderRadius: radii.md, backgroundColor: colors.glass, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.glassBorder, alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
});
