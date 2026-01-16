import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { submitFeedback } from '../api/feedback';
export default function FeedbackScreen({ route, navigation }: any) {
  const { moduleId } = route.params;
  const [rating, setRating] = useState(0);
  const [comments, setComments] = useState('');
  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Error', 'Please provide a rating');
      return;
    }
    try {
      await submitFeedback(moduleId, rating, comments);
      Alert.alert('Success', 'Feedback submitted! Your insights improve the system.', [
        { text: 'OK', onPress: () => navigation.popToTop() }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to submit feedback');
    }
  };
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Module Feedback</Text>
      <Text style={styles.label}>How helpful was this module?</Text>
      <View style={styles.ratingContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity key={star} onPress={() => setRating(star)}>
            <Text style={styles.star}>{star <= rating ? '⭐' : '☆'}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.label}>Additional Comments</Text>
      <TextInput
        style={styles.textarea}
        placeholder="What worked? What could be improved?"
        value={comments}
        onChangeText={setComments}
        multiline
        numberOfLines={4}
      />     
      <TouchableOpacity style={styles.button} onPress={handleSubmit}>
        <Text style={styles.buttonText}>Submit Feedback</Text>
      </TouchableOpacity>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  label: { fontSize: 16, fontWeight: '600', marginBottom: 10 },
  ratingContainer: { flexDirection: 'row', marginBottom: 30 },
  star: { fontSize: 40, marginRight: 10 },
  textarea: { backgroundColor: '#fff', padding: 15, borderRadius: 8, height: 100, fontSize: 16, marginBottom: 20 },
  button: { backgroundColor: '#007AFF', padding: 15, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
});