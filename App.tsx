import React, { useEffect, useCallback } from 'react';
import { View, StyleSheet, useWindowDimensions, Platform, StatusBar } from 'react-native';
import AppNavigator from './navigation/AppNavigator';
import { initDb } from './services/feedbackRepo';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { PremiumProvider } from './context/PremiumContext';
import { AuthProvider } from './context/AuthContext';
import { useSyncEngine } from './hooks/useSyncEngine';
import { useRetentionHeartbeat } from './hooks/useRetentionHeartbeat';
import SyncStatusBanner from './components/layout/SyncStatusBanner';

/** Maximum width for desktop browsers to prevent stretching on ultrawide screens */
const WEB_MAX_WIDTH = 1200;

function StatusBarTheme() {
  const { mode, colors } = useTheme();
  if (Platform.OS === 'web') return null;
  const barStyle = mode === 'dark' ? 'light-content' : 'dark-content';
  return <StatusBar barStyle={barStyle} backgroundColor={colors.bg} translucent={false} />;
}

function ResponsiveContainer({ children }: { children: React.ReactNode }) {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  
  if (!isWeb) return <>{children}</>;

  // On web: center content with max-width if screen is wider than max
  const constrained = width > WEB_MAX_WIDTH;

  return (
    <View style={styles.webRoot}>
      <View style={[styles.webInner, constrained && styles.webConstrained]}>
        {children}
      </View>
    </View>
  );
}

/** Mounts the G-3 retention heartbeat (install id + last-active, local + cloud). */
function RetentionHeartbeat() {
  useRetentionHeartbeat();
  return null;
}

/**
 * A-5 a11y: global keyboard focus-visible indicator for web.
 * Injects a runtime CSS rule at the app root — there is no CSS pipeline in
 * this repo, so a <style> element is appended to <head> on web only.
 * Uses `currentColor` so the outline inherits the focused element's own text
 * color, which the theme token system already keeps ≥4.5:1 against its
 * backdrop → outline ≥3:1 on both themes with zero theme wiring. Mouse clicks
 * stay ring-free (focus-visible only).
 */
function WebFocusRing() {
  if (Platform.OS !== 'web') return null;
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const style = document.createElement('style');
    style.textContent = [
      '*:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; border-radius: 4px; }',
      '*:focus:not(:focus-visible) { outline: none; }',
    ].join('\n');
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  return null;
}

function SyncWrapper({ children }: { children: React.ReactNode }) {
  const {
    status,
    lastSyncedAt,
    lastError,
    syncEnabled,
    isOnline,
    manualSync,
  } = useSyncEngine();

  const [bannerDismissed, setBannerDismissed] = React.useState(false);

  const handleDismiss = useCallback(() => {
    setBannerDismissed(true);
    // Reset after a cooldown so future syncs can show the banner again
    setTimeout(() => setBannerDismissed(false), 15000);
  }, []);

  return (
    <View style={{ flex: 1, position: 'relative' }}>
      {!bannerDismissed && (
        <SyncStatusBanner
          status={status}
          lastSyncedAt={lastSyncedAt}
          lastError={lastError}
          syncEnabled={syncEnabled}
          isOnline={isOnline}
          onSyncNow={manualSync}
          onDismiss={handleDismiss}
        />
      )}
      {children}
    </View>
  );
}

export default function App() {
  useEffect(() => {
    initDb().catch((e) => console.error('DB init failed', e));
  }, []);

  // P-1: register the web service worker (bundle caching). The hosting edge
  // forces no-store on every resource, so the SW is the only cache layer.
  // Web-only, production-only (avoids dev-server/Metro SW interference);
  // registration is best-effort — never blocks app startup.
  useEffect(() => {
    if (!__DEV__ && Platform.OS === 'web' && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((e) => console.warn('[SW] registration failed', e));
    }
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <StatusBarTheme />
        <AuthProvider>
          <PremiumProvider>
            <RetentionHeartbeat />
            <WebFocusRing />
            <SyncWrapper>
              <ResponsiveContainer>
                <AppNavigator />
              </ResponsiveContainer>
            </SyncWrapper>
          </PremiumProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  webRoot: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  webInner: {
    flex: 1,
    width: '100%',
  },
  webConstrained: {
    maxWidth: WEB_MAX_WIDTH,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#2a2a4a',
  },
});
