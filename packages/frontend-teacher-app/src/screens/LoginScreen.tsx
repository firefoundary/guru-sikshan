import React, { useState } from 'react';
import {
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  View,
} from 'react-native';
import ThemeToggle from '../components/ThemeToggle';
import { useAnimatedTheme } from '../hooks/useAnimatedTheme';

function LoginScreen({ navigation }: any) {
  const [teacherId, setTeacherId] = useState('');
  const [cluster, setCluster] = useState('');

  const {
    colors,
    backgroundColor,
    buttonColor,
    titleColor,
    subtitleColor,
    inputBg,
  } = useAnimatedTheme(); // 1.8s transition

  const handleLogin = () => {
    if (teacherId && cluster) {
      navigation.navigate('IssueSubmit', { teacherId, cluster });
    }
  };

  return (
    <Animated.View style={[styles.container, { backgroundColor }]}>
      <View style={styles.headerRow}>
        <ThemeToggle />
      </View>

      <Animated.Text style={[styles.title, { color: titleColor }]}>
        Guru Sikshan
      </Animated.Text>
      <Animated.Text style={[styles.subtitle, { color: subtitleColor }]}>
        Teacher Training Platform
      </Animated.Text>

      <Animated.View style={[styles.inputWrapper, { backgroundColor: inputBg }]}>
        <TextInput
          style={styles.input}
          placeholder="Teacher ID"
          placeholderTextColor={colors.subtitle}
          value={teacherId}
          onChangeText={setTeacherId}
        />
      </Animated.View>

      <Animated.View style={[styles.inputWrapper, { backgroundColor: inputBg }]}>
        <TextInput
          style={styles.input}
          placeholder="Cluster Name"
          placeholderTextColor={colors.subtitle}
          value={cluster}
          onChangeText={setCluster}
        />
      </Animated.View>

      <TouchableOpacity onPress={handleLogin}>
        <Animated.View style={[styles.button, { backgroundColor: buttonColor }]}>
          <Text style={styles.buttonText}>Login</Text>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  headerRow: { position: 'absolute', top: 50, right: 20, zIndex: 10 },
  title: { fontSize: 32, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  subtitle: { fontSize: 16, textAlign: 'center', marginBottom: 40 },
  inputWrapper: { borderRadius: 8, marginBottom: 15 },
  input: { padding: 15, fontSize: 16, color: '#000' },
  button: { padding: 15, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
});

export default LoginScreen;
