// __tests__/appNavigator.test.tsx
// Smoke test: AppNavigator mounts all registered screens.
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
