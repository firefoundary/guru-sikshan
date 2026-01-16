import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
export default function ModuleScreen({ route, navigation }: any) {
  const { module } = route.params;

  const handleComplete = () => {
    navigation.navigate('Feedback', { moduleId: module.id });
  };
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{module.title}</Text>
      <Text style={styles.duration}>⏱️ {module.duration}</Text>
      
      <View style={styles.content}>
        <Text style={styles.contentText}>{module.content}</Text>
        {/*TODO: Add placeholder for video/interactive content */}
        <View style={styles.videoPlaceholder}>
          <Text style={styles.placeholderText}>📹 Video Lesson</Text>
          <Text style={styles.placeholderSubtext}>(Offline-capable)</Text>
        </View>
      </View>     
      <TouchableOpacity style={styles.button} onPress={handleComplete}>
        <Text style={styles.buttonText}>Complete Module</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  duration: { fontSize: 16, color: '#666', marginBottom: 20 },
  content: { backgroundColor: '#fff', padding: 20, borderRadius: 8, marginBottom: 20 },
  contentText: { fontSize: 16, lineHeight: 24, marginBottom: 20 },
  videoPlaceholder: { backgroundColor: '#e0e0e0', padding: 40, borderRadius: 8, alignItems: 'center' },
  placeholderText: { fontSize: 18, fontWeight: '600' },
  placeholderSubtext: { fontSize: 14, color: '#666', marginTop: 5 },
  button: { backgroundColor: '#007AFF', padding: 15, borderRadius: 8, alignItems: 'center', marginBottom: 20 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
});