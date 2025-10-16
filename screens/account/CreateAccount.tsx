    import React, { useState } from 'react';
    import { View, Text, TextInput, Pressable, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard, Platform, ScrollView } from 'react-native';
    import { useNavigation } from '@react-navigation/native';
    import { FeedBackStyles, SubmitButtonStyles } from '../../styles/global';
import { createUser, runAsync, SecurityLevel } from '../../services/feedbackRepo';
import { makeUserIdSafe, UserLevel } from '../../utils/idGenerator';

// Ensure default security level mapping even if enum values shift
// Expected mapping: 1 = Admin, 2 = Purchase, 3 = Regular
const REGULAR_LVL: number = (SecurityLevel as any)?.Regular ?? 3;

    function validatePassword(pw: string): string | null {
    if (pw.length < 8) return 'Password must be at least 8 characters.';
    if (!/[A-Z]/.test(pw)) return 'Password must include an uppercase letter.';
    if (!/[a-z]/.test(pw)) return 'Password must include a lowercase letter.';
    if (!/[0-9]/.test(pw)) return 'Password must include a number.';
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(pw)) return 'Password must include a special character.';
    return null;
    }

    export default function CreateAccount() {
    const navigation = useNavigation<any>();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [email, setEmail] = useState('');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const exit = () => navigation.goBack();
    const goLogin = () => navigation.replace('LoginScreen');

    const onSubmit = async () => {
        const user = username.trim();
        const pw = password;
        const em = email.trim().toLowerCase(); // store & compare emails in lowercase

        // Basic empty checks
        if (!user || !pw || !em) {
        setErrorMsg('Please fill username, password, and email.');
        return;
        }

        // Password policy
        const pwErr = validatePassword(pw);
        if (pwErr) {
        setErrorMsg(pwErr);
        return;
        }

        // Very basic email shape check
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
        setErrorMsg('Please enter a valid e‑mail.');
        return;
        }

        try {
        setIsSubmitting(true);
        setErrorMsg(null);

        // Uniqueness checks
        const rsUser: any = await runAsync(
            `SELECT 1 FROM users WHERE lower(USERNM) = lower(?) LIMIT 1`,
            [user]
        );
        if (rsUser?.rows?._array?.length) {
            setErrorMsg('Username already taken.');
            setPassword('');
            setIsSubmitting(false);
            return;
        }

        const rsEmail: any = await runAsync(
            `SELECT 1 FROM users WHERE lower(EMAIL) = ? LIMIT 1`,
            [em]
        );
        if (rsEmail?.rows?._array?.length) {
            setErrorMsg('Email already used. Please log in or use a different email.');
            setPassword('');
            setIsSubmitting(false);
            return;
        }

        // Create account
        try {
        await createUser({
            accountId: await makeUserIdSafe((REGULAR_LVL as UserLevel), user),
            userNm: user,
            email: em, // already lowercased
            pswd: pw, // NOTE: hash in production
            securityLvl: REGULAR_LVL,
        });
        console.log('✅ Created user with security level:', REGULAR_LVL);
        } catch (err: any) {
        const msg = String(err?.message || err);
        if (msg.includes('users.EMAIL')) {
            setErrorMsg('Email already used. Please log in or use a different email.');
        } else if (msg.includes('users.USERNM')) {
            setErrorMsg('Username already taken.');
        } else {
            setErrorMsg('Create account failed. Please try again.');
        }
        setIsSubmitting(false);
        return; // stop here on insert error
        }

        // Success → clear local form state, then go to Login so they can sign in
        setUsername('');
        setPassword('');
        setEmail('');
        goLogin();
        } catch (e) {
        console.error('❌ Create account failed', e);
        setErrorMsg('Create account failed. Please try again.');
        } finally {
        setIsSubmitting(false);
        }
    };

    return (
        <KeyboardAvoidingView style={FeedBackStyles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <View style={{ flex: 1, paddingHorizontal: 20 }}>
            {/* App title */}
            <View style={{ alignItems: 'center', marginTop: 60, marginBottom: 12 }}>
                <Text style={[FeedBackStyles.itemText, { fontSize: 36 }]}>YomuLog</Text>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40, flexGrow: 1 }}>
                {/* Card */}
                <View style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, backgroundColor: 'transparent', overflow: 'hidden', marginHorizontal: 8 }}>
                {/* Header */}
                <View style={{ paddingVertical: 12, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#ddd' }}>
                    <Text style={[FeedBackStyles.itemText, { fontSize: 20 }]}>Create account</Text>
                </View>

                {/* Body */}
                <View style={{ padding: 16, alignItems: 'center' }}>
                    {errorMsg ? (
                    <Text style={[FeedBackStyles.helper, { color: '#d33', marginBottom: 8 }]}>{errorMsg}</Text>
                    ) : null}

                    {/* Username */}
                    <TextInput
                    style={[FeedBackStyles.item, { width: '90%', minHeight: 44 }]}
                    value={username}
                    onChangeText={setUsername}
                    placeholder="Username"
                    placeholderTextColor="#999"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="next"
                    />

                    {/* Password */}
                    <TextInput
                    style={[FeedBackStyles.item, { width: '90%', minHeight: 44, marginTop: 12 }]}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Password"
                    placeholderTextColor="#999"
                    secureTextEntry
                    returnKeyType="done"
                    />

                    {/* Email */}
                    <TextInput
                    style={[FeedBackStyles.item, { width: '90%', minHeight: 44, marginTop: 12 }]}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="E‑mail"
                    placeholderTextColor="#999"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    />

                    {/* Submit */}
                    <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                        if (isSubmitting) return;
                        onSubmit();
                    }}
                    style={[SubmitButtonStyles.item, { marginTop: 16, width: 120, alignSelf: 'center', opacity: isSubmitting ? 0.6 : 1 }]}
                    >
                    <Text style={FeedBackStyles.itemText}>Submit</Text>
                    </Pressable>

                    {/* Login link */}
                    <Pressable accessibilityRole="button" onPress={goLogin} style={{ marginTop: 16 }}>
                    <Text style={FeedBackStyles.helper}>Login →</Text>
                    </Pressable>
                </View>
                </View>

            {/* Exit button at bottom */}
            <View style={{ alignItems: 'center', marginVertical: 16 }}>
                <Pressable accessibilityRole="button" onPress={exit} style={[SubmitButtonStyles.item, { width: 120, marginBottom:250 }]}>
                <Text style={FeedBackStyles.itemText}>Exit</Text>
                </Pressable>
            </View>
            </ScrollView>
            </View>
        </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
    );
    }