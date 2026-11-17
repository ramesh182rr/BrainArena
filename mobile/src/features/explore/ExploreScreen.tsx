import { useNavigation } from '@react-navigation/native';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import type { RootNavigation } from '@/app/navigation/types';
import { AppText, colors, Pill, radii, Screen, spacing } from '@/design-system';
import { gamesInWorld, playableCount, worlds } from '@/games/catalogue';

import { WorldEmblem } from '../common/WorldEmblem';

const ROW = 210;
const STOP = 190;

/** World map: islands zig-zag down a dotted star path. */
export function ExploreScreen() {
  const navigation = useNavigation<RootNavigation>();
  const { width } = useWindowDimensions();
  const inner = width - spacing.lg * 2;
  const xFor = (i: number) => (i % 2 === 0 ? inner * 0.28 : inner * 0.72);

  const path = worlds
    .map((_, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)} ${i * ROW + 80}`)
    .join(' ');

  return (
    <Screen scroll>
      <View style={styles.head}>
        <AppText variant="display" shadow>
          World Map
        </AppText>
        <AppText tone="muted">Six puzzle worlds. Explore freely, in any order.</AppText>
      </View>
      <View style={{ height: worlds.length * ROW }}>
        <Svg width={inner} height={worlds.length * ROW} style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Path d={path} stroke="rgba(255,229,138,0.55)" strokeWidth={4} strokeDasharray="2 12" strokeLinecap="round" fill="none" />
        </Svg>
        {worlds.map((world, i) => {
          const playable = playableCount(world.id);
          const total = gamesInWorld(world.id).length;
          return (
            <Pressable
              key={world.id}
              testID={`world-${world.id}`}
              accessibilityRole="button"
              accessibilityLabel={`${world.title}. ${world.tagline}. ${playable} of ${total} games playable.`}
              onPress={() => navigation.navigate('World', { worldId: world.id })}
              style={({ pressed }) => [
                styles.stop,
                { top: i * ROW, left: xFor(i) - STOP / 2 },
                pressed && styles.pressed,
              ]}
            >
              <WorldEmblem worldId={world.id} size={140} delayMs={i * 280} />
              <View style={styles.plate}>
                <AppText variant="label" style={styles.center} numberOfLines={2}>
                  {world.title}
                </AppText>
              </View>
              <Pill
                label={playable > 0 ? `${playable}/${total} open` : 'Coming soon'}
                tone={playable > 0 ? 'gold' : 'dark'}
                style={styles.badge}
              />
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { gap: spacing.xs },
  stop: { position: 'absolute', width: STOP, alignItems: 'center' },
  plate: {
    marginTop: -14,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
    maxWidth: STOP,
  },
  badge: { alignSelf: 'center', marginTop: spacing.xs },
  center: { textAlign: 'center' },
  pressed: { transform: [{ scale: 0.95 }] },
});
