import React, { useState, type ErrorInfo, type ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { spacing } from '../../styles/tokens';

type Props = { children: ReactNode; screenLabel?: string };

export default function ErrorBoundary({ children, screenLabel }: Props) {
  const { colors: theme } = useTheme();
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const handleError = (err: Error, info: ErrorInfo) => {
    setHasError(true);
    setError(err);
    const label = screenLabel ? ` [${screenLabel}]` : '';
    console.error(`[ErrorBoundary${label}] Uncaught error:`, err.message);
    console.error(`[ErrorBoundary${label}] Component stack:`, info.componentStack ?? 'N/A');
  };

  const handleRetry = () => {
    setHasError(false);
    setError(null);
  };

  if (hasError) {
    return (
      <View style={[s.container, { backgroundColor: theme.bg }]}>
        <View style={[s.card, { backgroundColor: theme.bgCard, borderColor: theme.error }]}>
          <Feather name="alert-triangle" size={48} color={theme.error} />
          <Text style={[s.title, { color: theme.textPrimary }]}>Something went wrong</Text>
          {screenLabel ? (
            <Text style={[s.screenLabel, { color: theme.textMuted }]}>Screen: {screenLabel}</Text>
          ) : null}
          <Text style={[s.message, { color: theme.textMuted }]}>
            An unexpected error occurred. Please try again.{'\n\n'}
            {error?.message ?? ''}
          </Text>
          <Pressable
            style={[s.button, { backgroundColor: theme.accent }]}
            onPress={handleRetry}
            accessibilityRole="button"
            accessibilityLabel="Try again"
            accessibilityHint="Reloads the screen after an error"
          >
            <Feather name="refresh-cw" size={16} color={theme.textInverse} />
            <Text style={[s.buttonText, { color: theme.textInverse }]}>Try Again</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <ErrorCatcher onError={handleError}>
      {children}
    </ErrorCatcher>
  );
}

// ── ErrorCatcher ──────────────────────────────────────────────────────
// Class-based boundary used internally; delegates to the parent hook state

type CatcherProps = { children: ReactNode; onError: (err: Error, info: ErrorInfo) => void };

class ErrorCatcher extends React.Component<CatcherProps> {
  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError(error, info);
  }

  render() {
    return this.props.children;
  }
}

// ── Styles ────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  card: { borderRadius: 16, padding: 32, alignItems: 'center', borderWidth: 2, maxWidth: 360, width: '100%' },
  title: { fontSize: 20, fontWeight: '700', marginTop: spacing.p16, textAlign: 'center' },
  screenLabel: { fontSize: 13, textAlign: 'center', marginTop: 4, opacity: 0.7 },
  message: { fontSize: 14, textAlign: 'center', marginTop: spacing.p12, lineHeight: 20 },
  button: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: spacing.p24, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 },
  buttonText: { fontSize: 15, fontWeight: '700' },
});
