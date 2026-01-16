import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
export default function LoginScreen({ navigation }: any) {
  const [teacherId, setTeacherId] = useState('');
  const [cluster, setCluster] = useState('');
  const handleLogin = () => {
    if (teacherId && cluster) {
      //TO DO: Add JWT
      navigation.navigate('IssueSubmit', { teacherId, cluster });
    }
  };
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Guru Sikshan</Text>
      <Text style={styles.subtitle}>Teacher Training Platform</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Teacher ID (e.g., T001)"
        value={teacherId}
        onChangeText={setTeacherId}
      />
      <TextInput
        style={styles.input}
        placeholder="Cluster (e.g., Gandhinagar-1)"
        value={cluster}
        onChangeText={setCluster}
      />
      
      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#f5f5f5' },
  title: { fontSize: 32, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  subtitle: { fontSize: 16, textAlign: 'center', color: '#666', marginBottom: 40 },
  input: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 15, fontSize: 16 },
  button: { backgroundColor: '#007AFF', padding: 15, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
});