import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { spacing } from '../tokens';
import { GameBackground } from './GameBackground';

export interface ScreenProps {
  children: ReactNode;
  /** Scroll when content can exceed the viewport. */
  scroll?: boolean;
  /** Safe-area edges to pad. */
  edges?: readonly Edge[];
  /** Keeps the background still, e.g. behind a puzzle. */
  calm?: boolean;
  /** Content pinned above the scroll area, e.g. a header bar. */
  header?: ReactNode;
  /** Full-screen layer above everything, e.g. a pause or win dialog. */
  overlay?: ReactNode;
  testID?: string;
  contentStyle?: StyleProp<ViewStyle>;
}

const defaultEdges: readonly Edge[] = ['top', 'left', 'right'];

/** Page wrapper: cosmic background, safe areas and standard gutters. */
export function Screen({ children, scroll = false, edges = defaultEdges, calm = false, header, overlay, testID, contentStyle }: ScreenProps) {
  return (
    <View style={styles.root} {...(testID ? { testID } : {})}>
      <GameBackground calm={calm} />
      <SafeAreaView edges={edges} style={styles.fill}>
        {header}
        {scroll ? (
          <ScrollView contentContainerStyle={[styles.content, styles.scrollPad, contentStyle]} showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.content, styles.fill, contentStyle]}>{children}</View>
        )}
      </SafeAreaView>
      {overlay}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  fill: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg },
  scrollPad: { paddingBottom: spacing.xxxl * 2 },
});
