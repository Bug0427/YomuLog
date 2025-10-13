import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { changeLoginData } from '../../data/SettingsButtonActions/changeLoginData';
import { changeLoginStyle } from '../../styles/global';


export type ChangeLoginModalProps = {
  visible: boolean;
  onClose: () => void;
  accountId?: string;
  navigation?: any;
};

const ChangeLoginModal: React.FC<ChangeLoginModalProps> = ({ visible, onClose, accountId, navigation }) => {
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  const resetForm = () => {
    setNewUsername('');
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
    setSuccess(null);
    setSubmitting(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  useEffect(() => {
    if (visible) {
      resetForm();
    }
  }, [visible]);
  const validatePassword = (pw: string) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(pw);

  const handleSubmit = async () => {
    const acctId = accountId || (globalThis as any).currentAccountId;
    if (!acctId) {
      setError('No active account. Please log in again.');
      return;
    }
    if (!newUsername.trim()) {
      setError('Username cannot be empty.');
      return;
    }
    if (!validatePassword(newPassword)) {
      setError('Password must be 8+ chars, include upper/lower/number/special.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const ok = await changeLoginData({ accountId: String(acctId), newUsername: newUsername.trim(), newPassword });

    setSubmitting(false);
    if (!ok) {
      setError('Failed to update login info (username may already exist).');
      return;
    }
    // Refresh in-memory session
    (globalThis as any).currentUsername = newUsername.trim();
    (globalThis as any).currentPassword = newPassword;

    // Run current processes
    resetForm();
    onClose();

    // Additional process: show a 2s in-app success banner
    setShowBanner(true);
    setTimeout(() => setShowBanner(false), 2000);
  };

  return (
    <>
      {showBanner && (
        <View style={{ position: 'absolute', top: 150, left: 0, right: 0, alignItems: 'center', zIndex: 1000 }} pointerEvents="none">
          <View style={{ backgroundColor: '#D7D2EE', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: '#463B54' }}>
            <Text style={{ color: '#463B54', fontSize: 14 }}>Login info updated.</Text>
          </View>
        </View>
      )}
      <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.select({ ios: 'padding', android: undefined })}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ width: '90%', backgroundColor: '#8c84c8', padding: 16, borderWidth: 2, borderColor: '#333' }}>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600', marginBottom: 12 }}>Change username / password</Text>

              {error ? <Text style={{ color: '#ff6b6b', marginBottom: 8 }}>{error}</Text> : null}
              {success ? <Text style={{ color: '#7bd88f', marginBottom: 8 }}>{success}</Text> : null}

              <View style={changeLoginStyle.typeBox}>
                <TextInput
                  placeholder="Username"
                  placeholderTextColor="#543C27"
                  value={newUsername}
                  onChangeText={setNewUsername}
                  autoCapitalize="none"
                  style={changeLoginStyle.typed}
                />
              </View>

              <View style={changeLoginStyle.typeBox}>
                <TextInput
                  placeholder="Password"
                  placeholderTextColor="#543C27"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                  style={changeLoginStyle.typed}
                />
              </View>

              <View style={changeLoginStyle.typeBox}>
                <TextInput
                  placeholder="Confirm password"
                  placeholderTextColor="#543C27"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  style={changeLoginStyle.typed}
                />
              </View>

              <Text style={{ color: '#fff', fontSize: 12, marginBottom: 12 }}>
                Password must be 8+ chars and include 1 uppercase, 1 lowercase, 1 number, and 1 special character.
              </Text>

              <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                <Pressable onPress={handleClose} style={changeLoginStyle.button}>
                  <Text style={changeLoginStyle.text}>Cancel</Text>
                </Pressable>
                <Pressable onPress={handleSubmit} disabled={submitting} style={changeLoginStyle.button}>
                  {submitting ? <ActivityIndicator color="#fff" /> : <Text style={changeLoginStyle.text}>Submit</Text>}
                </Pressable>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
};

export default ChangeLoginModal;