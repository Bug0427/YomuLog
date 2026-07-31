// __tests__/authContext.test.tsx
// Smoke test: AuthContext exposes auth methods and defaults to unauthenticated.

// Mock supabase before any imports that transitively pull it in
process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

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

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { AuthProvider, useAuth } from '../context/AuthContext';

function AuthConsumer() {
  const { user, isAuthenticated, isReady } = useAuth();
  return (
    <>
      <Text testID="auth-ready">{isReady ? 'ready' : 'loading'}</Text>
      <Text testID="auth-status">{isAuthenticated ? 'authenticated' : 'unauthenticated'}</Text>
      <Text testID="auth-user">{user?.email ?? 'none'}</Text>
    </>
  );
}

describe('AuthContext', () => {
  it('should default to unauthenticated with no user', async () => {
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toBeTruthy();
    });

    expect(screen.getByTestId('auth-ready').props.children).toBe('ready');
    expect(screen.getByTestId('auth-status').props.children).toBe('unauthenticated');
    expect(screen.getByTestId('auth-user').props.children).toBe('none');
  });

  it('should expose signIn, signUp, and signOut methods', async () => {
    let contextValue: any = null;

    function ContextCapture() {
      contextValue = useAuth();
      return <Text testID="captured">captured</Text>;
    }

    render(
      <AuthProvider>
        <ContextCapture />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('captured')).toBeTruthy();
    });

    expect(contextValue).not.toBeNull();
    expect(typeof contextValue.signIn).toBe('function');
    expect(typeof contextValue.signUp).toBe('function');
    expect(typeof contextValue.signOut).toBe('function');
    expect(contextValue.isAuthenticated).toBe(false);
    expect(contextValue.user).toBeNull();
  });

  it('should throw error when useAuth is used outside AuthProvider', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<AuthConsumer />);
    }).toThrow('useAuth must be used within an AuthProvider');

    consoleError.mockRestore();
  });
});
