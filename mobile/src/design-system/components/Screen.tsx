import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import type { ReactNode } from 'react';

import { colors, spacing } from '../tokens';

export interface ScreenProps {
  children: ReactNode;
  /** Scroll when content can exceed the viewport (most non-game screens). */
  scroll?: boolean;
  /** Safe-area edges to pad. Screens under a navigation header should omit 'top'. */
  edges?: readonly Edge[];
  testID?: string;
  contentStyle?: StyleProp<ViewStyle>;
}

const defaultEdges: readonly Edge[] = ['top', 'left', 'right'];

/** Page wrapper: safe areas, background colour and standard gutters. */
export function Screen({
  children,
  scroll = false,
  edges = defaultEdges,
  testID,
  contentStyle,
}: ScreenProps) {
  return (
    <SafeAreaView edges={edges} style={styles.root} {...(testID ? { testID } : {})}>
      {scroll ? (
        <ScrollView contentContainerStyle={[styles.content, contentStyle]}>{children}</ScrollView>
      ) : (
        <View style={[styles.content, styles.fill, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  fill: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg },
});
