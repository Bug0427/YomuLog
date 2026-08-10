import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, Pressable, Text, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import { colors, spacing } from '../../styles/tokens';
import { useTheme, type ThemeMode } from '../../context/ThemeContext';
import { usePremium } from '../../context/PremiumContext';
import {
  loadAllPreferences,
  setAlertsOn as saveAlertsOn,
  setAISearchOn as saveAISearchOn,
  setDirectionMode as saveDirectionMode,
  type DirectionMode,
} from '../../services/preferencesService';

type VerifyRow = { SECURITYLVL: SecurityLevel } | null;
const isAdminLevel = (lvl: any) => lvl === SecurityLevel?.Admin || lvl === 1 || lvl === '1' || lvl === 'Admin';
const isFeedbackAllowed = (lvl: any) => lvl === 2 || lvl === 3 || lvl === '2' || lvl === '3' || lvl === (SecurityLevel as any)?.Level2 || lvl === (SecurityLevel as any)?.Level3;

/** Direction cycle order */
const DIRECTIONS: DirectionMode[] = ['ltr', 'rtl', 'vertical'];

const GridItem = ({ label, children, onPress }: { label: string; children?: React.ReactNode; onPress?: () => void }) => {
  const { colors: theme } = useTheme();
  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 4,
      marginBottom: 4,
    }}>
      <Pressable
        style={{
          width: 56,
          height: 56,
          borderRadius: 12,
          backgroundColor: theme.bgCard,
          borderWidth: 2,
          borderColor: theme.border,
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onPress={onPress}
        hitSlop={10}
      >
        {children}
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: theme.textPrimary }}>{label}</Text>
      </View>
      <Feather name="chevron-right" size={18} color={theme.textMuted} />
    </View>
  );
};

/** Larger grid item for the sync section — spans full width, theme-aware */
const SyncGridItem = ({
  label,
  subtitle,
  children,
  onPress,
  bg,
  borderColor,
  iconBg,
  textColor,
  subColor,
}: {
  label: string;
  subtitle?: string;
  children?: React.ReactNode;
  onPress?: () => void;
  bg: string;
  borderColor: string;
  iconBg: string;
  textColor: string;
  subColor: string;
}) => {
  return (
    <View style={{
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.p12,
      paddingHorizontal: spacing.p12,
      marginBottom: 8,
      backgroundColor: bg,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: borderColor,
    }}>
      <Pressable
        style={{
          width: 56,
          height: 56,
          borderRadius: 12,
          backgroundColor: iconBg,
          borderWidth: 3,
          borderColor: borderColor,
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
        <Text style={{ fontSize: 15, fontWeight: '700', color: textColor }}>{label}</Text>
        {subtitle ? (
          <Text style={{ fontSize: 12, color: subColor, marginTop: 2 }}>{subtitle}</Text>
        ) : null}
      </View>
    </View>
  );
};

export default function SettingsScreen() {
  const { mode: themeMode, cycleTheme, colors: theme } = useTheme();
  const [directionMode, setDirectionMode] = useState<DirectionMode>('ltr');
  const [alertsOn, setAlertsOn] = useState(true);
  const [aiSearchOn, setAISearchOn] = useState(false);
  const { scrollRef, isScrolling, handleScrollStart, handleScrollEnd } = useScrollTracker();
  const navigation = useNavigation();
  const [accountId, setAccountId] = useState<string | null>(null);
  const [securityLevel, setSecurityLevel] = useState<SecurityLevel | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showChangeLogin, setShowChangeLogin] = useState(false);
  const [prefsLoaded, setPrefsLoaded] = useState(false);

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
  const { isPremium, activatePremium } = usePremium();

  // Load persisted preferences on mount
  useEffect(() => {
    let isMounted = true;
    (async () => {
      const prefs = await loadAllPreferences();
      if (!isMounted) return;
      setAlertsOn(prefs.alertsOn);
      setAISearchOn(prefs.aiSearchOn);
      setDirectionMode(prefs.directionMode);
      setPrefsLoaded(true);
    })();
    return () => { isMounted = false; };
  }, []);

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
    (async () => {
      const ss = await getSyncState();
      setSyncState(ss);
    })();
  }, []));

  // ─── Preference handlers (with persistence) ─────────────────────

  const toggleAlerts = useCallback(async () => {
    const next = !alertsOn;
    setAlertsOn(next);
    await saveAlertsOn(next);
  }, [alertsOn]);

  const toggleAISearch = useCallback(async () => {
    const next = !aiSearchOn;
    setAISearchOn(next);
    await saveAISearchOn(next);
  }, [aiSearchOn]);

  const cycleDirection = useCallback(async () => {
    const idx = DIRECTIONS.indexOf(directionMode);
    const next = DIRECTIONS[(idx + 1) % DIRECTIONS.length];
    setDirectionMode(next);
    await saveDirectionMode(next);
  }, [directionMode]);

  // ─── Action handlers with confirmation ──────────────────────────

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will remove all locally cached images and temporary files. Downloaded chapters will not be affected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Cache',
          style: 'destructive',
          onPress: () => console.log('🗑️ Cache cleared'),
        },
      ],
    );
  };

  const handleResetAI = () => {
    Alert.alert(
      'Reset AI Recommendations',
      'This will erase your AI recommendation history and reset your taste profile. You will need to re-train recommendations from scratch.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => console.log('🔄 AI recommendations reset'),
        },
      ],
    );
  };

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
    if (!isPremium && !syncState.syncEnabled) {
      setShowPremiumModal(true);
      return;
    }

    setSyncLoading(true);
    try {
      const newState = await setSyncEnabled(!syncState.syncEnabled);
      setSyncState(newState);

      if (newState.status === 'synced') {
        Alert.alert('Sync Complete', `Your data has been backed up.\nLast synced: ${formatSyncTimestamp(newState.lastSyncedAt)}`, [{ text: 'OK' }]);
      } else if (newState.status === 'error') {
        Alert.alert('Sync Error', newState.lastError ?? 'An unknown error occurred during sync.', [{ text: 'OK' }]);
      }
    } catch (e) {
      Alert.alert('Sync Error', e instanceof Error ? e.message : 'Sync failed');
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
        Alert.alert('Sync Complete', `All data synced successfully.\nLast synced: ${formatSyncTimestamp(newState.lastSyncedAt)}`, [{ text: 'OK' }]);
      } else if (newState.status === 'error') {
        Alert.alert('Sync Error', newState.lastError ?? 'An unknown error occurred.', [{ text: 'OK' }]);
      }
    } catch (e) {
      Alert.alert('Sync Error', e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setSyncLoading(false);
    }
  };

  const syncSubtitle = (() => {
    if (syncLoading) return 'Syncing...';
    if (syncState.status === 'syncing') return 'Sync in progress...';
    if (syncState.status === 'error') {
      const err = syncState.lastError ?? 'Unknown';
      if (err.includes('No internet') || err.includes('offline')) return 'Offline — will sync when connected';
      return `Error: ${err}`;
    }
    if (syncState.status === 'synced') return `Last synced: ${formatSyncTimestamp(syncState.lastSyncedAt)}`;
    if (syncState.syncEnabled) return 'Sync enabled — pending sync';
    return isPremium ? 'Tap to enable cloud backup' : 'Premium feature — tap to upgrade';
  })();

  const syncIcon = () => {
    if (syncLoading || syncState.status === 'syncing') {
      return <ActivityIndicator size="small" color={theme.accent} />;
    }
    if (syncState.status === 'error') {
      return <Feather name="cloud-off" size={26} color={theme.error} />;
    }
    if (syncState.syncEnabled && syncState.status === 'synced') {
      return <Feather name="cloud" size={26} color={theme.success} />;
    }
    return <Feather name="cloud" size={26} color={theme.accent} />;
  };

  return (
    <View style={[GeneralStyles.container, { backgroundColor: theme.bg }]}>
      <ScrollView ref={scrollRef} onScrollBeginDrag={handleScrollStart} onScrollEndDrag={handleScrollEnd} onMomentumScrollEnd={handleScrollEnd}
        contentContainerStyle={{ paddingBottom: spacing.p24 }}>
        <View style={{ backgroundColor: theme.bg, paddingTop: spacing.p12 }}>
          <Header />

          {/* ─── Cloud Sync & Backup Section ─────────────────────── */}
          <View style={{ marginBottom: 16, marginTop: 4 }}>
            <Text style={{
              fontSize: 18,
              fontWeight: '800',
              color: theme.textPrimary,
              marginBottom: 10,
              paddingLeft: 4,
            }}>
              Cloud Sync & Backup
            </Text>

            <SyncGridItem
              label={syncState.syncEnabled ? 'Sync Enabled' : 'Sync Disabled'}
              subtitle={syncSubtitle}
              onPress={handleSyncToggle}
              bg={theme.bgCard}
              borderColor={theme.border}
              iconBg={theme.bgSecondary}
              textColor={theme.textSecondary}
              subColor={theme.textMuted}
            >
              {syncIcon()}
            </SyncGridItem>

            {syncState.syncEnabled && syncState.status !== 'syncing' && !syncLoading && (
              <Pressable
                onPress={handleManualSync}
                style={{
                  alignSelf: 'flex-end',
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: spacing.p8,
                  paddingHorizontal: spacing.p14,
                  backgroundColor: theme.accentLight,
                  borderRadius: 8,
                  gap: 6,
                  marginBottom: 8,
                }}
              >
                <Feather name="refresh-cw" size={14} color={theme.accentDark} />
                <Text style={{ fontSize: 13, fontWeight: '700', color: theme.accentDark }}>
                  Sync Now
                </Text>
              </Pressable>
            )}

            {/* AuthScreen navigation — hidden; not user-facing */}
            {/* <Pressable ...> removed per review — backend tech must not be exposed */}

            {syncState.syncEnabled && syncState.status === 'synced' && syncState.scopeTimestamps && (
              <View style={{ paddingHorizontal: spacing.p8, paddingVertical: spacing.p4, marginTop: spacing.p3 }}>
                {(['favorites', 'progress', 'downloads', 'preferences'] as const).map((scope) => {
                  const ts = syncState.scopeTimestamps[scope];
                  const scopeLabel = scope === 'favorites' ? 'Library' : scope === 'progress' ? 'Reading Progress' : scope === 'downloads' ? 'Downloads' : 'Preferences';
                  return (
                    <View key={scope} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 3 }}>
                      <Feather
                        name={ts ? 'check-circle' : 'circle'}
                        size={12}
                        color={ts ? theme.success : theme.textMuted}
                        style={{ marginRight: 6 }}
                      />
                      <Text style={{ fontSize: 11, color: theme.textMuted, flex: 1 }}>
                        {scopeLabel}
                      </Text>
                      {ts ? (
                        <Text style={{ fontSize: 11, color: theme.textMuted }}>
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
            backgroundColor: theme.border,
            opacity: 0.25,
            marginBottom: 16,
            marginHorizontal: 4,
          }} />

          {/* ─── Premium Status Section ───────────────────────────── */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{
              fontSize: 18,
              fontWeight: '800',
              color: theme.textPrimary,
              marginBottom: 10,
              paddingLeft: 4,
            }}>
              Premium
            </Text>

            <Pressable
              onPress={() => setShowPremiumModal(true)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: spacing.p14,
                backgroundColor: isPremium ? theme.success + '18' : theme.accentLight,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: isPremium ? theme.success : theme.accent,
                gap: spacing.p12,
              }}
            >
              <View style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: isPremium ? theme.success + '33' : theme.accent + '22',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Feather
                  name={isPremium ? 'award' : 'star'}
                  size={24}
                  color={isPremium ? theme.success : theme.accent}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: 15,
                  fontWeight: '700',
                  color: theme.textPrimary,
                }}>
                  {isPremium ? 'Premium Active' : 'Go Premium'}
                </Text>
                <Text style={{
                  fontSize: 12,
                  color: theme.textMuted,
                  marginTop: 2,
                }}>
                  {isPremium
                    ? 'Cloud sync, unlimited downloads, AI search & custom themes'
                    : '$2.99/mo — unlock all premium features'}
                </Text>
              </View>
              <Feather
                name="chevron-right"
                size={20}
                color={theme.textMuted}
              />
            </Pressable>

            {/* Dev toggle — hidden in production */}
            {isPremium && (
              <Pressable
                onPress={async () => {
                  const { deactivatePremium } = usePremium();
                  // Access via context; we'll add a dev handler
                  Alert.alert('Premium Active', 'Manage your subscription in Account Settings.', [{ text: 'OK' }]);
                }}
                style={{
                  marginTop: spacing.p8,
                  alignSelf: 'flex-end',
                  paddingHorizontal: spacing.p10,
                  paddingVertical: spacing.p4,
                }}
              >
                <Text style={{ fontSize: 11, color: theme.textMuted }}>
                  Subscribed
                </Text>
              </Pressable>
            )}
          </View>

          {/* ─── Divider before settings grid ─────────────────────── */}
          <View style={{
            height: 2,
            backgroundColor: theme.border,
            opacity: 0.25,
            marginBottom: 16,
            marginHorizontal: 4,
          }} />

          {/* ─── Settings List ────────────────────────────────────── */}
          <View style={{ flexDirection: 'column', padding: spacing.p10, backgroundColor: theme.bgSecondary }}>
            <GridItem label={`Theme: ${themeMode}`} onPress={cycleTheme}>
              {themeMode === 'light' && <Feather name="sun" style={[SettingButtonStyles.icon, { color: theme.accent }]} />}
              {themeMode === 'dark' && <Feather name="moon" style={[SettingButtonStyles.icon, { color: theme.accent }]} />}
              {themeMode === 'sepia' && <Feather name="coffee" style={[SettingButtonStyles.icon, { color: theme.accent }]} />}
            </GridItem>
            <GridItem label="Direction" onPress={cycleDirection}>
              {directionMode === 'ltr' && <Feather name="chevrons-right" style={[SettingButtonStyles.icon, { fontSize: 35, color: theme.accent }]} />}
              {directionMode === 'rtl' && <Feather name="chevrons-left" style={[SettingButtonStyles.icon, { fontSize: 35, color: theme.accent }]} />}
              {directionMode === 'vertical' && (
                <View style={{ alignItems: 'center' }}>
                  <Feather name="chevrons-up" style={[SettingButtonStyles.icon, { color: theme.accent }]} />
                  <Feather name="chevrons-down" style={[SettingButtonStyles.icon, { color: theme.accent }]} />
                </View>
              )}
            </GridItem>
            <GridItem label="Chapter alerts" onPress={toggleAlerts}>
              <Feather name={alertsOn ? "bell" : "bell-off"} style={[SettingButtonStyles.icon, { color: theme.accent }]} />
            </GridItem>
            <GridItem label="Reading Stats" onPress={() => navigation.navigate('ReadingStatsScreen' as never)}>
              <Feather name="bar-chart-2" style={[SettingButtonStyles.icon, { color: theme.accent }]} />
            </GridItem>
            <GridItem label="Refresh metadata" onPress={handleRefreshMetadata}>
              <Feather name="refresh-ccw" style={[SettingButtonStyles.icon, { color: theme.accent }]} />
            </GridItem>
            <GridItem label="Clear cache" onPress={handleClearCache}>
              <Feather name="trash-2" style={[SettingButtonStyles.icon, { color: theme.accent }]} />
            </GridItem>
            <GridItem label="Reset AI recs" onPress={handleResetAI}>
              <Feather name="rotate-ccw" style={[SettingButtonStyles.icon, { color: theme.accent }]} />
            </GridItem>
            <GridItem
              label="AI Search"
              onPress={() => {
                if (!isPremium) { setShowPremiumModal(true); return; }
                toggleAISearch();
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Feather name="cpu" style={[SettingButtonStyles.icon, { color: theme.accent, opacity: aiSearchOn && isPremium ? 1 : 0.4 }]} />
                {!isPremium && (
                  <Feather name="lock" size={10} color={theme.textMuted} style={{ marginLeft: -4, marginTop: -8 }} />
                )}
              </View>
            </GridItem>
            <GridItem label="Manage downloads" onPress={() => navigation.navigate('ManageDownloadsScreen' as never)}>
              <Feather name="download" style={[SettingButtonStyles.icon, { color: theme.accent }]} />
            </GridItem>
            {isAdmin ? (
              <GridItem label="Admin" onPress={goAdmin}>
                <Feather name="shield" style={[SettingButtonStyles.icon, { color: theme.accent }]} />
              </GridItem>
            ) : (
              <GridItem label="Feedback" onPress={goFeedback}>
                <Feather name="message-square" style={[SettingButtonStyles.icon, { color: theme.accent }]} />
              </GridItem>
            )}
            <GridItem label="Change password/username" onPress={goChangeLogin}>
              <Feather name="lock" style={[SettingButtonStyles.icon, { color: theme.accent }]} />
            </GridItem>
            {/* Log Out removed from Settings per BUG-12 — kept only in Account Profile */}
          </View>
        </View>
      </ScrollView>

      <ChangeLoginModal visible={showChangeLogin} onClose={() => setShowChangeLogin(false)} accountId={accountId ?? undefined} navigation={navigation} />

      <PremiumUpgradeModal
        visible={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        onUpgrade={async () => {
          await activatePremium();
          setSyncLoading(true);
          const newState = await setSyncEnabled(true);
          setSyncState(newState);
          setSyncLoading(false);
          if (newState.status === 'synced') {
            Alert.alert('Welcome to Premium!', `Cloud Sync is now enabled.\nLast synced: ${formatSyncTimestamp(newState.lastSyncedAt)}`, [{ text: 'OK' }]);
          }
        }}
      />

      <Anchor scrollRef={scrollRef} isScrolling={isScrolling} />
    </View>
  );
}
