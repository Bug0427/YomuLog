import React, { useEffect } from 'react';
import AppNavigator from './navigation/AppNavigator';
import { initDb } from './services/feedbackRepo';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './context/ThemeContext';

export default function App() {
  useEffect(() => {
    initDb().catch((e) => console.error('DB init failed', e));
  }, []);
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppNavigator />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}