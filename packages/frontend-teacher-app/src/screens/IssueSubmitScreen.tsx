import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
} from 'react-native';
import { submitIssue } from '../api/feedback';
import ThemeToggle from '../components/ThemeToggle';
import { useAnimatedTheme } from '../hooks/useAnimatedTheme';

type Props = {
  route: { params: { teacherId: string; cluster: string } };
  navigation: any;
};

function IssueSubmitScreen({ route, navigation }: Props) {
  const { teacherId, cluster } = route.params;
  const [issue, setIssue] = useState('');
  const [loading, setLoading] = useState(false);

  const { colors, backgroundColor, buttonColor, inputBg } = useAnimatedTheme();

  const handleSubmit = async () => {
    if (!issue.trim()) {
      Alert.alert('Error', 'Please describe the issue');
      return;
    }

    setLoading(true);
    try {
      const result = await submitIssue({ teacher_id: teacherId, issue, cluster });
      navigation.navigate('Analysis', {
        issue: result.issue,
        issueId: result.id,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to submit issue. Check backend is running.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Animated.View style={[styles.container, { backgroundColor }]}>
      <View style={styles.headerRow}>
        <ThemeToggle />
      </View>

      <Text style={[styles.header, { color: colors.text }]}>
        Submit Classroom Issue
      </Text>
      <Text style={[styles.label, { color: colors.subtitle }]}>
        Teacher: {teacherId} | Cluster: {cluster}
      </Text>

      <Animated.View style={[styles.textareaWrapper, { backgroundColor: inputBg }]}>
        <TextInput
          style={styles.textarea}
          placeholder="Describe the classroom issue..."
          placeholderTextColor={colors.subtitle}
          multiline
          value={issue}
          onChangeText={setIssue}
        />
      </Animated.View>

      <TouchableOpacity onPress={handleSubmit} disabled={loading}>
        <Animated.View
          style={[
            styles.button,
            { backgroundColor: buttonColor },
            loading && styles.buttonDisabled,
          ]}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Submitting...' : 'Submit Issue'}
          </Text>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  headerRow: { alignItems: 'flex-end', marginBottom: 10 },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  label: { fontSize: 14, marginBottom: 20 },
  textareaWrapper: { borderRadius: 8, marginBottom: 20 },
  textarea: {
    padding: 15,
    height: 150,
    fontSize: 16,
    textAlignVertical: 'top',
    color: '#000',
  },
  button: { padding: 15, borderRadius: 8, alignItems: 'center' },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
});

export default IssueSubmitScreen;
