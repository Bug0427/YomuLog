import NavBar from '../components/NavBar'; 
import {GeneralStyles} from '../styles/global';
import { View } from 'react-native';
import React from 'react';
import { TrackedScrollView } from '../components/TrackedScrollView';

export default function SearchScreen() {
    return (
        <View style={[{ flex: 1, position: 'relative' }, GeneralStyles.scrollContainer]}>
        <TrackedScrollView
            style={GeneralStyles.scrollContainer}
            contentContainerStyle={GeneralStyles.container}
        >
        <View>
        <NavBar />
        </View>
        </TrackedScrollView>
        </View>
    );
}