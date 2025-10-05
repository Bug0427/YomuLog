import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { FeedBackStyles } from '../styles/global';
import FBHeader from '../components/layout/FBHeader';

export default function Admin() {
const navigation = useNavigation<any>();

return (
    <View style={FeedBackStyles.screen}>
    <FBHeader title="Admin" onBack={() => navigation.goBack()} />

    <View style={FeedBackStyles.body}>
        <Text style={[FeedBackStyles.itemText, { marginBottom: 12 }]}>Admin tools</Text>

        <Pressable style={FeedBackStyles.item} onPress={() => console.log('TODO: View reports')}>
        <Text style={FeedBackStyles.itemText}>View reports</Text>
        </Pressable>

        <Pressable style={FeedBackStyles.item} onPress={() => console.log('TODO: Manage users')}>
        <Text style={FeedBackStyles.itemText}>Manage users</Text>
        </Pressable>
    </View>
    </View>
);
}