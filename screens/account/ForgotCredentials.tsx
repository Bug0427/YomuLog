import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { FeedbackStyles, SubmitButtonStyles } from '../../styles/global';
import { runAsync } from '../../services/feedbackRepo';

export default function ForgotCredentials() {
  const { colors: theme } = useTheme();
  const navigation = useNavigation<any>();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async () => {
    const em = email.trim().toLowerCase();
    if (!em) {
      Alert.alert('Error', 'Please enter your email address.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      Alert.alert('Error', 'Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const row: any = await runAsync(
        'SELECT USERNM FROM users WHERE lower(EMAIL) = ? LIMIT 1',
        [em]
      );
      // Don't reveal whether the email exists or not — always show success
      setSent(true);
      if (row?.rows?._array?.length) {
        console.log('Password reset requested for:', row.rows._array[0].USERNM);
      }
    } catch (e) {
      console.warn('ForgotCredentials error:', e);
      // Still show success to avoid leaking user existence
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <Text style={[FeedbackStyles.itemText, { fontSize: 22, color: theme.textPrimary, marginBottom: 12 }]}>
            Check Your Email
          </Text>
          <Text style={[FeedbackStyles.helper, { color: theme.textMuted, textAlign: 'center', fontSize: 14, marginBottom: 24 }]}>
            If an account with that email exists, we've sent a password reset link. Please check your inbox.
          </Text>
          <Pressable
            onPress={() => navigation.goBack()}
            style={[SubmitButtonStyles.item, { width: 140 }]}
          >
            <Text style={[FeedbackStyles.itemText, { color: theme.textPrimary }]}>Back to Login</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <KeyboardAvoidingView
        style={[FeedbackStyles.screen, { backgroundColor: theme.bg }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }}>
          <View style={{ alignItems: 'center', marginBottom: 30 }}>
            <Text style={[FeedbackStyles.itemText, { fontSize: 28, color: theme.textPrimary, marginBottom: 8 }]}>
              Reset Password
            </Text>
            <Text style={[FeedbackStyles.helper, { color: theme.textMuted, textAlign: 'center', fontSize: 14 }]}>
              Enter your email address and we'll send you a password reset link.
            </Text>
          </View>

          <View style={{
            borderWidth: 1, borderColor: theme.border, borderRadius: 8,
            backgroundColor: 'transparent', padding: 16, marginBottom: 20,
          }}>
            <TextInput
              style={[FeedbackStyles.item, {
                width: '100%', minHeight: 44,
                backgroundColor: theme.bgCard, borderColor: theme.border,
                color: theme.textPrimary,
              }]}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={theme.placeholder}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
            />

            <Pressable
              onPress={handleReset}
              disabled={loading}
              style={[SubmitButtonStyles.item, { marginTop: 16, width: 160, alignSelf: 'center', opacity: loading ? 0.6 : 1 }]}
            >
              <Text style={[FeedbackStyles.itemText, { color: theme.textPrimary }]}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </Text>
            </Pressable>
          </View>

          <Pressable onPress={() => navigation.goBack()} style={{ alignSelf: 'center' }}>
            <Text style={[FeedbackStyles.helper, { color: theme.textMuted }]}>← Back to Login</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
