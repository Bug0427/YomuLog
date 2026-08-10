import React, { useEffect, useCallback } from 'react';
import { View, StyleSheet, useWindowDimensions, Platform, StatusBar } from 'react-native';
import AppNavigator from './navigation/AppNavigator';
import { initDb } from './services/feedbackRepo';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { PremiumProvider } from './context/PremiumContext';
import { AuthProvider } from './context/AuthContext';
import { useSyncEngine } from './hooks/useSyncEngine';
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
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <StatusBarTheme />
        <AuthProvider>
          <PremiumProvider>
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
