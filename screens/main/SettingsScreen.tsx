import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, Pressable, Text, Alert, ActivityIndicator } from 'react-native';
import { Feather } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import Header from '../../components/layout/Header';
import { useScrollTracker } from '../../hooks/useScrollTracker';
import Anchor from '../../components/layout/Anchor';
import { resetDatabase } from '../../services/devResetDB';
import { logout } from '../../data/SettingsButtonActions/Logout';
import ChangeLoginModal from '../../components/admin/ChangeLoginModal';
import PremiumUpgradeModal from '../../components/layout/PremiumUpgradeModal';
import { GeneralStyles, SettingButtonStyles } from '../../styles/global';
import { SecurityLevel, verifyUser } from '../../services/feedbackRepo';
import {
  getSyncState,
  setSyncEnabled,
  performFullSync,
  formatSyncTimestamp,
  type SyncState,
} from '../../services/supabaseSyncService';
import { colors } from '../../styles/tokens';

type VerifyRow = { SECURITYLVL: SecurityLevel } | null;
const isAdminLevel = (lvl: any) => lvl === SecurityLevel?.Admin || lvl === 1 || lvl === '1' || lvl === 'Admin';
const isFeedbackAllowed = (lvl: any) => lvl === 2 || lvl === 3 || lvl === '2' || lvl === '3' || lvl === (SecurityLevel as any)?.Level2 || lvl === (SecurityLevel as any)?.Level3;

export const buttonActions = {
    refreshMetadata: () => {console.log('🔄 Refresh metadata');},
    clearCache: () => {console.log('🗑️ Clear cache');},
    resetAIRecommendations: () => {console.log('🔄 Reset AI recommendations');},
    enableAISearch: () => { console.log('🤖 Enable AI search');},
    logOut: (navigation?: any) => { logout(navigation); },
    openFeedback: (navigation?: any) => { console.log('💬 Open feedback'); navigation?.navigate('FeedBackHome'); },
    openDownloads: (navigation?: any) => { console.log('⬇️ Open downloads'); navigation?.navigate('DownLoadsScreen'); },
    openAccountSettings: () => {console.log('🔒 Open account settings');},
    openReadingStats: (navigation?: any) => { console.log('📊 Open reading stats'); navigation?.navigate('ReadingStatsScreen'); },
};

const GridItem = ({ label, children, onPress }: { label: string; children?: React.ReactNode; onPress?: () => void }) => {
  return (
    <View style={SettingButtonStyles.cell}>
      <Pressable style={SettingButtonStyles.button} onPress={onPress} hitSlop={10}>
        {children}
      </Pressable>
      <Text style={SettingButtonStyles.cellLabel}>{label}</Text>
    </View>
  );
};

/** Larger grid item for the sync section — spans full width */
const SyncGridItem = ({
  label,
  subtitle,
  children,
  onPress,
}: {
  label: string;
  subtitle?: string;
  children?: React.ReactNode;
  onPress?: () => void;
}) => {
  return (
    <View style={{
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 12,
      marginBottom: 8,
      backgroundColor: colors.creamWhite,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: colors.plum,
    }}>
      <Pressable
        style={{
          width: 56,
          height: 56,
          borderRadius: 12,
          backgroundColor: colors.sand,
          borderWidth: 3,
          borderColor: colors.plum,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 14,
        }}
        onPress={onPress}
        hitSlop={10}
      >
        {children}
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.plum }}>{label}</Text>
        {subtitle ? (
          <Text style={{ fontSize: 12, color: colors.mutedPlum, marginTop: 2 }}>{subtitle}</Text>
        ) : null}
      </View>
    </View>
  );
};

export default function SettingsScreen() {
  const [themeOn, setThemeOn] = useState(false);
  const [directionMode, setDirectionMode] = useState<'ltr' | 'rtl' | 'vertical'>('ltr');
  const [language, setLanguage] = useState<'en' | 'ja' | 'ko'>('en');
  const [alertsOn, setAlertsOn] = useState(true);
  const { scrollRef, isScrolling, handleScrollStart, handleScrollEnd } = useScrollTracker();
  const navigation = useNavigation();
  const [accountId, setAccountId] = useState<string | null>(null);
  const [securityLevel, setSecurityLevel] = useState<SecurityLevel | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showChangeLogin, setShowChangeLogin] = useState(false);

  // ─── Sync state ──────────────────────────────────────────────────
  const [syncState, setSyncState] = useState<SyncState>({
    status: 'pending',
    lastSyncedAt: null,
    lastError: null,
    syncEnabled: false,
    scopeTimestamps: {},
  });
  const [syncLoading, setSyncLoading] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  // Simulated premium check — in production this would come from a
  // subscription verification endpoint (Stripe / RevenueCat).
  const [isPremium, setIsPremium] = useState(false);

  // Load sync state on mount
  useEffect(() => {
    let isMounted = true;
    (async () => {
      const ss = await getSyncState();
      if (isMounted) setSyncState(ss);
    })();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const savedUsername = (globalThis as any).currentUsername;
      const savedPassword = (globalThis as any).currentPassword;
      const savedAccountId = (globalThis as any).currentAccountId;
      if (!savedUsername || !savedPassword) {
        if (isMounted) { setSecurityLevel(null); setLoading(false); setAccountId(null); }
        return;
      }
      try {
        const row = (await verifyUser(savedUsername, savedPassword)) as VerifyRow;
        if (isMounted) { setSecurityLevel(row ? (row.SECURITYLVL as SecurityLevel) : null); setAccountId(savedAccountId ?? null); }
      } catch (e) { if (isMounted) { setSecurityLevel(null); setAccountId(null); } }
      finally { if (isMounted) setLoading(false); }
    })();
    return () => { isMounted = false; };
  }, []);

  useFocusEffect(useCallback(() => {
    setSecurityLevel((globalThis as any).currentSecurityLevel ?? null);
    setAccountId((globalThis as any).currentAccountId ?? null);
    // Refresh sync state when screen gains focus
    (async () => {
      const ss = await getSyncState();
      setSyncState(ss);
    })();
  }, []));

  const handleRefreshMetadata = () => {
    Alert.alert("Refresh Metadata", "This will reset the database.", [
      { text: "Cancel", style: "cancel" },
      { text: "OK", style: "destructive", onPress: async () => { try { await resetDatabase(); } catch (e) { console.warn('Reset DB failed', e); } } },
    ]);
  };

  const goFeedback = () => {
    const level = (globalThis as any).currentSecurityLevel;
    if (!accountId) { navigation.navigate('LoginScreen' as never); return; }
    if (isFeedbackAllowed(level)) { navigation.navigate('FeedBackHome' as never); return; }
  };

  const goChangeLogin = async () => {
    const savedUsername = (globalThis as any).currentUsername;
    const savedPassword = (globalThis as any).currentPassword;
    try {
      let level = securityLevel;
      if (!level && savedUsername && savedPassword) {
        setLoading(true);
        const row = (await verifyUser(savedUsername, savedPassword)) as VerifyRow;
        level = row ? (row.SECURITYLVL as SecurityLevel) : null;
        setSecurityLevel(level);
      }
      if (!level) { navigation.navigate('LoginScreen' as never); return; }
      setShowChangeLogin(true);
    } catch { navigation.navigate('LoginScreen' as never); }
    finally { setLoading(false); }
  };

  const goAdmin = () => { navigation.navigate('AdminScreen' as never); };
  const isAdmin = isAdminLevel(securityLevel);

  // ─── Sync handlers ───────────────────────────────────────────────

  const handleSyncToggle = async () => {
    // Check premium tier
    if (!isPremium && !syncState.syncEnabled) {
      setShowPremiumModal(true);
      return;
    }

    setSyncLoading(true);
    try {
      const newState = await setSyncEnabled(!syncState.syncEnabled);
      setSyncState(newState);

      if (newState.status === 'synced') {
        Alert.alert(
          'Sync Complete',
          `Your data has been backed up.\nLast synced: ${formatSyncTimestamp(newState.lastSyncedAt)}`,
          [{ text: 'OK' }],
        );
      } else if (newState.status === 'error') {
        Alert.alert(
          'Sync Error',
          newState.lastError ?? 'An unknown error occurred during sync.',
          [{ text: 'OK' }],
        );
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Sync failed';
      Alert.alert('Sync Error', msg);
    } finally {
      setSyncLoading(false);
    }
  };

  const handleManualSync = async () => {
    if (!syncState.syncEnabled) return;

    setSyncLoading(true);
    try {
      const newState = await performFullSync();
      setSyncState(newState);

      if (newState.status === 'synced') {
        Alert.alert(
          'Sync Complete',
          `All data synced successfully.\nLast synced: ${formatSyncTimestamp(newState.lastSyncedAt)}`,
          [{ text: 'OK' }],
        );
      } else if (newState.status === 'error') {
        Alert.alert(
          'Sync Error',
          newState.lastError ?? 'An unknown error occurred.',
          [{ text: 'OK' }],
        );
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Sync failed';
      Alert.alert('Sync Error', msg);
    } finally {
      setSyncLoading(false);
    }
  };

  // ─── Sync subtitle ───────────────────────────────────────────────

  const syncSubtitle = (() => {
    if (syncLoading) return 'Syncing...';
    if (syncState.status === 'syncing') return 'Sync in progress...';
    if (syncState.status === 'error') return `Error: ${syncState.lastError ?? 'Unknown'}`;
    if (syncState.status === 'synced') return `Last synced: ${formatSyncTimestamp(syncState.lastSyncedAt)}`;
    if (syncState.syncEnabled) return 'Sync enabled — pending sync';
    return isPremium ? 'Tap to enable cloud backup' : 'Premium feature — tap to upgrade';
  })();

  // ─── Sync icon ──────────────────────────────────────────────────

  const syncIcon = () => {
    if (syncLoading || syncState.status === 'syncing') {
      return <ActivityIndicator size="small" color={colors.plum} />;
    }
    if (syncState.status === 'error') {
      return <Feather name="cloud-off" size={26} color={colors.error} />;
    }
    if (syncState.syncEnabled && syncState.status === 'synced') {
      return <Feather name="cloud" size={26} color={colors.success} />;
    }
    return <Feather name="cloud" size={26} color={colors.plum} />;
  };

  return (
    <View style={GeneralStyles.section}>
      <ScrollView ref={scrollRef} onScrollBeginDrag={handleScrollStart} onScrollEndDrag={handleScrollEnd} onMomentumScrollEnd={handleScrollEnd}>
        <View style={[GeneralStyles.container, { paddingHorizontal: 12 }]}>
          <Header />

          {/* ─── Cloud Sync & Backup Section ─────────────────────── */}
          <View style={{ marginBottom: 16, marginTop: 4 }}>
            <Text style={{
              fontSize: 18,
              fontWeight: '800',
              color: colors.deepPlum,
              marginBottom: 10,
              paddingLeft: 4,
            }}>
              Cloud Sync & Backup
            </Text>

            <SyncGridItem
              label={syncState.syncEnabled ? 'Sync Enabled' : 'Sync Disabled'}
              subtitle={syncSubtitle}
              onPress={handleSyncToggle}
            >
              {syncIcon()}
            </SyncGridItem>

            {/* Manual sync button — only visible when sync is enabled */}
            {syncState.syncEnabled && syncState.status !== 'syncing' && !syncLoading && (
              <Pressable
                onPress={handleManualSync}
                style={{
                  alignSelf: 'flex-end',
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  backgroundColor: colors.lavender,
                  borderRadius: 8,
                  gap: 6,
                  marginBottom: 8,
                }}
              >
                <Feather name="refresh-cw" size={14} color={colors.deepPlum} />
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.deepPlum }}>
                  Sync Now
                </Text>
              </Pressable>
            )}

            {/* Sync status details — visible when synced */}
            {syncState.syncEnabled && syncState.status === 'synced' && syncState.scopeTimestamps && (
              <View style={{
                paddingHorizontal: 8,
                paddingVertical: 4,
                marginTop: 2,
              }}>
                {(['favorites', 'progress', 'downloads'] as const).map((scope) => {
                  const ts = syncState.scopeTimestamps[scope];
                  const scopeLabel = scope === 'favorites' ? 'Library' : scope === 'progress' ? 'Reading Progress' : 'Downloads';
                  return (
                    <View key={scope} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 3 }}>
                      <Feather
                        name={ts ? 'check-circle' : 'circle'}
                        size={12}
                        color={ts ? colors.success : colors.mutedPlum}
                        style={{ marginRight: 6 }}
                      />
                      <Text style={{ fontSize: 11, color: colors.mutedPlum, flex: 1 }}>
                        {scopeLabel}
                      </Text>
                      {ts ? (
                        <Text style={{ fontSize: 11, color: colors.mutedPlum }}>
                          {formatSyncTimestamp(ts)}
                        </Text>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* ─── Divider ─────────────────────────────────────────── */}
          <View style={{
            height: 2,
            backgroundColor: colors.plum,
            opacity: 0.25,
            marginBottom: 16,
            marginHorizontal: 4,
          }} />

          {/* ─── Original Settings Grid ──────────────────────────── */}
          <View style={SettingButtonStyles.grid}>
            <GridItem label="Theme" onPress={() => setThemeOn(prev => !prev)}>
              <Feather name={themeOn ? "moon" : "sun"} style={SettingButtonStyles.icon} />
            </GridItem>
            <GridItem label="Direction" onPress={() => setDirectionMode(prev => prev === 'ltr' ? 'rtl' : prev === 'rtl' ? 'vertical' : 'ltr')}>
              {directionMode === 'ltr' && <Feather name="chevrons-right" style={[SettingButtonStyles.icon, { fontSize: 35 }]} />}
              {directionMode === 'rtl' && <Feather name="chevrons-left" style={[SettingButtonStyles.icon, { fontSize: 35 }]} />}
              {directionMode === 'vertical' && (
                <View style={{ alignItems: 'center' }}>
                  <Feather name="chevrons-up" style={SettingButtonStyles.icon} />
                  <Feather name="chevrons-down" style={SettingButtonStyles.icon} />
                </View>
              )}
            </GridItem>
            <GridItem label="Language" onPress={() => setLanguage(prev => prev === 'en' ? 'ja' : prev === 'ja' ? 'ko' : 'en')}>
              <Text style={SettingButtonStyles.flag}>{language === 'en' ? '🇺🇸' : language === 'ja' ? '🇯🇵' : '🇰🇷'}</Text>
            </GridItem>
            <GridItem label="Chapter alerts" onPress={() => setAlertsOn(prev => !prev)}>
              <Feather name={alertsOn ? "bell" : "bell-off"} style={SettingButtonStyles.icon} />
            </GridItem>
            <GridItem label="Reading Stats" onPress={() => buttonActions.openReadingStats(navigation)}>
              <Feather name="bar-chart-2" style={SettingButtonStyles.icon} />
            </GridItem>
            <GridItem label="Refresh metadata" onPress={handleRefreshMetadata}>
              <Feather name="refresh-ccw" style={SettingButtonStyles.icon} />
            </GridItem>
            <GridItem label="Clear cache" onPress={buttonActions.clearCache}>
              <Feather name="trash-2" style={SettingButtonStyles.icon} />
            </GridItem>
            <GridItem label="Reset AI recs" onPress={buttonActions.resetAIRecommendations}>
              <Feather name="rotate-ccw" style={SettingButtonStyles.icon} />
            </GridItem>
            <GridItem label="Enable AI search" onPress={buttonActions.enableAISearch}>
              <Feather name="cpu" style={SettingButtonStyles.icon} />
            </GridItem>
            <GridItem label="Manage downloads" onPress={() => buttonActions.openDownloads(navigation)}>
              <Feather name="download" style={SettingButtonStyles.icon} />
            </GridItem>
            {isAdmin ? (
              <GridItem label="Admin" onPress={goAdmin}>
                <Feather name="shield" style={SettingButtonStyles.icon} />
              </GridItem>
            ) : (
              <GridItem label="Feedback" onPress={goFeedback}>
                <Feather name="message-square" style={SettingButtonStyles.icon} />
              </GridItem>
            )}
            <GridItem label="Change password/username" onPress={goChangeLogin}>
              <Feather name="lock" style={SettingButtonStyles.icon} />
            </GridItem>
            <GridItem label="Log out" onPress={() => buttonActions.logOut(navigation)}>
              <Feather name="log-out" style={SettingButtonStyles.icon} />
            </GridItem>
          </View>
        </View>
      </ScrollView>

      <ChangeLoginModal visible={showChangeLogin} onClose={() => setShowChangeLogin(false)} accountId={accountId ?? undefined} navigation={navigation} />

      {/* Premium Upgrade Modal */}
      <PremiumUpgradeModal
        visible={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        onUpgrade={() => {
          // Simulate upgrading — in production this would trigger Stripe checkout
          setIsPremium(true);
          // Auto-enable sync after upgrade
          (async () => {
            setSyncLoading(true);
            const newState = await setSyncEnabled(true);
            setSyncState(newState);
            setSyncLoading(false);
            if (newState.status === 'synced') {
              Alert.alert(
                'Welcome to Premium!',
                `Cloud Sync is now enabled.\nLast synced: ${formatSyncTimestamp(newState.lastSyncedAt)}`,
                [{ text: 'OK' }],
              );
            }
          })();
        }}
      />

      <Anchor scrollRef={scrollRef} isScrolling={isScrolling} />
    </View>
  );
}
