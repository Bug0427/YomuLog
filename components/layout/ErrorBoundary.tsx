import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../../styles/tokens';

// Token-aligned colors (class component can't use useTheme hook)
const C = {
  bg: colors.lavender,
  card: colors.sand,
  border: colors.plum,
  text: colors.cocoa,
  error: colors.error,
  white: colors.white,
};

type Props = { children: ReactNode; screenLabel?: string };
type State = { hasError: boolean; error: Error | null };

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const label = this.props.screenLabel ? ` [${this.props.screenLabel}]` : '';
    console.error(`[ErrorBoundary${label}] Uncaught error:`, error.message);
    console.error(`[ErrorBoundary${label}] Component stack:`, info.componentStack ?? 'N/A');
  }

  handleRetry = () => this.setState({ hasError: false, error: null });

  render() {
    if (this.state.hasError) {
      return (
        <View style={s.container}>
          <View style={s.card}>
            <Feather name="alert-triangle" size={48} color={C.error} />
            <Text style={s.title}>Something went wrong</Text>
            {this.props.screenLabel ? (
              <Text style={s.screenLabel}>Screen: {this.props.screenLabel}</Text>
            ) : null}
            <Text style={s.message}>
              An unexpected error occurred. Please try again.{'\n\n'}
              {this.state.error?.message ?? ''}
            </Text>
            <Pressable style={s.button} onPress={this.handleRetry} accessibilityRole="button" accessibilityLabel="Try again" accessibilityHint="Reloads the screen after an error">
              <Feather name="refresh-cw" size={16} color={C.white} />
              <Text style={s.buttonText}>Try Again</Text>
            </Pressable>
          </View>
        </View>
      );
    }
    return this.props.children;
  }
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', padding: 32 },
  card: { backgroundColor: C.card, borderRadius: 16, padding: 32, alignItems: 'center', borderWidth: 2, borderColor: C.border, maxWidth: 360, width: '100%' },
  title: { fontSize: 20, fontWeight: '700', color: C.border, marginTop: 16, textAlign: 'center' },
  screenLabel: { fontSize: 13, color: C.text, textAlign: 'center', marginTop: 4, opacity: 0.7 },
  message: { fontSize: 14, color: C.text, textAlign: 'center', marginTop: 12, lineHeight: 20 },
  button: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 24, backgroundColor: C.border, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 },
  buttonText: { fontSize: 15, fontWeight: '700', color: C.white },
});
