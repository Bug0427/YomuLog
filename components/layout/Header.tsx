import React from 'react';
import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GeneralStyles } from '../../styles/global';
import LoginIcon from '../admin/LoginIcon';
import NavBar from '../layout/NavBar';
import { useTheme } from '../../context/ThemeContext';

export default function Header() {
    const { colors: theme } = useTheme();
    const insets = useSafeAreaInsets();
    return (
        <View style={[GeneralStyles.section, { backgroundColor: theme.bg, paddingTop: insets.top }]}>
        <View style={[GeneralStyles.header, { backgroundColor: theme.bg }]}>
            <Text style={[GeneralStyles.title, { color: theme.textSecondary }]}>YomuLog</Text>
            <LoginIcon />
        </View>
        <NavBar />
        </View>
    );
}
