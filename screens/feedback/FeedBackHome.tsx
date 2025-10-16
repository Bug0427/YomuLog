// React & React Native
import React from 'react';
import { View, ScrollView, Text, Pressable, Alert } from 'react-native';
import { Feather } from "@expo/vector-icons";
import { useNavigation } from '@react-navigation/native';

// Components
import { useScrollTracker } from '../../hooks/useScrollTracker';

// Data & Styles
import { GeneralStyles, SettingButtonStyles, FeedBackStyles } from '../../styles/global';

export const buttonActions = {
    reportProblem: () => {console.log('🚨 Report a problem');},
    leaveReview: () => {console.log('💬 Leave a review');},
    leaveRating: () => {console.log('⭐ Leave a rating');},
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

export default function FeedBackHome() {
    const { scrollRef, handleScrollStart, handleScrollEnd } = useScrollTracker();
    const navigation = useNavigation();

    React.useEffect(() => {
        const unsub = (navigation as any).addListener?.('focus', () => {
            const gf = (globalThis as any).__feedbackFlash;
            if (gf && gf.message) {
                console.log('🔔', gf.message);
                Alert.alert('Success', gf.message);
                (globalThis as any).__feedbackFlash = null;
                setTimeout(() => {
                    console.log('✅ Flash cleared');
                }, gf.ms ?? 3000);
            }
        });
        return () => {
            if (typeof unsub === 'function') unsub();
        };
    }, [navigation]);

    return (
        <View style={GeneralStyles.section}>
        <ScrollView
            ref={scrollRef}
            onScrollBeginDrag={handleScrollStart}
            onScrollEndDrag={handleScrollEnd}
            onMomentumScrollEnd={handleScrollEnd}
        >
            <View style={[GeneralStyles.container, { paddingHorizontal: 12 }]}>
            <View style={FeedBackStyles.Button}>
                <Pressable onPress={() => navigation.goBack()}>
                    <Text style={FeedBackStyles.Text}>Back</Text>
                </Pressable>
            </View>
            <View style={FeedBackStyles.grid}>
                <GridItem label="Report a problem" onPress={() => (navigation as any).navigate('FileReport')}>
                    <Feather name="alert-triangle" style={SettingButtonStyles.Icon} />
                </GridItem>
                <GridItem label="Leave a Review" onPress={() => (navigation as any).navigate('LeaveReview')}>
                    <Feather name="message-square" style={SettingButtonStyles.Icon} />
                </GridItem>
                <GridItem label="Leave a Rating" onPress={() => (navigation as any).navigate('LeaveRating')}>
                    <Feather name="heart" style={SettingButtonStyles.Icon} />
                </GridItem>
            </View>
            </View>
        </ScrollView>
        </View>
    );
}
