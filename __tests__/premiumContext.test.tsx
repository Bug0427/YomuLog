// __tests__/premiumContext.test.tsx
// Smoke test: PremiumContext defaults to free tier (isPremium = false).
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { PremiumProvider, usePremium } from '../context/PremiumContext';
import { AuthProvider } from '../context/AuthContext';

function PremiumConsumer() {
  const { isPremium } = usePremium();
  return <Text testID="premium-status">{isPremium ? 'premium' : 'free'}</Text>;
}

// PremiumProvider reads AuthContext (re-fetches entitlement on auth change),
// so it must always be rendered inside AuthProvider — same as App.tsx.
function renderWithProviders(ui: React.ReactElement) {
  return render(
    <AuthProvider>
      <PremiumProvider>{ui}</PremiumProvider>
    </AuthProvider>
  );
}

describe('PremiumContext', () => {
  it('should default to free tier', async () => {
    renderWithProviders(<PremiumConsumer />);

    await waitFor(() => {
      expect(screen.getByTestId('premium-status')).toBeTruthy();
    });

    expect(screen.getByTestId('premium-status').props.children).toBe('free');
  });

  it('should throw error when usePremium is used outside PremiumProvider', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<PremiumConsumer />);
    }).toThrow('usePremium must be used within a PremiumProvider');

    consoleError.mockRestore();
  });
});
