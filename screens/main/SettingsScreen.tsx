// React & React Native
import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, Pressable, Text, Alert } from 'react-native';
import { Feather } from "@expo/vector-icons";
import { useNavigation, CommonActions, useFocusEffect } from "@react-navigation/native";

// Components
import Header from '../../components/layout/Header';
import { useScrollTracker } from '../../hooks/useScrollTracker';
import Anchor from '../../components/layout/Anchor';
import { resetDatabase } from '../../services/devResetDB';
import { logout } from '../../data/SettingsButtonActions/Logout';
import ChangeLoginModal from '../../components/admin/ChangeLoginModal';

// Data & Styles
import { GeneralStyles, SettingButtonStyles } from '../../styles/global';

// Screens
import { SecurityLevel, verifyUser } from '../../services/feedbackRepo';

// Local typing for verifyUser result shape
type VerifyRow = { SECURITYLVL: SecurityLevel } | null;

// Robust admin check to handle enum/number/string values from DB
const isAdminLevel = (lvl: any) => lvl === SecurityLevel?.Admin || lvl === 1 || lvl === '1' || lvl === 'Admin';

// Only allow feedback for levels 2 & 3 (robust across enum/number/string)
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
    // Toggle button states
    const [themeOn, setThemeOn] = useState(false); // false = light, true = dark
    const [directionMode, setDirectionMode] = useState<'ltr' | 'rtl' | 'vertical'>('ltr');
    const [language, setLanguage] = useState<'en' | 'ja' | 'ko'>('en');
    const [alertsOn, setAlertsOn] = useState(true);
    const { scrollRef, isScrolling, handleScrollStart, handleScrollEnd } = useScrollTracker();
    const navigation = useNavigation();
    const [accountId, setAccountId] = useState<string | null>(null);
    const handleRefreshMetadata = () => {
        Alert.alert(
            "Refresh Metadata",
            "Are you sure you want to refresh metadata? This will reset the database.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "OK",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await resetDatabase();
                            console.log('🔄 Database reset via Refresh metadata');
                        } catch (e) {
                            console.warn('Reset DB failed', e);
                        }
                    }
                }
            ]
        );
    };
    // ---------------------------------------------------------------------
    // Provisional login + verification logic (no Login screen yet)
    // If you later add a real Login, replace the savedUsername/password
    // with values from AsyncStorage or your auth store.
    const [securityLevel, setSecurityLevel] = useState<SecurityLevel | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [showChangeLogin, setShowChangeLogin] = useState(false);

    useEffect(() => {
        let isMounted = true;
        (async () => {

            const savedUsername: string | undefined = (globalThis as any).currentUsername;
            const savedPassword: string | undefined = (globalThis as any).currentPassword;
            const savedAccountId: string | undefined = (globalThis as any).currentAccountId;
            console.log('👤 Saved creds seen by Settings:', { savedUsername, hasPassword: !!savedPassword });

            if (!savedUsername || !savedPassword) {
                // Not logged in → no privileged controls
                if (isMounted) {
                    setSecurityLevel(null);
                    setLoading(false);
                    setAccountId(null);
                }
                return;
            }

            try {
                const row = (await verifyUser(savedUsername, savedPassword)) as VerifyRow;
                if (isMounted) {
                    setSecurityLevel(row ? (row.SECURITYLVL as SecurityLevel) : null);
                    setAccountId(savedAccountId ?? null);
                }
            } catch (e) {
                console.warn('verifyUser failed', e);
                if (isMounted) {
                    setSecurityLevel(null);
                    setAccountId(null);
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        })();
        return () => { isMounted = false; };
    }, []);

    useFocusEffect(
      useCallback(() => {
        // Re-read session on focus so UI updates after login
        const lvl = (globalThis as any).currentSecurityLevel ?? null;
        const accId = (globalThis as any).currentAccountId ?? null;
        setSecurityLevel(lvl as any);
        setAccountId(accId);
        return () => {};
      }, [])
    );

    // Helpers to route based on login state
    const goFeedback = () => {
      const level: any = (globalThis as any).currentSecurityLevel;

      if (!accountId) {
        // Not logged in → go to Login and come back here after
        // @ts-ignore
        navigation.navigate('LoginScreen', { redirectTo: { name: 'FeedBackHome' } });
        return;
      }

      if (isFeedbackAllowed(level)) {
        // Allowed levels 2 & 3
        // @ts-ignore
        navigation.navigate('FeedBackHome');
        return;
      }

      // Logged in but not allowed – block gently (no redirect loop)
      console.log('Feedback restricted to levels 2 & 3. Current level:', level);
    };

    const goChangeLogin = async () => {
        const savedUsername: string | undefined = (globalThis as any).currentUsername;
        const savedPassword: string | undefined = (globalThis as any).currentPassword;

        try {
            let level: SecurityLevel | null = securityLevel;

            // If we don't yet know the level but we have creds, verify now (handles race with useEffect)
            if (!level && savedUsername && savedPassword) {
                setLoading(true);
                const row = (await verifyUser(savedUsername, savedPassword)) as VerifyRow;
                level = row ? (row.SECURITYLVL as SecurityLevel) : null;
                setSecurityLevel(level);
            }

            if (!level) {
                console.log('🔐 Not logged in → navigate to LoginSignup');
                // @ts-ignore
                navigation.navigate?.('LoginScreen');
                return;
            }

            // Logged in → open the change login popup
            setShowChangeLogin(true);
        } catch (e) {
            console.warn('goChangeLogin verify-on-press failed', e);
            // @ts-ignore
            navigation.navigate?.('LoginScreen');
        } finally {
            setLoading(false);
        }
    };

    const goAdmin = () => {
        // Navigate to the Admin screen defined in screens/main/Admin.tsx
        // @ts-ignore
        navigation.navigate?.('AdminScreen');
    };


    useEffect(() => {
        console.log('🔎 SettingsScreen securityLevel:', securityLevel);
        console.log('🔎 SettingsScreen accountId:', accountId);
    }, [securityLevel, accountId]);

    const isAdmin = isAdminLevel(securityLevel);

    return (
        <View style={GeneralStyles.section}>
        <ScrollView
            ref={scrollRef}
            onScrollBeginDrag={handleScrollStart}
            onScrollEndDrag={handleScrollEnd}
            onMomentumScrollEnd={handleScrollEnd}
        >
            <View style={[GeneralStyles.container, { paddingHorizontal: 12 }]}>
            <Header />
            {loading ? null : null}
            <View style={SettingButtonStyles.grid}>
                <GridItem label="Theme" onPress={() => setThemeOn(prev => !prev)}>
                <Feather name={themeOn ? "moon" : "sun"} style={SettingButtonStyles.icon} />
                </GridItem>
                <GridItem
                label="Direction"
                onPress={() =>
                    setDirectionMode(prev => (prev === 'ltr' ? 'rtl' : prev === 'rtl' ? 'vertical' : 'ltr'))
                }
                >
                {directionMode === 'ltr' && (
                    <Feather name="chevrons-right" style={[SettingButtonStyles.icon, { fontSize: 35 }]} />
                )}
                {directionMode === 'rtl' && (
                    <Feather name="chevrons-left" style={[SettingButtonStyles.icon, { fontSize: 35 }]} />
                )}
                {directionMode === 'vertical' && (
                    <View style={{ alignItems: 'center' }}>
                    <Feather name="chevrons-up" style={SettingButtonStyles.icon} />
                    <Feather name="chevrons-down" style={SettingButtonStyles.icon} />
                    </View>
                )}
                </GridItem>
                <GridItem
                label="Language"
                onPress={() =>
                    setLanguage(prev => (prev === 'en' ? 'ja' : prev === 'ja' ? 'ko' : 'en'))
                }
                >
                <Text style={SettingButtonStyles.flag}>
                    {language === 'en' ? '🇺🇸' : language === 'ja' ? '🇯🇵' : '🇰🇷'}
                </Text>
                </GridItem>
                <GridItem label="Chapter alerts" onPress={() => setAlertsOn(prev => !prev)}>
                <Feather name={alertsOn ? "bell" : "bell-off"} style={SettingButtonStyles.icon} />
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
        <ChangeLoginModal
            visible={showChangeLogin}
            onClose={() => setShowChangeLogin(false)}
            accountId={accountId ?? undefined}
            navigation={navigation}
        />
        <Anchor scrollRef={scrollRef} isScrolling={isScrolling} />
        </View>
    );
}
