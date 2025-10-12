import React, { useEffect } from 'react';
import AppNavigator from './navigation/AppNavigator';
import { initDb } from './services/feedbackRepo';
import { ConfirmProvider } from './components/admin/confirmation';

export default function App() {
  useEffect(() => {
    initDb().catch((e) => console.error('DB init failed', e));
  }, []);
  return (
    <ConfirmProvider>
      <AppNavigator />
    </ConfirmProvider>
  );
}