import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard, Platform, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { FeedBackStyles, SubmitButtonStyles } from '../../styles/global';
import { verifyUser, deleteDbFile, queryAll, queryFirst, seedDefaultUsers, initDb } from '../../services/feedbackRepo';


export default function LoginScreen() {
const navigation = useNavigation<any>();
const [username, setUsername] = useState('');
const [password, setPassword] = useState('');
const [errorMsg, setErrorMsg] = useState<string | null>(null);

useEffect(() => {
  // If already logged in and user somehow opens Login, send them to Account
  if ((globalThis as any).currentAccountId) {
    // @ts-ignore
    navigation.replace?.('UserAccount');
  }
}, []);

const onSubmit = async () => {
    const id = username.trim();
    const pwd = password;

    // quick empty check
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
      (globalThis as any).currentAccountId = row.ACCOUNTID;
      (globalThis as any).currentUsername = row.USERNM;

      // Return to previous screen if possible; otherwise go somewhere safe
      if (typeof navigation.canGoBack === 'function' && navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('Settings' as never);
      }
    } catch (e) {
      console.error('Login failed', e);
      setErrorMsg('Login failed.');
    }
};

const exit = () => navigation.goBack();

return (
    <KeyboardAvoidingView
    style={FeedBackStyles.screen}
    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={{ flex: 1, paddingHorizontal: 20 }}>
        {/* App title */}
        <View style={{ alignItems: 'center', marginTop: 60, marginBottom: 12 }}>
            <Text style={[FeedBackStyles.itemText, { fontSize: 36 }]}>YomuLog</Text>
        </View>

        <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 40, flexGrow: 1 }}
        >
            {/* Card */}
            <View style={{
            borderWidth: 1,
            borderColor: '#ccc',
            borderRadius: 8,
            backgroundColor: 'transparent',
            overflow: 'hidden',
            marginHorizontal: 8,
            }}>
            {/* Card header */}
            <View style={{ paddingVertical: 12, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#ddd' }}>
                <Text style={[FeedBackStyles.itemText, { fontSize: 20 }]}>Login</Text>
            </View>

            {/* Card body */}
            <View style={{ padding: 16, alignItems: 'center' }}>
                {errorMsg ? (
                <Text style={[FeedBackStyles.helper, { color: '#d33', marginBottom: 8 }]}>
                    {errorMsg}
                </Text>
                ) : null}
                {/* Username / Email */}
                <TextInput
                style={[FeedBackStyles.item, { width: '90%', minHeight: 44 }]}
                value={username}
                onChangeText={setUsername}
                placeholder="username"
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
                placeholder="password"
                placeholderTextColor="#999"
                secureTextEntry
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
                <Text style={FeedBackStyles.itemText}>Submit</Text>
                </Pressable>


                <Pressable
                accessibilityRole="button"
                onPress={() => navigation.navigate('ForgotCredentials')}
                style={{ marginTop: 12 }}
                >
                <Text style={FeedBackStyles.helper}>Forgot username or password?</Text>
                </Pressable>

                {/* Create account link */}
                <Pressable
                  accessibilityRole="button"
                  onPress={() => navigation.replace('CreateAccount')}
                  style={{ marginTop: 2 }}
                >
                    <Text style={FeedBackStyles.helper}>Create account →</Text>
                </Pressable>
            </View>
            </View>

        {/* Exit button at bottom */}
        <View style={{ alignItems: 'center', marginVertical: 16 }}>
            <Pressable accessibilityRole="button" onPress={exit} style={[SubmitButtonStyles.item, { width: 120, marginBottom: 300 }]}>
            <Text style={FeedBackStyles.itemText}>Exit</Text>
            </Pressable>
        </View>
        </ScrollView>
        </View>
    </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
    
);
}