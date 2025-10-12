// React & React Native
import React, { useState, useEffect } from 'react';
import { View, ScrollView, Pressable, Text } from 'react-native';
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

// Components
import Header from '../../components/layout/Header';
import { useScrollTracker } from '../../hooks/useScrollTracker';
import Anchor from '../../components/layout/Anchor';
import { useConfirm } from '../../components/admin/confirmation';
import { resetDatabase } from '../../services/devResetDB';

// Data & Styles
import { GeneralStyles, SettingButtonStyles } from '../../styles/global';

// Screens
import { SecurityLevel, verifyUser } from '../../services/feedbackRepo';

// Local typing for verifyUser result shape
type VerifyRow = { SECURITYLVL: SecurityLevel } | null;

export const buttonActions = {
    refreshMetadata: () => {console.log('🔄 Refresh metadata');},
    clearCache: () => {console.log('🗑️ Clear cache');},
    resetAIRecommendations: () => {console.log('🔄 Reset AI recommendations');},
    enableAISearch: () => {console.log('🤖 Enable AI search');},
    logOut: () => {console.log('🚪 Log out');},
    openFeedback: (navigation?: any) => { console.log('💬 Open feedback'); navigation?.navigate('FeedBackHome'); },
    openDownloads: (navigation?: any) => { console.log('⬇️ Open downloads'); navigation?.navigate('DownLoadsScreen'); },
    openAccountSettings: () => {console.log('🔒 Open account settings');},
};

const GridItem = ({ label, children, onPress }: { label: string; children?: React.ReactNode; onPress?: () => void }) => {
return (
    <View style={SettingButtonStyles.Cell}>
        <Pressable style={SettingButtonStyles.Button} onPress={onPress} hitSlop={10}>
            {children}
        </Pressable>
        <Text style={SettingButtonStyles.CellLabel}>{label}</Text>
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
    const confirm = useConfirm();
    const handleRefreshMetadata = async () => {
        const ok = await confirm({
            danger: true
        });
        if (!ok) return;
        try {
            await resetDatabase();
            console.log('🔄 Database reset via Refresh metadata');
        } catch (e) {
            console.warn('Reset DB failed', e);
        }
    };
    // ---------------------------------------------------------------------
    // Provisional login + verification logic (no Login screen yet)
    // If you later add a real Login, replace the savedUsername/password
    // with values from AsyncStorage or your auth store.
    const [securityLevel, setSecurityLevel] = useState<SecurityLevel | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        let isMounted = true;
        (async () => {

            const savedUsername: string | undefined = (globalThis as any).currentUsername;
            const savedPassword: string | undefined = (globalThis as any).currentPassword;
            console.log('👤 Saved creds seen by Settings:', { savedUsername, hasPassword: !!savedPassword });

            if (!savedUsername || !savedPassword) {
                // Not logged in → no privileged controls
                if (isMounted) {
                    setSecurityLevel(null);
                    setLoading(false);
                }
                return;
            }

            try {
                const row = (await verifyUser(savedUsername, savedPassword)) as VerifyRow;
                if (isMounted) {
                    setSecurityLevel(row ? (row.SECURITYLVL as SecurityLevel) : null);
                }
            } catch (e) {
                console.warn('verifyUser failed', e);
                if (isMounted) setSecurityLevel(null);
            } finally {
                if (isMounted) setLoading(false);
            }
        })();
        return () => { isMounted = false; };
    }, []);

    // Helpers to route based on login state
    const goFeedback = async () => {
        // Attempt to (re)verify on demand so the button doesn't jump to profile when state isn't ready
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

            // Logged in → open feedback home, pass along basic user context so reports can attach account
            // @ts-ignore
            navigation.navigate?.('FeedBackHome', { username: savedUsername, securityLevel: level });
        } catch (e) {
            console.warn('goFeedback verify-on-press failed', e);
            // @ts-ignore
            navigation.navigate?.('LoginScreen');
        } finally {
            setLoading(false);
        }
    };

    const goAdmin = () => {
        // @ts-ignore
        navigation.navigate?.('AdminHome');
    };


    useEffect(() => {
        console.log('🔎 SettingsScreen securityLevel:', securityLevel);
    }, [securityLevel]);

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
            <View style={SettingButtonStyles.Grid}>
                <GridItem label="Theme" onPress={() => setThemeOn(prev => !prev)}>
                <Feather name={themeOn ? "moon" : "sun"} style={SettingButtonStyles.Icon} />
                </GridItem>
                <GridItem
                label="Direction"
                onPress={() =>
                    setDirectionMode(prev => (prev === 'ltr' ? 'rtl' : prev === 'rtl' ? 'vertical' : 'ltr'))
                }
                >
                {directionMode === 'ltr' && (
                    <Feather name="chevrons-right" style={[SettingButtonStyles.Icon, { fontSize: 35 }]} />
                )}
                {directionMode === 'rtl' && (
                    <Feather name="chevrons-left" style={[SettingButtonStyles.Icon, { fontSize: 35 }]} />
                )}
                {directionMode === 'vertical' && (
                    <View style={{ alignItems: 'center' }}>
                    <Feather name="chevrons-up" style={SettingButtonStyles.Icon} />
                    <Feather name="chevrons-down" style={SettingButtonStyles.Icon} />
                    </View>
                )}
                </GridItem>
                <GridItem
                label="Language"
                onPress={() =>
                    setLanguage(prev => (prev === 'en' ? 'ja' : prev === 'ja' ? 'ko' : 'en'))
                }
                >
                <Text style={SettingButtonStyles.Flag}>
                    {language === 'en' ? '🇺🇸' : language === 'ja' ? '🇯🇵' : '🇰🇷'}
                </Text>
                </GridItem>
                <GridItem label="Chapter alerts" onPress={() => setAlertsOn(prev => !prev)}>
                <Feather name={alertsOn ? "bell" : "bell-off"} style={SettingButtonStyles.Icon} />
                </GridItem>
                <GridItem label="Refresh metadata" onPress={handleRefreshMetadata}>
                <Feather name="refresh-ccw" style={SettingButtonStyles.Icon} />
                </GridItem>
                <GridItem label="Clear cache" onPress={buttonActions.clearCache}>
                <Feather name="trash-2" style={SettingButtonStyles.Icon} />
                </GridItem>
                <GridItem label="Reset AI recs" onPress={buttonActions.resetAIRecommendations}>
                <Feather name="rotate-ccw" style={SettingButtonStyles.Icon} />
                </GridItem>
                <GridItem label="Enable AI search" onPress={buttonActions.enableAISearch}>
                <Feather name="cpu" style={SettingButtonStyles.Icon} />
                </GridItem>
                <GridItem label="Manage downloads" onPress={() => buttonActions.openDownloads(navigation)}>
                <Feather name="download" style={SettingButtonStyles.Icon} />
                </GridItem>
                {securityLevel === SecurityLevel.Admin ? (
                <GridItem label="Admin" onPress={goAdmin}>
                <Feather name="shield" style={SettingButtonStyles.Icon} />
                </GridItem>
                ) : (
                <GridItem label="Feedback" onPress={goFeedback}>
                <Feather name="message-square" style={SettingButtonStyles.Icon} />
                </GridItem>
                )}
                <GridItem label="Change password/username" onPress={buttonActions.openAccountSettings}>
                <Feather name="lock" style={SettingButtonStyles.Icon} />
                </GridItem>
                <GridItem label="Log out" onPress={buttonActions.logOut}>
                <Feather name="log-out" style={SettingButtonStyles.Icon} />
                </GridItem>
            </View>
            </View>
        </ScrollView>
        <Anchor scrollRef={scrollRef} isScrolling={isScrolling} />
        </View>
    );
}
