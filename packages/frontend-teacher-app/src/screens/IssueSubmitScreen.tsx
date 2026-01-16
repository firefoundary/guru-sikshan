import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { submitIssue } from '../api/feedback';
export default function IssueSubmitScreen({ route, navigation }: any) {
  const { teacherId, cluster } = route.params;
  const [issue, setIssue] = useState('');
  const [loading, setLoading] = useState(false);
  const handleSubmit = async () => {
    if (!issue.trim()) {
      Alert.alert('Error', 'Please describe the issue');
      return;
    }
    setLoading(true);
    try {
      const result = await submitIssue({ teacher_id: teacherId, issue, cluster });
      
      //TODO : Navigate to AI analysis
      navigation.navigate('Analysis', { 
        issue: result.issue,
        issueId: result.id 
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to submit issue. Check backend is running.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Submit Classroom Issue</Text>
      <Text style={styles.label}>Teacher: {teacherId} | Cluster: {cluster}</Text>
      <TextInput
        style={styles.textarea}
        placeholder="Describe the issue (e.g., Students struggling with fractions...)"
        value={issue}
        onChangeText={setIssue}
        multiline
        numberOfLines={6}
        textAlignVertical="top"
      />     
      <TouchableOpacity 
        style={[styles.button, loading && styles.buttonDisabled]} 
        onPress={handleSubmit}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Submitting...' : 'Submit Issue'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  label: { fontSize: 14, color: '#666', marginBottom: 20 },
  textarea: { backgroundColor: '#fff', padding: 15, borderRadius: 8, height: 150, fontSize: 16, marginBottom: 20 },
  button: { backgroundColor: '#007AFF', padding: 15, borderRadius: 8, alignItems: 'center' },
  buttonDisabled: { backgroundColor: '#ccc' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
});