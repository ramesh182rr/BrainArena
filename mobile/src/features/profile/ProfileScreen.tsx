import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { useAppServices, usePreferencesControl } from '@/app/services';
import { AppText, Card, colors, Icon, radii, Screen, spacing, type MotionPreference } from '@/design-system';

const MOTION_OPTIONS: { value: MotionPreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'reduced', label: 'Reduced' },
  { value: 'full', label: 'Full' },
];

export function ProfileScreen() {
  const { profile } = useAppServices();
  const { preferences, update } = usePreferencesControl();

  return (
    <Screen scroll>
      <AppText variant="display" shadow>
        Profile
      </AppText>
      <Card style={styles.player}>
        <LinearGradient colors={['#FFE58A', '#FF9548']} style={styles.avatar}>
          <Icon name="profile" size={40} color={colors.textOnGold} />
        </LinearGradient>
        <View style={styles.flex}>
          <AppText variant="heading">Guest Explorer</AppText>
          <AppText tone="muted">Progress is saved on this device. Optional accounts and cloud backup are coming later.</AppText>
        </View>
      </Card>

      <AppText variant="title" shadow>
        Settings
      </AppText>
      <Card>
        <AppText variant="label">Motion</AppText>
        <AppText variant="caption" tone="muted">
          Reduced turns off confetti, floating islands and board animations.
        </AppText>
        <View accessibilityRole="radiogroup" accessibilityLabel="Motion" style={styles.segment}>
          {MOTION_OPTIONS.map((o) => {
            const selected = preferences.motion === o.value;
            return (
              <Pressable
                key={o.value}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`Motion: ${o.label}`}
                onPress={() => update({ motion: o.value })}
                style={[styles.segmentItem, selected && styles.segmentSelected]}
              >
                <AppText variant="label" tone={selected ? 'onGold' : 'primary'}>
                  {o.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.switchRow}>
          <View style={styles.flex}>
            <AppText variant="label">Haptics</AppText>
            <AppText variant="caption" tone="muted">
              Gentle vibration on taps and wins.
            </AppText>
          </View>
          <Switch
            accessibilityLabel="Haptics"
            value={preferences.haptics}
            onValueChange={(haptics) => update({ haptics })}
            trackColor={{ true: colors.gold, false: 'rgba(255,255,255,0.25)' }}
            thumbColor="#FFFFFF"
          />
        </View>
      </Card>

      <Card>
        <AppText variant="label">About</AppText>
        <AppText tone="muted">BrainArena Solo is a collection of puzzle games for fun. It is not a medical or diagnostic tool.</AppText>
        <AppText variant="caption" tone="muted" style={styles.topGap}>
          Version {Constants.expoConfig?.version ?? 'dev'} · Explorer since {profile.createdAt.slice(0, 10)}
        </AppText>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  player: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FFFFFF' },
  flex: { flex: 1, gap: 2 },
  segment: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  segmentItem: { flex: 1, minHeight: 48, borderRadius: radii.pill, borderWidth: 1.5, borderColor: colors.glassBorder, backgroundColor: colors.glass, alignItems: 'center', justifyContent: 'center' },
  segmentSelected: { backgroundColor: colors.gold, borderColor: '#FFFFFF' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.lg },
  topGap: { marginTop: spacing.sm },
});
