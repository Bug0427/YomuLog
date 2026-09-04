// __tests__/appNavigator.test.tsx
// Smoke test: AppNavigator mounts all registered screens.
// Wrapped in the same provider stack App.tsx uses (SafeAreaProvider →
// ThemeProvider → AuthProvider → PremiumProvider): AppNavigator's
// ErrorBoundary consumes useTheme, and the navigator screens consume
// Auth/Premium contexts, so a bare <AppNavigator /> render throws
// "useTheme must be used within a ThemeProvider".

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
      getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      resend: jest.fn(),
    },
  })),
}));

import React from 'react';
import { render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '../context/ThemeContext';
import { AuthProvider } from '../context/AuthContext';
import { PremiumProvider } from '../context/PremiumContext';
import AppNavigator from '../navigation/AppNavigator';

describe('AppNavigator', () => {
  it('should render without crashing', () => {
    const { unmount } = render(
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <PremiumProvider>
              <AppNavigator />
            </PremiumProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    );
    expect(unmount).toBeDefined();
    unmount();
  });
});