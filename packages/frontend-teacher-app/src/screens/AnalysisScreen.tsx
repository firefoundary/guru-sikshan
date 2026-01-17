import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Animated,
} from 'react-native';
import ThemeToggle from '../components/ThemeToggle';
import { useAnimatedTheme } from '../hooks/useAnimatedTheme';

type Props = {
  route: { params: { issue: string; issueId: number } };
  navigation: any;
};

function AnalysisScreen({ route, navigation }: Props) {
  const { issue } = route.params;
  const { colors, backgroundColor } = useAnimatedTheme();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.navigate('Module', {
        module: {
          id: 1,
          title: 'Teaching Fractions: Visual Methods',
          content:
            'Use pie charts and fraction bars to help students visualize parts of a whole...',
          duration: '15 min',
        },
      });
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <Animated.View style={[styles.container, { backgroundColor }]}>
      <View style={styles.headerRow}>
        <ThemeToggle />
      </View>

      <View style={styles.content}>
        <ActivityIndicator size="large" color={colors.button} />
        <Text style={[styles.text, { color: colors.text }]}>
          AI Analyzing Issue...
        </Text>
        <Text style={[styles.subtext, { color: colors.subtitle }]}>
          Identifying competency gaps using K-Means clustering
        </Text>
        <Text style={[styles.issue, { color: colors.text }]}>
          "{issue}"
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  headerRow: { alignItems: 'flex-end', marginBottom: 10 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { fontSize: 20, fontWeight: 'bold', marginTop: 20 },
  subtext: { fontSize: 14, marginTop: 10, textAlign: 'center' },
  issue: { fontSize: 14, fontStyle: 'italic', marginTop: 20, textAlign: 'center' },
});

export default AnalysisScreen;
