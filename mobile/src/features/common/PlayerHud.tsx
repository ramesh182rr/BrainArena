import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { AppText, colors, Icon, Pill, radii, spacing } from '@/design-system';

import { STARS_PER_LEVEL, type RewardSummary } from '../progress/rewards';

/** Top bar: guest avatar, Explorer level with progress, total stars. */
export function PlayerHud({ rewards }: { rewards: RewardSummary }) {
  const progress = rewards.starsIntoLevel / STARS_PER_LEVEL;
  return (
    <View style={styles.row}>
      <View
        style={styles.player}
        accessible
        accessibilityLabel={`Explorer level ${rewards.explorerLevel}. ${rewards.starsIntoLevel} of ${STARS_PER_LEVEL} stars to the next level.`}
      >
        <LinearGradient colors={['#FFE58A', '#FF9548']} style={styles.avatar}>
          <AppText variant="heading" tone="onGold">
            {rewards.explorerLevel}
          </AppText>
        </LinearGradient>
        <View style={styles.meta}>
          <AppText variant="label">Explorer</AppText>
          <View style={styles.track}>
            <LinearGradient
              colors={['#FFE58A', '#FFAE1A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.fill, { width: `${Math.max(6, progress * 100)}%` }]}
            />
          </View>
        </View>
      </View>
      <Pill
        label={String(rewards.totalStars)}
        accessibilityLabel={`${rewards.totalStars} stars`}
        tone="dark"
        icon={<Icon name="star" size={18} color={colors.star} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  player: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
  },
  meta: { gap: 4, flex: 1, maxWidth: 160 },
  track: { height: 8, borderRadius: radii.pill, backgroundColor: 'rgba(255,255,255,0.15)', overflow: 'hidden' },
  fill: { height: 8, borderRadius: radii.pill },
});
