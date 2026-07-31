// screens/auth/AuthScreen.tsx
// Supabase authentication screen — email/password sign-in and sign-up.
// Premium users authenticate here to enable cloud sync.

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { usePremium } from '../../context/PremiumContext';
import { colors, spacing } from '../../styles/tokens';

type Mode = 'signIn' | 'signUp';

export default function AuthScreen() {
  const { signIn, signUp, signOut, user, configured } = useAuth();
  const { isPremium } = usePremium();

  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const bg = '#1a1a2e';
  const cardBg = '#1e1e3a';
  const border = '#2a2a4a';
  const accent = '#7c5cbf';
  const textPrimary = '#e0d8f0';
  const textMuted = '#888';
  const errorColor = '#ff6b6b';
  const success = '#5ad88a';

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    if (mode === 'signUp' && password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signIn') {
        const { error } = await signIn(email.trim(), password);
        if (error) Alert.alert('Sign In Failed', error);
      } else {
        const { error, needsConfirmation } = await signUp(email.trim(), password);
        if (error) {
          Alert.alert('Sign Up Failed', error);
        } else if (needsConfirmation) {
          Alert.alert(
            'Check Your Email',
            'We sent a confirmation link. Please check your inbox before signing in.'
          );
          setMode('signIn');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Authenticated state ──────────────────────────────────────────
  if (user) {
    return (
      <ScrollView contentContainerStyle={{ flexGrow: 1, backgroundColor: bg, padding: spacing.p16 }}>
        <View style={{
          backgroundColor: '#1a3a2a',
          borderRadius: 16,
          padding: spacing.p20,
          borderWidth: 1,
          borderColor: success,
          marginTop: 40,
        }}>
          <Feather name="check-circle" size={48} color={success} style={{ alignSelf: 'center', marginBottom: 12 }} />
          <Text style={{ color: textPrimary, fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 6 }}>
            Authenticated
          </Text>
          <Text style={{ color: textMuted, fontSize: 13, textAlign: 'center', marginBottom: 4 }}>
            {user.email}
          </Text>
          <Text style={{ color: textMuted, fontSize: 12, textAlign: 'center', marginBottom: 16 }}>
            {isPremium
              ? 'Premium — cloud sync is available'
              : 'Upgrade to Premium to enable cloud sync'}
          </Text>

          {isPremium && (
            <View style={{
              backgroundColor: '#2d1f4e',
              borderRadius: 10,
              padding: spacing.p14,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: accent,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Feather name="cloud" size={18} color={accent} />
                <Text style={{ color: textPrimary, fontWeight: '700', fontSize: 14 }}>Cloud Sync Active</Text>
              </View>
              <Text style={{ color: textMuted, fontSize: 12 }}>
                Your bookmarks, reading progress, and preferences sync automatically across devices.
              </Text>
            </View>
          )}

          <Pressable
            onPress={signOut}
            style={{
              backgroundColor: errorColor,
              borderRadius: 10,
              paddingVertical: 12,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Sign Out</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  // ── Unauthenticated state (login/signup form) ────────────────────
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: bg }}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: spacing.p16, justifyContent: 'center' }}>
        <View style={{ alignItems: 'center', marginBottom: 30 }}>
          <Feather name="cloud" size={48} color={accent} style={{ marginBottom: 12 }} />
          <Text style={{ color: textPrimary, fontSize: 24, fontWeight: '800', marginBottom: 4 }}>
            Cloud Sync
          </Text>
          <Text style={{ color: textMuted, fontSize: 14, textAlign: 'center' }}>
            {isPremium
              ? 'Sign in to sync your library across devices'
              : 'Premium feature — upgrade to enable cloud sync'}
          </Text>
        </View>

        {!configured && (
          <View style={{
            backgroundColor: '#3a2a1a',
            borderRadius: 10,
            padding: spacing.p12,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: '#bf8c5c',
          }}>
            <Text style={{ color: '#ffc88c', fontSize: 12, textAlign: 'center' }}>
              Supabase is not configured. Add SUPABASE_URL and SUPABASE_ANON_KEY to your environment.
            </Text>
          </View>
        )}

        {/* Mode toggle */}
        <View style={{
          flexDirection: 'row',
          backgroundColor: cardBg,
          borderRadius: 12,
          padding: 4,
          marginBottom: 20,
          borderWidth: 1,
          borderColor: border,
        }}>
          {(['signIn', 'signUp'] as Mode[]).map((m) => (
            <Pressable
              key={m}
              onPress={() => setMode(m)}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 10,
                backgroundColor: mode === m ? accent : 'transparent',
                alignItems: 'center',
              }}
            >
              <Text style={{
                color: mode === m ? '#fff' : textMuted,
                fontWeight: '700',
                fontSize: 14,
              }}>
                {m === 'signIn' ? 'Sign In' : 'Sign Up'}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Email */}
        <Text style={{ color: textMuted, fontSize: 12, fontWeight: '600', marginBottom: 6 }}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor="#555"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          style={{
            backgroundColor: cardBg,
            borderWidth: 1,
            borderColor: border,
            borderRadius: 10,
            padding: spacing.p14,
            color: textPrimary,
            fontSize: 15,
            marginBottom: 14,
          }}
        />

        {/* Password */}
        <Text style={{ color: textMuted, fontSize: 12, fontWeight: '600', marginBottom: 6 }}>Password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="At least 6 characters"
          placeholderTextColor="#555"
          secureTextEntry
          style={{
            backgroundColor: cardBg,
            borderWidth: 1,
            borderColor: border,
            borderRadius: 10,
            padding: spacing.p14,
            color: textPrimary,
            fontSize: 15,
            marginBottom: mode === 'signUp' ? 0 : 20,
          }}
        />

        {/* Confirm password (sign up only) */}
        {mode === 'signUp' && (
          <>
            <Text style={{ color: textMuted, fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 14 }}>
              Confirm Password
            </Text>
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Re-enter your password"
              placeholderTextColor="#555"
              secureTextEntry
              style={{
                backgroundColor: cardBg,
                borderWidth: 1,
                borderColor: border,
                borderRadius: 10,
                padding: spacing.p14,
                color: textPrimary,
                fontSize: 15,
                marginBottom: 20,
              }}
            />
          </>
        )}

        {/* Submit */}
        <Pressable
          onPress={handleSubmit}
          disabled={loading || !configured}
          style={{
            backgroundColor: loading || !configured ? '#3a3a5a' : accent,
            borderRadius: 10,
            paddingVertical: 14,
            alignItems: 'center',
            opacity: loading || !configured ? 0.6 : 1,
          }}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
              {mode === 'signIn' ? 'Sign In' : 'Create Account'}
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
