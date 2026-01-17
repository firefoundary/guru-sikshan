import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
  Image,          
} from 'react-native';
import { submitFeedback } from '../api/feedback';
import ThemeToggle from '../components/ThemeToggle';
import { useAnimatedTheme } from '../hooks/useAnimatedTheme';

type Props = {
  route: { params: { moduleId: number } };
  navigation: any;
};

function FeedbackScreen({ route, navigation }: Props) {
  const { moduleId } = route.params;
  const [rating, setRating] = useState(0);
  const [comments, setComments] = useState('');

  const { colors, backgroundColor, buttonColor, inputBg, isDarkMode } =
    useAnimatedTheme();

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Error', 'Please provide a rating');
      return;
    }

    try {
      await submitFeedback(moduleId, rating, comments);
      Alert.alert(
        'Success',
        'Feedback submitted! Your insights improve the system.',
        [{ text: 'OK', onPress: () => navigation.popToTop() }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to submit feedback');
      console.error(error);
    }
  };

  return (
    <Animated.View style={[styles.container, { backgroundColor }]}>
      <View style={styles.headerRow}>
        <ThemeToggle />
      </View>

      <Text style={[styles.header, { color: colors.text }]}>
        Module Feedback
      </Text>

      <Text style={[styles.label, { color: colors.text }]}>
        How helpful was this module?
      </Text>

      <View style={styles.ratingContainer}>
        {[1, 2, 3, 4, 5].map(star => {
          const starSource =
            star <= rating
              ? require('../../assets/rating_star.png') 
              : isDarkMode
              ? require('../../assets/black_background_star.png') 
              : require('../../assets/white_background_star.png'); 

          return (
            <TouchableOpacity
              key={star}
              onPress={() => setRating(star)}
              activeOpacity={0.8}
            >
              <Image source={starSource} style={styles.starImage} />
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[styles.label, { color: colors.text }]}>
        Additional Comments
      </Text>
      <Animated.View
        style={[styles.textareaWrapper, { backgroundColor: inputBg }]}
      >
        <TextInput
          style={styles.textarea}
          placeholder="Your feedback helps improve training..."
          placeholderTextColor={colors.subtitle}
          multiline
          value={comments}
          onChangeText={setComments}
        />
      </Animated.View>

      <TouchableOpacity onPress={handleSubmit}>
        <Animated.View
          style={[styles.button, { backgroundColor: buttonColor }]}
        >
          <Text style={styles.buttonText}>Submit Feedback</Text>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  headerRow: { alignItems: 'flex-end', marginBottom: 10 },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  label: { fontSize: 16, fontWeight: '600', marginBottom: 10 },
  ratingContainer: { flexDirection: 'row', marginBottom: 30 },
  starImage: {
    width: 40,
    height: 40,
    marginRight: 10,
    resizeMode: 'contain',
  },
  textareaWrapper: { borderRadius: 8, marginBottom: 20 },
  textarea: {
    padding: 15,
    height: 100,
    fontSize: 16,
    textAlignVertical: 'top',
    color: '#000',
  },
  button: { padding: 15, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
});

export default FeedbackScreen;
