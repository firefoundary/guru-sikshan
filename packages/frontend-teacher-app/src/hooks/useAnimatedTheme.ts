import { useRef, useEffect } from 'react';
import { Animated } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export function useAnimatedTheme(duration: number = 1800) {
  const { isDarkMode, colors } = useTheme();

  const progress = useRef(new Animated.Value(isDarkMode ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: isDarkMode ? 1 : 0,
      duration,
      useNativeDriver: true, 
    }).start();
  }, [isDarkMode, progress, duration]);

  const backgroundColor = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['#f5f5f5', '#1a1a1a'],
  });

  const buttonColor = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['#023E8A', '#BF77F6'],
  });

  const titleColor = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['#000000', '#ffffff'],
  });

  const subtitleColor = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['#666666', '#cccccc'],
  });

  const inputBg = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['#ffffff', '#333333'],
  });

  const cardBg = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['#ffffff', '#2a2a2a'],
  });

  return {
    isDarkMode,
    colors,
    progress,
    backgroundColor,
    buttonColor,
    titleColor,
    subtitleColor,
    inputBg,
    cardBg,
  };
}
