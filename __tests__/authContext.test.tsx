// __tests__/authContext.test.tsx
// Smoke test: AuthContext exposes auth methods and defaults to unauthenticated.

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { AuthProvider, useAuthContext } from '../context/AuthContext';

function AuthConsumer() {
  const { isLoggedIn, username } = useAuthContext();
  const isAuthenticated = isLoggedIn;
  return (
    <>
      <Text testID="auth-status">{isAuthenticated ? 'authenticated' : 'unauthenticated'}</Text>
      <Text testID="auth-user">{username ?? 'none'}</Text>
    </>
  );
}

describe('AuthContext', () => {
  it('should default to unauthenticated with no user', () => {
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId('auth-status').props.children).toBe('unauthenticated');
    expect(screen.getByTestId('auth-user').props.children).toBe('none');
  });

  it('should expose login and logout methods', () => {
    let contextValue: any = null;

    function ContextCapture() {
      contextValue = useAuthContext();
      return <Text testID="captured">captured</Text>;
    }

    render(
      <AuthProvider>
        <ContextCapture />
      </AuthProvider>
    );

    expect(contextValue).not.toBeNull();
    expect(typeof contextValue.login).toBe('function');
    expect(typeof contextValue.logout).toBe('function');
    expect(contextValue.isLoggedIn).toBe(false);
  });

  it('should throw error when useAuthContext is used outside AuthProvider', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<AuthConsumer />);
    }).toThrow('useAuthContext must be used within AuthProvider');

    consoleError.mockRestore();
  });
});
