import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, ActivityIndicator, Modal, Image } from 'react-native';
import { useNavigation, StackActions } from '@react-navigation/native';
import { FeedbackStyles, GeneralStyles } from '../../styles/global';
import { queryFirst, runAsync, getUserByUsername, verifyUser } from '../../services/feedbackRepo';
import { Ionicons } from '@expo/vector-icons';
import { profileIcons } from '../../data/profileIcons';
import { deleteAccount } from '../../services/deleteAccount';
import { logout } from '../../data/SettingsButtonActions/Logout';

function validatePassword(pw: string): string | null {
    if (pw.length < 8) return 'Password must be at least 8 characters.';
    if (!/[A-Z]/.test(pw)) return 'Password needs an uppercase letter.';
    if (!/[a-z]/.test(pw)) return 'Password needs a lowercase letter.';
    if (!/[0-9]/.test(pw)) return 'Password needs a number.';
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(pw)) return 'Password needs a special character.';
    return null;
}
function resolveIconSrc(iconId?: string | null): any | null {
    if (!iconId) return null;
    const all = [...profileIcons.animals, ...profileIcons.female, ...profileIcons.male];
    const found = all.find(i => i.name === iconId);
    return found?.path ?? null; 
}

export default function UserAccount() {
    const navigation = useNavigation<any>();

    useEffect(() => {
        try {
            navigation.setOptions?.({ contentStyle: { backgroundColor: '#AFA6DD' } });
            navigation.setOptions?.({ cardStyle: { backgroundColor: '#AFA6DD' } });
        } catch {}
    }, [navigation]);

    const usernameRef = useRef<TextInput>(null);
    const passwordRef = useRef<TextInput>(null);
    const emailRef = useRef<TextInput>(null);

    function handleBack() {
    try {
        const state = navigation.getState?.();
        const routes = (state as any)?.routes ?? [];
        const idx = (state as any)?.index ?? -1;
        const prev = idx > 0 ? routes[idx - 1] : undefined;

        // If the previous route is the picker, pop two to skip it
        if (prev && prev.name === 'ChooseProfileIcon') {
        navigation.dispatch(StackActions.pop(2));
        return;
        }

        if (typeof navigation.canGoBack === 'function' && navigation.canGoBack()) {
        navigation.goBack();
        } else {
        navigation.navigate('Settings' as never);
        }
    } catch {
        navigation.navigate('Settings' as never);
    }
    }

    // Pull the current session values (set on login)
    const sessionAccountId = (globalThis as any).currentAccountId as string | undefined;
    const sessionUsername = (globalThis as any).currentUsername as string | undefined;

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Current stored values
    const [accountId, setAccountId] = useState('');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [profileIconId, setProfileIconId] = useState<string | null>(null);

    // Edit buffers
    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [pwLen, setPwLen] = useState(8);

    const [canEditUsername, setCanEditUsername] = useState(false);
    const [canEditPassword, setCanEditPassword] = useState(false);
    const [canEditEmail, setCanEditEmail] = useState(false);

    const [showVerify, setShowVerify] = useState(false);
    const [verifyUserNm, setVerifyUserNm] = useState('');
    const [verifyPw, setVerifyPw] = useState('');
    const [verifyError, setVerifyError] = useState<string | null>(null);
    const [editingField, setEditingField] = useState<'username' | 'password' | 'email' | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    useEffect(() => {
        (async () => {
        try {
            if (!sessionAccountId && !sessionUsername) {
                navigation.replace?.('LoginScreen');
                return;
            }
            // Prefer loading by username first, fallback to accountId
            let row: any | undefined = undefined;
            if (sessionUsername) {
                row = await getUserByUsername(sessionUsername);
            }
            if (!row && sessionAccountId) {
            row = await queryFirst<any>(
                `SELECT ACCOUNTID, USERNM, EMAIL, PSWD, SECURITYLVL, PROFILEICON FROM users WHERE ACCOUNTID = ? LIMIT 1`,
                [sessionAccountId]
            );
            }
            if (!row) {
                setError('Could not load your profile.');
                setLoading(false);
                return;
            }
            setAccountId(row.ACCOUNTID);
            setUsername(row.USERNM);
            setEmail(row.EMAIL ?? '');
            setNewUsername(row.USERNM);
            setNewEmail(row.EMAIL ?? '');
            setVerifyUserNm(row.USERNM || '');
            setPwLen((row.PSWD?.length ?? 0) || 8);
            setProfileIconId(row.PROFILEICON ?? null);
            (globalThis as any).currentProfileIconId = row.PROFILEICON ?? null;
            if (!row.PROFILEICON && row.ACCOUNTID) {
            try {
                const r2 = await queryFirst<any>(
                `SELECT PROFILEICON FROM users WHERE ACCOUNTID = ? LIMIT 1`,
                [row.ACCOUNTID]
                );
                if (r2) {
                setProfileIconId(r2.PROFILEICON ?? null);
                (globalThis as any).currentProfileIconId = r2.PROFILEICON ?? null;
                }
            } catch {}
            }
            setLoading(false);
        } catch (e) {
            console.error('Load user failed', e);
            setError('Failed to load account.');
            setLoading(false);
        }
        })();
    }, []);

    useEffect(() => {
    const unsub = navigation.addListener('focus', async () => {
        try {
        if (!sessionAccountId) return;
        const r = await queryFirst<any>(
            'SELECT PROFILEICON FROM users WHERE ACCOUNTID = ? LIMIT 1',
            [sessionAccountId]
        );
        if (r) {
            setProfileIconId(r.PROFILEICON ?? null);
            (globalThis as any).currentProfileIconId = r.PROFILEICON ?? null;
        }
        } catch {}
    });
    return unsub;
    }, [navigation, sessionAccountId]);

    function openVerify(field: 'username' | 'password' | 'email') {
    setEditingField(field);
    setVerifyError(null);
    setVerifyPw('');
    setShowVerify(true);
    }

    async function handleVerifySubmit() {
    if (!verifyUserNm || !verifyPw) {
        setVerifyError('Enter username and password.');
        return;
    }
    try {
        const row: any = await verifyUser(verifyUserNm, verifyPw);
        if (!row || (accountId && row.ACCOUNTID !== accountId)) {
        setVerifyError('Invalid credentials.');
        return;
        }
        if (editingField === 'username') {
        setCanEditUsername(true);
        setTimeout(() => usernameRef.current?.focus(), 50);
        } else if (editingField === 'password') {
        setCanEditPassword(true);
        setTimeout(() => passwordRef.current?.focus(), 50);
        } else if (editingField === 'email') {
        setCanEditEmail(true);
        setTimeout(() => emailRef.current?.focus(), 50);
        }
        setShowVerify(false);
    } catch (e) {
        setVerifyError('Verification failed.');
    }
    }

    // --- Update actions -------------------------------------------------------
    async function handleUpdateUsername() {
        setError(null);
        const u = newUsername.trim();
        if (!u) return setError('Username cannot be empty.');
        if (u === username) return setError('That is already your username.');
        const existing = await queryFirst<{ USERNM: string }>(
        `SELECT USERNM FROM users WHERE USERNM = ? AND ACCOUNTID <> ? LIMIT 1`,
        [u, accountId]
        );
        if (existing) return setError('Username already taken.');

        try {
        await runAsync(`UPDATE users SET USERNM = ? WHERE ACCOUNTID = ?`, [u, accountId]);

        setUsername(u);
        (globalThis as any).currentUsername = u;
        setError('Username updated.');
        setCanEditUsername(false);
        } catch (e: any) {
        console.error('Update username failed', e);
        setError('Failed to update username.');
        }
    }

    async function handleUpdatePassword() {
        setError(null);
        const pw = newPassword;
        const msg = validatePassword(pw);
        if (msg) return setError(msg);
        try {
        await runAsync(`UPDATE users SET PSWD = ? WHERE ACCOUNTID = ?`, [pw, accountId]);
        setNewPassword('');
        setError('Password updated.');
        setCanEditPassword(false);
        } catch (e) {
        console.error('Update password failed', e);
        setError('Failed to update password.');
        }
    }

    async function handleUpdateEmail() {
        setError(null);
        const em = newEmail.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return setError('Enter a valid e‑mail.');
        const existing = await queryFirst<{ EMAIL: string }>(
        `SELECT EMAIL FROM users WHERE lower(EMAIL) = ? AND ACCOUNTID <> ? LIMIT 1`,
        [em, accountId]
        );
        if (existing) return setError('E‑mail already used by another account.');
        try {
        await runAsync(`UPDATE users SET EMAIL = ? WHERE ACCOUNTID = ?`, [em, accountId]);
        setEmail(em);
        setError('E‑mail updated.');
        setCanEditEmail(false);
        } catch (e) {
        console.error('Update email failed', e);
        setError('Failed to update e‑mail.');
        }
    }

    function handleDeleteAccount() {
    setShowDeleteConfirm(true);
    }


    if (loading) {
        return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator />
            <Text style={{ marginTop: 8 }}>Loading account…</Text>
        </View>
        );
    }

    return (
        <KeyboardAvoidingView style={[FeedbackStyles.screen, { backgroundColor: '#AFA6DD' }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <View style={{ flex: 1, padding: 16, backgroundColor: '#AFA6DD' }}>
            {/* Back */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 50 }}>
                <Pressable
                    onPress={handleBack}
                    style={[FeedbackStyles.item, { width: 67, marginTop: 0, marginRight: 12 }]}
                >
                    <Text style={[FeedbackStyles.itemText, {paddingLeft: 1}]}>back</Text>
                </Pressable>

                <Text style={GeneralStyles.title}> Account Profile</Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                {/* Profile picture / icon selector */}
                <Pressable
                accessibilityRole="button"
                onPress={() => navigation.navigate('ChooseProfileIcon' as never)}
                style={{ width: 120, height: 177, borderWidth: 2, borderColor: '#463B54', borderRadius: 8, justifyContent: 'center', backgroundColor:'#ffffffff' }}
                >
                {profileIconId ? (
                    <Image
                    source={resolveIconSrc(profileIconId)}
                    style={{ width: '100%', height: '92%'}}
                    resizeMode="contain"
                    />
                ) : (
                    <Text style={FeedbackStyles.helper}>Profile picture{"\n"}(tap to choose)</Text>
                )}
                </Pressable>

                {/* Right side form */}
                <View style={{ flex: 1 }}>
                {/* Username row */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                    <TextInput
                    ref={usernameRef}
                    style={[FeedbackStyles.item, { flex: 1, minHeight: 44 }]}
                    value={canEditUsername ? newUsername : '*'.repeat(Math.max(4, (username?.length ?? 0) || 4))}
                    onChangeText={setNewUsername}
                    placeholder={canEditUsername ? 'Username' : ''}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={canEditUsername}
                    />
                    <Pressable
                    accessibilityRole="button"
                    onPress={() => (canEditUsername ? handleUpdateUsername() : openVerify('username'))}
                    style={[FeedbackStyles.item, { marginLeft: 8, width: 50, alignItems: 'center', justifyContent: 'center' }]}
                    >
                    <Ionicons name={canEditUsername ? 'checkmark-outline' : 'create-outline'} size={20} color="#463B54" />
                    </Pressable>
                </View>

                {/* Password row */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                    <TextInput
                    ref={passwordRef}
                    style={[FeedbackStyles.item, { flex: 1, minHeight: 44 }]}
                    value={canEditPassword ? newPassword : '*'.repeat(Math.max(8, pwLen || 8))}
                    onChangeText={setNewPassword}
                    placeholder={canEditPassword ? 'Password' : ''}
                    secureTextEntry={canEditPassword}
                    editable={canEditPassword}
                    />
                    <Pressable
                    accessibilityRole="button"
                    onPress={() => (canEditPassword ? handleUpdatePassword() : openVerify('password'))}
                    style={[FeedbackStyles.item, { marginLeft: 8, width: 50, alignItems: 'center', justifyContent: 'center' }]}
                    >
                    <Ionicons name={canEditPassword ? 'checkmark-outline' : 'create-outline'} size={20} color="#463B54" />
                    </Pressable>
                </View>

                {/* Email row */}
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TextInput
                    ref={emailRef}
                    style={[FeedbackStyles.item, { flex: 1, minHeight: 44 }]}
                    value={newEmail}
                    onChangeText={setNewEmail}
                    placeholder="E‑mail"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    editable={canEditEmail}
                    />
                    <Pressable
                    accessibilityRole="button"
                    onPress={() => (canEditEmail ? handleUpdateEmail() : openVerify('email'))}
                    style={[FeedbackStyles.item, { marginLeft: 8, width: 50, alignItems: 'center', justifyContent: 'center' }]}
                    >
                    <Ionicons name={canEditEmail ? 'checkmark-outline' : 'create-outline'} size={20} color="#463B54" />
                    </Pressable>
                </View>
                </View>
            </View>

            {/* Error / status */}
            {error ? (
                <Text style={[FeedbackStyles.helper, { color: '#d33', marginTop: 8 }]}>{error}</Text>
            ) : null}

            {/* Logout */}
            <Pressable
            accessibilityRole="button"
            onPress={() => logout(navigation)}
            style={[FeedbackStyles.item, { marginTop: 20, paddingHorizontal: 140 }]}
            >
            <Text style={FeedbackStyles.itemText}>Log Out</Text>
            </Pressable>

            {/* Delete account */}
            <Pressable accessibilityRole="button" onPress={handleDeleteAccount} style={[FeedbackStyles.item, { marginTop: 20, paddingHorizontal: 120  }]}> 
                <Text style={FeedbackStyles.itemText}>Delete account</Text>
            </Pressable>

            <Modal visible={showVerify} transparent animationType="fade" onRequestClose={() => setShowVerify(false)}>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ backgroundColor: '#D7D2EE', padding: 16, borderRadius: 8, width: '86%' }}>
                <Text style={[FeedbackStyles.itemText, { marginBottom: 8 }]}>Verify your identity</Text>
                <TextInput
                    style={[FeedbackStyles.item, { marginBottom: 8, minHeight: 44 }]}
                    value={verifyUserNm}
                    onChangeText={setVerifyUserNm}
                    placeholder="Username"
                    autoCapitalize="none"
                    autoCorrect={false}
                />
                <TextInput
                    style={[FeedbackStyles.item, { marginBottom: 8, minHeight: 44 }]}
                    value={verifyPw}
                    onChangeText={setVerifyPw}
                    placeholder="Password"
                    secureTextEntry
                />
                {verifyError ? (<Text style={[FeedbackStyles.helper, { color: '#d33', marginBottom: 8 }]}>{verifyError}</Text>) : null}
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
                    <Pressable onPress={() => setShowVerify(false)} style={[FeedbackStyles.item, { paddingHorizontal: 16 }]}>
                    <Text style={FeedbackStyles.itemText}>Cancel</Text>
                    </Pressable>
                    <Pressable onPress={handleVerifySubmit} style={[FeedbackStyles.item, { paddingHorizontal: 16 }]}>
                    <Text style={FeedbackStyles.itemText}>Verify</Text>
                    </Pressable>
                </View>
                </View>
            </View>
            </Modal>

            <Modal visible={showDeleteConfirm} transparent animationType="fade" onRequestClose={() => setShowDeleteConfirm(false)}>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ backgroundColor: '#bfb9deff', padding: 16, borderRadius: 8, width: '86%' }}>
                <Text style={[FeedbackStyles.itemText, { marginBottom: 8 }]}>Delete account?</Text>
                <Text style={[FeedbackStyles.helper, { marginBottom: 12 }]}>This will permanently remove your account and related data. This action cannot be undone.</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
                    <Pressable onPress={() => setShowDeleteConfirm(false)} style={[FeedbackStyles.item, { paddingHorizontal: 16 }]}>
                    <Text style={FeedbackStyles.itemText}>Cancel</Text>
                    </Pressable>
                    <Pressable onPress={() => deleteAccount(accountId, navigation, setError, setShowDeleteConfirm)} style={[FeedbackStyles.item, { paddingHorizontal: 16, marginRight:60 }]}>
                    <Text style={[FeedbackStyles.itemText]}>Delete</Text>
                    </Pressable>
                </View>
                </View>
            </View>
            </Modal>
            </View>
        </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
    );
}