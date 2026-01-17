import React, { useRef } from 'react';
import { TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle() {
  const { isDarkMode, toggleTheme } = useTheme();

  const scale = useRef(new Animated.Value(1)).current;
  const rotation = useRef(new Animated.Value(0)).current;

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const handlePress = () => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 0.8,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(rotation, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          friction: 3,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(rotation, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    toggleTheme();
  };

  return (
    <TouchableOpacity onPress={handlePress} style={styles.themeToggle}>
      <Animated.Image
        source={
          isDarkMode
            ? require('../../assets/2.png') 
            : require('../../assets/1.png') 
        }
        style={[
          styles.themeIcon,
          {
            transform: [{ scale }, { rotate: spin }],
          },
        ]}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  themeToggle: {
    padding: 10,
  },
  themeIcon: {
    width: 44,
    height: 44,
  },
});
