// screens/auth/AuthScreen.tsx
// Account management screen — shows auth status and provides quick account switching.
// Premium users manage cloud sync credentials here.

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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useAuthContext } from '../../context/AuthContext';
import { usePremium } from '../../context/PremiumContext';
import { useTheme } from '../../context/ThemeContext';
import { spacing } from '../../styles/tokens';
import { RootStackParamList } from '../../navigation/navigation';
import { verifyUser } from '../../services/feedbackRepo';

type Mode = 'signIn' | 'signUp';

export default function AuthScreen() {
  const { isLoggedIn, username, accountId, securityLevel, login, logout } = useAuthContext();
  const { isPremium } = usePremium();
  const { colors: theme } = useTheme();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const [mode, setMode] = useState<Mode>('signIn');
  const [inputUsername, setInputUsername] = useState('');
  const [inputPassword, setInputPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    const name = inputUsername.trim();
    const pwd = inputPassword;

    if (!name || !pwd) {
      Alert.alert('Error', 'Please enter both username and password.');
      return;
    }

    setLoading(true);
    try {
      const row: any = await verifyUser(name, pwd);
      if (!row) {
        Alert.alert('Authentication Failed', 'Invalid username or password. Please try again.');
        setLoading(false);
        return;
      }
      login(row.ACCOUNTID, row.USERNM, row.SECURITYLVL ?? 1);
      // isLoggedIn becomes true through React state; the component re-renders to show authenticated view
    } catch (e) {
      console.error('Auth sign-in failed', e);
      Alert.alert('Error', 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    logout();
  };

  const handleSignUp = () => {
    navigation.navigate('CreateAccount');
  };

  // ── Authenticated state ──────────────────────────────────────────
  if (isLoggedIn) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, backgroundColor: theme.bg, padding: spacing.p16 }}>
        <View style={{
          backgroundColor: theme.bgSecondary,
          borderRadius: 16,
          padding: spacing.p20,
          borderWidth: 1,
          borderColor: theme.success,
          marginTop: 40,
        }}>
          <Feather name="check-circle" size={48} color={theme.success} style={{ alignSelf: 'center', marginBottom: 12 }} />
          <Text style={{ color: theme.textPrimary, fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 6 }}>
            Authenticated
          </Text>
          <Text style={{ color: theme.textMuted, fontSize: 13, textAlign: 'center', marginBottom: 4 }}>
            {username}
          </Text>
          <Text style={{ color: theme.textMuted, fontSize: 11, textAlign: 'center', marginBottom: 4 }}>
            Account: {accountId} · Level: {securityLevel}
          </Text>
          <Text style={{ color: theme.textMuted, fontSize: 12, textAlign: 'center', marginBottom: 16 }}>
            {isPremium
              ? 'Premium — cloud sync is available'
              : 'Upgrade to Premium to enable cloud sync'}
          </Text>

          {isPremium && (
            <View style={{
              backgroundColor: theme.bgCard,
              borderRadius: 10,
              padding: spacing.p14,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: theme.accent,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Feather name="cloud" size={18} color={theme.accent} />
                <Text style={{ color: theme.textPrimary, fontWeight: '700', fontSize: 14 }}>Cloud Sync Active</Text>
              </View>
              <Text style={{ color: theme.textMuted, fontSize: 12 }}>
                Your bookmarks, reading progress, and preferences sync automatically across devices.
              </Text>
            </View>
          )}

          <Pressable
            onPress={handleSignOut}
            style={{
              backgroundColor: theme.error,
              borderRadius: 10,
              paddingVertical: 12,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: theme.textInverse, fontWeight: '700', fontSize: 14 }}>Sign Out</Text>
          </Pressable>
        </View>
      </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Unauthenticated state (login/register) ────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: theme.bg }}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: spacing.p16, justifyContent: 'center' }}>
        <View style={{ alignItems: 'center', marginBottom: 30 }}>
          <Feather name="user" size={48} color={theme.accent} style={{ marginBottom: 12 }} />
          <Text style={{ color: theme.textPrimary, fontSize: 24, fontWeight: '800', marginBottom: 4 }}>
            Account
          </Text>
          <Text style={{ color: theme.textMuted, fontSize: 14, textAlign: 'center' }}>
            {isPremium
              ? 'Sign in to sync your library across devices'
              : 'Sign in or create an account to get started'}
          </Text>
        </View>

        {/* Mode toggle */}
        <View style={{
          flexDirection: 'row',
          backgroundColor: theme.bgCard,
          borderRadius: 12,
          padding: 4,
          marginBottom: 20,
          borderWidth: 1,
          borderColor: theme.border,
        }}>
          {(['signIn', 'signUp'] as Mode[]).map((m) => (
            <Pressable
              key={m}
              onPress={() => setMode(m)}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 10,
                backgroundColor: mode === m ? theme.accent : 'transparent',
                alignItems: 'center',
              }}
            >
              <Text style={{
                color: mode === m ? theme.textInverse : theme.textMuted,
                fontWeight: '700',
                fontSize: 14,
              }}>
                {m === 'signIn' ? 'Sign In' : 'Register'}
              </Text>
            </Pressable>
          ))}
        </View>

        {mode === 'signIn' ? (
          <>
            {/* Username */}
            <Text style={{ color: theme.textMuted, fontSize: 12, fontWeight: '600', marginBottom: 6 }}>Username</Text>
            <TextInput
              value={inputUsername}
              onChangeText={setInputUsername}
              placeholder="Your username"
              placeholderTextColor={theme.placeholder}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="username"
              autoComplete="username"
              style={{
                backgroundColor: theme.bgCard,
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 10,
                padding: spacing.p14,
                color: theme.textPrimary,
                fontSize: 15,
                marginBottom: 14,
              }}
            />

            {/* Password */}
            <Text style={{ color: theme.textMuted, fontSize: 12, fontWeight: '600', marginBottom: 6 }}>Password</Text>
            <TextInput
              value={inputPassword}
              onChangeText={setInputPassword}
              placeholder="Your password"
              placeholderTextColor={theme.placeholder}
              secureTextEntry
              textContentType="password"
              autoComplete="current-password"
              style={{
                backgroundColor: theme.bgCard,
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 10,
                padding: spacing.p14,
                color: theme.textPrimary,
                fontSize: 15,
                marginBottom: 14,
              }}
            />

            {/* Submit */}
            <Pressable
              onPress={handleSignIn}
              disabled={loading}
              style={{
                backgroundColor: loading ? theme.borderLight : theme.accent,
                borderRadius: 10,
                paddingVertical: 14,
                alignItems: 'center',
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? (
                <ActivityIndicator size="small" color={theme.textInverse} />
              ) : (
                <Text style={{ color: theme.textInverse, fontWeight: '700', fontSize: 15 }}>
                  Sign In
                </Text>
              )}
            </Pressable>
          </>
        ) : (
          <>
            {/* Register mode — navigate to CreateAccount */}
            <View style={{
              backgroundColor: theme.bgSecondary,
              borderRadius: 12,
              padding: spacing.p16,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: theme.border,
              alignItems: 'center',
            }}>
              <Feather name="user-plus" size={32} color={theme.accent} style={{ marginBottom: 10 }} />
              <Text style={{ color: theme.textPrimary, fontSize: 15, fontWeight: '700', marginBottom: 6, textAlign: 'center' }}>
                Create a New Account
              </Text>
              <Text style={{ color: theme.textMuted, fontSize: 13, textAlign: 'center', marginBottom: 16 }}>
                Set up a new account with a username and password to start tracking your manga library.
              </Text>
              <Pressable
                onPress={handleSignUp}
                style={{
                  backgroundColor: theme.accent,
                  borderRadius: 10,
                  paddingVertical: 12,
                  paddingHorizontal: 24,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: theme.textInverse, fontWeight: '700', fontSize: 14 }}>
                  Go to Registration
                </Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
