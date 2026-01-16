import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from './src/screens/LoginScreen';
import IssueSubmitScreen from './src/screens/IssueSubmitScreen';
import AnalysisScreen from './src/screens/AnalysisScreen';
import ModuleScreen from './src/screens/ModuleScreen';
import FeedbackScreen from './src/screens/FeedbackScreen';
const Stack = createNativeStackNavigator();
export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen 
          name="Login" 
          component={LoginScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="IssueSubmit" 
          component={IssueSubmitScreen}
          options={{ title: 'Submit Issue' }}
        />
        <Stack.Screen 
          name="Analysis" 
          component={AnalysisScreen}
          options={{ title: 'AI Analysis', headerBackVisible: false }}
        />
        <Stack.Screen 
          name="Module" 
          component={ModuleScreen}
          options={{ title: 'Training Module' }}
        />
        <Stack.Screen 
          name="Feedback" 
          component={FeedbackScreen}
          options={{ title: 'Feedback' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
