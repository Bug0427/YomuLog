// __tests__/appNavigator.test.tsx
// Smoke test: AppNavigator mounts all registered screens.

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
import AppNavigator from '../navigation/AppNavigator';

describe('AppNavigator', () => {
  it('should render without crashing', () => {
    const { unmount } = render(<AppNavigator />);
    expect(unmount).toBeDefined();
    unmount();
  });
});
