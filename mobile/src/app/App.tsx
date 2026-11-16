import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

/**
 * Temporary root component. Navigation, providers and startup (SQLite
 * migrations) replace this placeholder as M1 progresses.
 */
export default function App() {
  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>
        BrainArena Solo
      </Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#17233F',
    fontSize: 28,
    fontWeight: '700',
  },
});
