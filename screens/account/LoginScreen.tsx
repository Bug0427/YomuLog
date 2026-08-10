import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useAuthContext } from '../../context/AuthContext';
import { FeedbackStyles, SubmitButtonStyles } from '../../styles/global';
import { verifyUser } from '../../services/feedbackRepo';
import { supabaseSignIn } from '../../services/supabaseAuth';


export default function LoginScreen() {
const { colors: theme } = useTheme();
const { login: authLogin } = useAuthContext();
const navigation = useNavigation<any>();
const [username, setUsername] = useState('');
const [password, setPassword] = useState('');
const [errorMsg, setErrorMsg] = useState<string | null>(null);

const onSubmit = async () => {
    const id = username.trim();
    const pwd = password;

    if (!id || !pwd) {
    setErrorMsg('Please enter username and password.');
    return;
    }

    try {
      setErrorMsg(null);
      const uname = id.trim();
      const row: any = await verifyUser(uname, pwd);
      if (!row) {
        setErrorMsg('Invalid username or password.');
        return;
      }
      // Establish the matching Supabase Auth session (same email + password)
      // so Premium entitlement / Cloud Sync can resolve a real user id.
      // Non-blocking on failure — the local session still works.
      const email: string | undefined = row.EMAIL;
      if (email) {
        const sb = await supabaseSignIn(email, pwd);
        if (!sb.ok && !sb.needsEmailConfirmation) {
          console.warn('Supabase sign-in failed (local login still works):', sb.error);
        }
      }
      (globalThis as any).currentAccountId = row.ACCOUNTID;
      (globalThis as any).currentUsername = row.USERNM;
      (globalThis as any).currentSecurityLevel = row.SECURITYLVL;
      (globalThis as any).forceLoggedOut = false;
      authLogin(row.ACCOUNTID, row.USERNM, row.SECURITYLVL ?? 0);

      console.log('🔐 Session set from Login:', {
        accountId: row.ACCOUNTID,
        username: row.USERNM,
        level: row.SECURITYLVL,
      });

      navigation.replace('UserAccount');
    } catch (e) {
      console.error('Login failed', e);
      setErrorMsg('Login failed.');
    }
};

const exit = () => navigation.goBack();

const formContent = (
    <View style={{ flex: 1, paddingHorizontal: 20 }}>
    {/* App title */}
    <View style={{ alignItems: 'center', marginTop: 16, marginBottom: 12 }}>
        <Text style={[FeedbackStyles.itemText, { fontSize: 36, color: theme.textPrimary }]}>YomuLog</Text>
    </View>

    <ScrollView
    keyboardShouldPersistTaps="handled"
    contentContainerStyle={{ paddingBottom: 40, flexGrow: 1 }}
    >
        {/* Card */}
        <View style={{
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 8,
        backgroundColor: 'transparent',
        overflow: 'hidden',
        marginHorizontal: 8,
        }}>
        {/* Card header */}
        <View style={{ paddingVertical: 12, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: theme.borderLight }}>
            <Text style={[FeedbackStyles.itemText, { fontSize: 20, color: theme.textPrimary }]}>Login</Text>
        </View>

        {/* Card body */}
        <View style={{ padding: 16, alignItems: 'center' }}>
            {errorMsg ? (
            <Text style={[FeedbackStyles.helper, { color: theme.error, marginBottom: 8 }]}>
                {errorMsg}
            </Text>
            ) : null}
            {/* Username / Email */}
            <TextInput
            style={[
                FeedbackStyles.item,
                {
                width: '90%', minHeight: 44,
                backgroundColor: theme.bgCard,
                borderColor: theme.border,
                color: theme.textPrimary,
                },
            ]}
            value={username}
            onChangeText={setUsername}
            placeholder="username"
            placeholderTextColor={theme.placeholder}
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="username"
            autoComplete="username"
            returnKeyType="next"
            />

            {/* Password */}
            <TextInput
            style={[
                FeedbackStyles.item,
                {
                width: '90%', minHeight: 44, marginTop: 12,
                backgroundColor: theme.bgCard,
                borderColor: theme.border,
                color: theme.textPrimary,
                },
            ]}
            value={password}
            onChangeText={setPassword}
            placeholder="password"
            placeholderTextColor={theme.placeholder}
            secureTextEntry
            textContentType="newPassword"
            autoComplete="new-password"
            returnKeyType="done"
            onSubmitEditing={onSubmit}
            />

            {/* Submit */}
            <Pressable
            accessibilityRole="button"
            onPress={() => {
            if (!username.trim() || !password) {
                setErrorMsg('Please enter username and password.');
                return;
            }
            onSubmit();
            }}
            style={[SubmitButtonStyles.item, { marginTop: 16, width: 120, alignSelf: 'center' }]}
            >
            <Text style={[FeedbackStyles.itemText, { color: theme.textPrimary }]}>Submit</Text>
            </Pressable>


            <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('ForgotCredentials')}
            style={{ marginTop: 12 }}
            >
            <Text style={[FeedbackStyles.helper, { color: theme.textMuted }]}>Forgot username or password?</Text>
            </Pressable>

            {/* Create account link */}
            <Pressable
              accessibilityRole="button"
              onPress={() => navigation.replace('CreateAccount')}
              style={{ marginTop: 2 }}
            >
                <Text style={[FeedbackStyles.helper, { color: theme.textMuted }]}>Create account →</Text>
            </Pressable>
        </View>
        </View>

    {/* Exit button at bottom */}
    <View style={{ alignItems: 'center', marginVertical: 16 }}>
        <Pressable accessibilityRole="button" onPress={exit} style={[SubmitButtonStyles.item, { width: 120, marginBottom: 40 }]}>
        <Text style={[FeedbackStyles.itemText, { color: theme.textPrimary }]}>Exit</Text>
        </Pressable>
    </View>
    </ScrollView>
    </View>
);

return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
    <KeyboardAvoidingView
    style={[FeedbackStyles.screen, { backgroundColor: theme.bg }]}
    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
    {Platform.OS === 'web' ? (
        formContent
    ) : (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        {formContent}
        </TouchableWithoutFeedback>
    )}
    </KeyboardAvoidingView>
    </SafeAreaView>
);
}
