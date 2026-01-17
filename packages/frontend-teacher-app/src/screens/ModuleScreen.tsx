import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
} from 'react-native';
import ThemeToggle from '../components/ThemeToggle';
import { useAnimatedTheme } from '../hooks/useAnimatedTheme';

type Module = {
  id: number;
  title: string;
  content: string;
  duration: string;
};

type Props = {
  route: { params: { module: Module } };
  navigation: any;
};

function ModuleScreen({ route, navigation }: Props) {
  const { module } = route.params;
  const { colors, backgroundColor, buttonColor, cardBg, inputBg } =
    useAnimatedTheme();

  const handleComplete = () => {
    navigation.navigate('Feedback', { moduleId: module.id });
  };

  return (
    <Animated.View style={[styles.container, { backgroundColor }]}>
      <View style={styles.headerRow}>
        <ThemeToggle />
      </View>

      <ScrollView>
        <Text style={[styles.title, { color: colors.text }]}>
          {module.title}
        </Text>
        <Text style={[styles.duration, { color: colors.subtitle }]}>
          {module.duration}
        </Text>

        <Animated.View style={[styles.content, { backgroundColor: cardBg }]}>
          <Text style={[styles.contentText, { color: colors.text }]}>
            {module.content}
          </Text>

          <Animated.View
            style={[styles.videoPlaceholder, { backgroundColor: inputBg }]}
          >
            <Text style={[styles.placeholderText, { color: colors.text }]}>
              Video Lesson
            </Text>
            <Text
              style={[styles.placeholderSubtext, { color: colors.subtitle }]}
            >
              (Offline-capable)
            </Text>
          </Animated.View>
        </Animated.View>

        <TouchableOpacity onPress={handleComplete}>
          <Animated.View
            style={[styles.button, { backgroundColor: buttonColor }]}
          >
            <Text style={styles.buttonText}>Complete Module</Text>
          </Animated.View>
        </TouchableOpacity>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  headerRow: { alignItems: 'flex-end', marginBottom: 10 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  duration: { fontSize: 16, marginBottom: 20 },
  content: { padding: 20, borderRadius: 8, marginBottom: 20 },
  contentText: { fontSize: 16, lineHeight: 24, marginBottom: 20 },
  videoPlaceholder: {
    padding: 40,
    borderRadius: 8,
    alignItems: 'center',
  },
  placeholderText: { fontSize: 18, fontWeight: '600' },
  placeholderSubtext: { fontSize: 14, marginTop: 5 },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
});

export default ModuleScreen;
