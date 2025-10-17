import React from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { AdminTabStyles, confirmationStyles, AdminSearchBarStyles, CommentModalStyles } from '../../styles/global'

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
        <View style={[confirmationStyles.card, CommentModalStyles.cardNoPad]}>
          <Text
            style={[AdminSearchBarStyles.checkText, CommentModalStyles.headerDelta]}
          >
            Comment:
            {displaySid ? <Text style={CommentModalStyles.sidStrong}>{` <SID: ${displaySid}>`}</Text> : null}
          </Text>
          <ScrollView style={CommentModalStyles.scroll}>
            <Text style={CommentModalStyles.bodyText}>{text}</Text>
          </ScrollView>
          <Pressable
            style={[AdminTabStyles.button, CommentModalStyles.closeBtn]}
            onPress={onClose}
          >
            <Text style={CommentModalStyles.closeText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
