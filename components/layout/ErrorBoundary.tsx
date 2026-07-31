import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

// Token-aligned colors (class component can't use useTheme hook)
const C = {
  bg: '#AFA6DD',
  card: '#E3D3BD',
  border: '#463B54',
  text: '#543C27',
  error: '#ff6b6b',
  white: '#ffffff',
};

type Props = { children: ReactNode };
type State = { hasError: boolean; error: Error | null };

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error.message);
    console.error('[ErrorBoundary] Component stack:', info.componentStack ?? 'N/A');
  }

  handleRetry = () => this.setState({ hasError: false, error: null });

  render() {
    if (this.state.hasError) {
      return (
        <View style={s.container}>
          <View style={s.card}>
            <Feather name="alert-triangle" size={48} color={C.error} />
            <Text style={s.title}>Something went wrong</Text>
            <Text style={s.message}>
              An unexpected error occurred. Please try again.{'\n\n'}
              {this.state.error?.message ?? ''}
            </Text>
            <Pressable style={s.button} onPress={this.handleRetry}>
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
  message: { fontSize: 14, color: C.text, textAlign: 'center', marginTop: 12, lineHeight: 20 },
  button: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 24, backgroundColor: C.border, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 },
  buttonText: { fontSize: 15, fontWeight: '700', color: C.white },
});
