// __tests__/premiumContext.test.tsx
// Smoke test: PremiumContext defaults to free tier (isPremium = false).
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { PremiumProvider, usePremium } from '../context/PremiumContext';

function PremiumConsumer() {
  const { isPremium } = usePremium();
  return <Text testID="premium-status">{isPremium ? 'premium' : 'free'}</Text>;
}

describe('PremiumContext', () => {
  it('should default to free tier', async () => {
    render(
      <PremiumProvider>
        <PremiumConsumer />
      </PremiumProvider>
    );

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
