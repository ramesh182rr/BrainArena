import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, colors, Icon, minTouchTarget, radii, spacing, useHaptics, type IconName } from '@/design-system';

import type { TabParamList } from './types';

const ICONS: Record<keyof TabParamList, IconName> = {
  Home: 'home',
  Explore: 'explore',
  Arena: 'arena',
  Progress: 'progress',
  Profile: 'profile',
};

/** Floating game-style tab bar with a glowing gold active tab. */
export function GameTabBar({ state, navigation, descriptors }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]} accessibilityRole="tablist">
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const name = route.name as keyof TabParamList;
          const label = descriptors[route.key]?.options.tabBarLabel;
          const text = typeof label === 'string' ? label : route.name;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={text}
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) {
                  haptics.tap();
                  navigation.navigate(route.name);
                }
              }}
              style={styles.tab}
            >
              <View style={[styles.iconWrap, focused && styles.iconActive]}>
                <Icon name={ICONS[name]} size={22} color={focused ? colors.textOnGold : colors.textMuted} />
              </View>
              <AppText variant="caption" tone={focused ? 'gold' : 'muted'} style={styles.label}>
                {text}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.md },
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.tabBar,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingVertical: spacing.sm,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
  tab: { flex: 1, alignItems: 'center', gap: 2, minHeight: minTouchTarget },
  // Background and border are always set (transparent when inactive): Android can drop the corner
  // radius when a view gains a background it did not have before.
  iconWrap: {
    width: 44,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  iconActive: { backgroundColor: colors.gold, borderColor: 'rgba(255,255,255,0.6)' },
  label: { fontSize: 12, lineHeight: 15 },
});
