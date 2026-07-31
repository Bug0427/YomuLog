// __tests__/themeContext.test.tsx
// Smoke test: ThemeContext provides default 'light' theme colors.
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { ThemeProvider, useTheme } from '../context/ThemeContext';

// Child component that reads theme and displays the background color
function ThemeConsumer() {
  const { mode, colors } = useTheme();
  return (
    <>
      <Text testID="theme-mode">{mode}</Text>
      <Text testID="theme-bg">{colors.bg}</Text>
      <Text testID="theme-textPrimary">{colors.textPrimary}</Text>
      <Text testID="theme-accent">{colors.accent}</Text>
    </>
  );
}

describe('ThemeContext', () => {
  it('should provide default light theme colors', async () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    // Provider sets ready=true after AsyncStorage resolves (mock returns null → defaults to 'light')
    await waitFor(() => {
      expect(screen.getByTestId('theme-mode')).toBeTruthy();
    });

    expect(screen.getByTestId('theme-mode').props.children).toBe('light');
    expect(screen.getByTestId('theme-bg').props.children).toBe('#AFA6DD');
    expect(screen.getByTestId('theme-textPrimary').props.children).toBe('#543C27');
    expect(screen.getByTestId('theme-accent').props.children).toBe('#463B54');
  });

  it('should throw error when useTheme is used outside ThemeProvider', () => {
    // Suppress console.error for expected error boundary test
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<ThemeConsumer />);
    }).toThrow('useTheme must be used within a ThemeProvider');

    consoleError.mockRestore();
  });
});
