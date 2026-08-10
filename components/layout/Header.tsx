import React from 'react';
import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { GeneralStyles } from '../../styles/global';
import LoginIcon from '../admin/LoginIcon';
import NavBar from '../layout/NavBar';
import { useTheme } from '../../context/ThemeContext';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { spacing } from '../../styles/tokens';

export default function Header() {
    const { colors: theme } = useTheme();
    const insets = useSafeAreaInsets();
    const { isOnline } = useNetworkStatus();

    return (
        <View style={[GeneralStyles.section, { backgroundColor: theme.bg, paddingTop: insets.top }]}>
        {/* Offline indicator banner */}
        {!isOnline && (
            <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                backgroundColor: theme.warning,
                paddingVertical: spacing.p6,
                paddingHorizontal: spacing.p12,
            }}>
                <Feather name="wifi-off" size={12} color={theme.textInverse} />
                <Text style={{ color: theme.textInverse, fontSize: 11, fontWeight: '700' }}>
                    You're offline — some features may be limited
                </Text>
            </View>
        )}
        <View style={[GeneralStyles.header, { backgroundColor: theme.bg }]}>
            <Text style={[GeneralStyles.title, { color: theme.textSecondary }]}>YomuLog</Text>
            <LoginIcon />
        </View>
        <NavBar />
        </View>
    );
}
