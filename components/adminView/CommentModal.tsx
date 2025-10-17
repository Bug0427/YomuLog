import React from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import {AdminTabStyles, confirmationStyles, AdminSearchBarStyles} from '../../styles/global'

export default function CommentModal({
  visible,
  text,
  onClose,
  sid,
}: {
  visible: boolean;
  text: string;
  onClose: () => void;
  sid?: string;
}) {
  const displaySid = sid ?? '';
  return (
    <Modal transparent visible={visible} onRequestClose={onClose} animationType="fade">
      <View style={confirmationStyles.backdrop}>
        <View style={[confirmationStyles.card, { padding: 0 }]}>
          <Text
            style={[
                AdminSearchBarStyles.checkText,
                { paddingVertical: 15, borderBottomWidth: 2, borderColor: '#463B54', textAlign: 'center' },
            ]}
          >
            Comment:
            {displaySid ? <Text style={{ fontWeight: '600' }}>{` <SID: ${displaySid}>`}</Text> : null}
          </Text>
          <ScrollView style={{ maxHeight: 350 }}>
            <Text style={[{ fontSize: 14, color: '#412d5cff', margin: 20 }]}>{text}</Text>
          </ScrollView>
          <Pressable
            style={[AdminTabStyles.button, { width: 80, margin: 20, alignSelf: 'center' }]}
            onPress={onClose}
          >
            <Text style={[{ color: '#b2abd5ff', fontWeight: '600' }]}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
