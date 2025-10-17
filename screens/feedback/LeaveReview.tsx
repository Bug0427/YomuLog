// long text review form
// LeaveReview.tsx — long text review form with header submit
import React from 'react';
import { View, Text, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import FBHeader from '../../components/layout/FBHeader';
import { GeneralStyles, FeedbackStyles } from '../../styles/global';

const MAX_CHARS = 360;

export default function LeaveReview() {
  const navigation = useNavigation<any>();
  const [text, setText] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  const remaining = Math.max(0, MAX_CHARS - text.length);
  const MIN_CHARS = 5;
  const isDisabled = text.trim().length < MIN_CHARS || submitting;

  const handleSubmit = async () => {
    const clean = text.trim();
    if (!clean || submitting || isDisabled) return;
    setSubmitting(true);
    try {
      // Get accountId directly from globalThis.currentAccountId
      const accountId = (globalThis as any).currentAccountId;

      console.log('🔍 LeaveReview resolved accountId:', accountId);

      const payload = {
        accountId,
        comments: clean,
      };

      console.log('Submitting review payload:', payload);

      // Dynamically import repo to avoid compile errors if not yet defined
      const repo = await import('../../services/feedbackRepo');
      if (typeof repo.insertReview !== 'function') {
        throw new Error('insertReview not exported from feedbackRepo');
      }
      const saved = await repo.insertReview(payload);
      console.log('✅ insertReview result:', saved);

      // surface success on previous screen
      (globalThis as any).__feedbackFlash = {
        message: 'Review submitted successfully!',
        at: Date.now(),
        ms: 3000,
      };
      navigation.goBack();
    } catch (e) {
      console.warn('❌ Failed to save review (screen):', e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: 'padding', android: undefined })}
      style={GeneralStyles.section}
    >
      <View style={FeedbackStyles.screen}>
        <FBHeader
          title="Leave a review"
          onBack={() => navigation.goBack()}
          onSubmit={handleSubmit}
          submitLabel="Submit"
          disabled={isDisabled}
        />

        <ScrollView keyboardShouldPersistTaps="handled">
          <View style={[GeneralStyles.container, { paddingHorizontal: 12, paddingBottom: 24 }]}> 
            <View
              style={{
                marginTop: 24,
                borderWidth: 2,
                borderColor: '#2c1f42',
                padding: 12,
              }}
            >
              <TextInput
                style={{
                  minHeight: 165,
                  textAlignVertical: 'top',
                  color: '#2c1f42',
                }}
                multiline
                placeholder="Please type here…"
                placeholderTextColor="#6b5a8e"
                value={text}
                onChangeText={setText}
                maxLength={MAX_CHARS}
              />
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4 }}>
                <Text style={{ color: '#2c1f42', fontWeight: '600' }}>
                    {remaining} characters left
                </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}