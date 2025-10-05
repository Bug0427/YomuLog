import React, { useEffect } from 'react';
import AppNavigator from './navigation/AppNavigator';
import { initDb } from './services/feedbackRepo';

export default function App() {
  useEffect(() => {
    initDb().catch((e) => console.error('DB init failed', e));
  }, []);
  return <AppNavigator />;
}