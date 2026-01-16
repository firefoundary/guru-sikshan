import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
export default function AnalysisScreen({ route, navigation }: any) {
  const { issue, issueId } = route.params;
  useEffect(() => {
    //TODO: Call Python ML service
    const timer = setTimeout(() => {
      navigation.navigate('Module', {
        module: {
          id: 1,
          title: 'Teaching Fractions: Visual Methods',
          content: 'Use pie charts and fraction bars to help students visualize parts of a whole...',
          duration: '15 min',
        },
      });
    }, 3000);
    return () => clearTimeout(timer);
  }, []);
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={styles.text}>🤖 AI Analyzing Issue...</Text>
      <Text style={styles.subtext}>Identifying competency gaps using K-Means clustering</Text>
      <Text style={styles.issue}>"{issue}"</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#f5f5f5' },
  text: { fontSize: 20, fontWeight: 'bold', marginTop: 20 },
  subtext: { fontSize: 14, color: '#666', marginTop: 10, textAlign: 'center' },
  issue: { fontSize: 14, fontStyle: 'italic', color: '#333', marginTop: 20, textAlign: 'center' },
});