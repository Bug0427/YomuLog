import React from 'react';
import ErrorBoundary from './ErrorBoundary';

/**
 * Screen-level ErrorBoundary wrapper.
 *
 * Wraps each screen individually so a crash in one screen
 * only affects that screen — not the entire navigation stack.
 *
 * Usage:
 *   <Stack.Screen name="Foo">
 *     {(props) => (
 *       <ScreenErrorBoundary screenName="Foo">
 *         <FooScreen {...props} />
 *       </ScreenErrorBoundary>
 *     )}
 *   </Stack.Screen>
 */
export default function ScreenErrorBoundary({
  screenName,
  children,
}: {
  screenName: string;
  children: React.ReactNode;
}) {
  return (
    <ErrorBoundary
      key={screenName}
      screenLabel={screenName}
    >
      {children}
    </ErrorBoundary>
  );
}
