// __tests__/app.test.tsx
// Smoke test: App renders without crashing (full provider + navigator tree).
import React from 'react';

// Mock heavy dependencies before importing App
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
      getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
    },
  })),
}));

jest.mock('expo-sqlite', () => ({
  openDatabaseSync: jest.fn(() => ({
    execSync: jest.fn(),
    getAllSync: jest.fn(() => []),
    runSync: jest.fn(),
    getFirstSync: jest.fn(() => null),
  })),
}));

jest.mock('../services/feedbackRepo', () => ({
  initDb: jest.fn(() => Promise.resolve()),
}));

jest.mock('../hooks/useSyncEngine', () => ({
  useSyncEngine: jest.fn(() => ({
    status: 'idle' as const,
    lastSyncedAt: null,
    lastError: null,
    syncEnabled: false,
    isOnline: true,
    manualSync: jest.fn(),
  })),
}));

// Now safe to import
import { render } from '@testing-library/react-native';
import App from '../App';

describe('App', () => {
  it('should render without crashing', () => {
    const { unmount } = render(<App />);
    expect(unmount).toBeDefined();
    unmount();
  });
});
