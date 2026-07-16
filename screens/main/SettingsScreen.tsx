import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, Pressable, Text, Alert } from 'react-native';
import { Feather } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import Header from '../../components/layout/Header';
import { useScrollTracker } from '../../hooks/useScrollTracker';
import Anchor from '../../components/layout/Anchor';
import { resetDatabase } from '../../services/devResetDB';
import { logout } from '../../data/SettingsButtonActions/Logout';
import ChangeLoginModal from '../../components/admin/ChangeLoginModal';
import { GeneralStyles, SettingButtonStyles } from '../../styles/global';
import { SecurityLevel, verifyUser } from '../../services/feedbackRepo';

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

  return (
    <View style={GeneralStyles.section}>
      <ScrollView ref={scrollRef} onScrollBeginDrag={handleScrollStart} onScrollEndDrag={handleScrollEnd} onMomentumScrollEnd={handleScrollEnd}>
        <View style={[GeneralStyles.container, { paddingHorizontal: 12 }]}>
          <Header />
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
      <Anchor scrollRef={scrollRef} isScrolling={isScrolling} />
    </View>
  );
}