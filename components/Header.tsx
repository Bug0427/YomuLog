import React from 'react';
import { View, Text } from 'react-native';
import { GeneralStyles } from '../styles/global';
import LoginIcon from './LoginIcon';
import NavBar from './NavBar';

export default function Header() {
    return (
        <View style={GeneralStyles.section}>
        <View style={GeneralStyles.header}>
            <Text style={GeneralStyles.title}>YomuLog</Text>
            <LoginIcon />
        </View>
        <NavBar />
        </View>
    );
}
