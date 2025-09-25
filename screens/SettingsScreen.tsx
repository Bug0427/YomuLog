// React & React Native
import React, { useState } from 'react';
import { View, ScrollView, Pressable, Text } from 'react-native';
import { Feather } from "@expo/vector-icons";

// Components
import Header from '../components/layout/Header';
import { useScrollTracker } from '../hooks/useScrollTracker';
import Anchor from '../components/layout/Anchor';

// Data & Styles
import { GeneralStyles, SettingButtonStyles } from '../styles/global';

export const buttonActions = {
    refreshMetadata: () => {console.log('🔄 Refresh metadata');},
    clearCache: () => {console.log('🗑️ Clear cache');},
    resetAIRecommendations: () => {console.log('🔄 Reset AI recommendations');},
    enableAISearch: () => {console.log('🤖 Enable AI search');},
    logOut: () => {console.log('🚪 Log out');},
    openFeedback: () => {console.log('💬 Open feedback');},
    openDownloads: () => {console.log('⬇️ Open downloads');},
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
                    <Feather name="chevrons-right" style={[SettingButtonStyles.Icon, { fontSize: 26 }]} />
                )}
                {directionMode === 'rtl' && (
                    <Feather name="chevrons-left" style={[SettingButtonStyles.Icon, { fontSize: 26 }]} />
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
                <GridItem label="Manage downloads" onPress={buttonActions.openDownloads}>
                <Feather name="download" style={SettingButtonStyles.Icon} />
                </GridItem>
                <GridItem label="Feedback" onPress={buttonActions.openFeedback}>
                <Feather name="message-square" style={SettingButtonStyles.Icon} />
                </GridItem>
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
