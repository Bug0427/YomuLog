import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {adminTabStyles, confirmationStyles} from '../../styles/global'

export default function CommentModal({
visible,
text,
onClose,
}: {
visible: boolean;
text: string;
onClose: () => void;
}) {
return (
    <Modal transparent visible={visible} onRequestClose={onClose} animationType="fade">
    <View style={confirmationStyles.backdrop}>
        <View style={confirmationStyles.card}>
        <Text style={adminTabStyles.text}>Comment</Text>
        <ScrollView style={{ maxHeight: 280 }}>
            <Text style={[{fontSize: 14, color: '#463B54'}]}>{text}</Text>
        </ScrollView>
        <Pressable style={adminTabStyles.button} onPress={onClose}>
            <Text style={[{color: '#463B54', fontWeight: '600'}]}>Close</Text>
        </Pressable>
        </View>
    </View>
    </Modal>
);
}

