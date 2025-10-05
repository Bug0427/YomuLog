// React & React Native
import React, { useState, useEffect } from 'react';
import { View, ScrollView, Pressable, Text } from 'react-native';
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

// Components
import Header from '../components/layout/Header';
import { useScrollTracker } from '../hooks/useScrollTracker';
import Anchor from '../components/layout/Anchor';

// Data & Styles
import { GeneralStyles, SettingButtonStyles } from '../styles/global';

// Screens
import FeedBackHome from './feedback/FeedBackHome'
import { SecurityLevel, verifyUser } from '../services/feedbackRepo';

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

            if (!savedUsername || !savedPassword) {
                // Not logged in → no privileged controls
                if (isMounted) {
                    setSecurityLevel(null);
                    setLoading(false);
                }
                return;
            }

            try {
                const row = await verifyUser(savedUsername, savedPassword);
                if (isMounted) {
                    setSecurityLevel((row?.SECURITYLVL as SecurityLevel) ?? null);
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
    const goFeedback = () => {
        if (securityLevel === null) {
            // Not logged in → send to Login/Signup (placeholder route name)
            // If you don't have this route yet, this will no-op except for the log.
            console.log('🔐 Not logged in → navigate to LoginSignup');
            // @ts-ignore
            navigation.navigate?.('LoginScreen');
            return;
        }
        // Logged in → open feedback home
        // @ts-ignore
        navigation.navigate?.('FeedBackHome');
    };

    const goAdmin = () => {
        // @ts-ignore
        navigation.navigate?.('AdminHome');
    };

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
                <GridItem label="Refresh metadata" onPress={buttonActions.refreshMetadata}>
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
