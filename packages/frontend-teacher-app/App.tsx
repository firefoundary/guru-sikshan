import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ThemeProvider } from './src/context/ThemeContext';

import LoginScreen from './src/screens/LoginScreen';
import IssueSubmitScreen from './src/screens/IssueSubmitScreen';
import AnalysisScreen from './src/screens/AnalysisScreen';
import ModuleScreen from './src/screens/ModuleScreen';
import FeedbackScreen from './src/screens/FeedbackScreen';

// Define your param list for type safety
type RootStackParamList = {
  Login: undefined;
  IssueSubmit: { teacherId: string; cluster: string };
  Analysis: { issue: string; issueId: number };
  Module: {
    module: {
      id: number;
      title: string;
      content: string;
      duration: string;
    };
  };
  Feedback: { moduleId: number };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <ThemeProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="IssueSubmit" component={IssueSubmitScreen} />
          <Stack.Screen name="Analysis" component={AnalysisScreen} />
          <Stack.Screen name="Module" component={ModuleScreen} />
          <Stack.Screen name="Feedback" component={FeedbackScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </ThemeProvider>
  );
}
