import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { changeLoginData } from '../../data/SettingsButtonActions/changeLoginData';
import { ChangeLoginStyles } from '../../styles/global';


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
        <View style={ChangeLoginStyles.bannerWrap} pointerEvents="none">
          <View style={ChangeLoginStyles.bannerBox}>
            <Text style={ChangeLoginStyles.bannerText}>Login info updated.</Text>
          </View>
        </View>
      )}
      <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
        <KeyboardAvoidingView style={ChangeLoginStyles.kbdWrap} behavior={Platform.select({ ios: 'padding', android: undefined })}>
          <View style={ChangeLoginStyles.overlay}>
            <View style={ChangeLoginStyles.card}>
              <Text style={ChangeLoginStyles.title}>Change username / password</Text>

              {error ? <Text style={ChangeLoginStyles.errorText}>{error}</Text> : null}
              {success ? <Text style={ChangeLoginStyles.successText}>{success}</Text> : null}

              <View style={ChangeLoginStyles.typeBox}>
                <TextInput
                  placeholder="Username"
                  placeholderTextColor="#543C27"
                  value={newUsername}
                  onChangeText={setNewUsername}
                  autoCapitalize="none"
                  style={ChangeLoginStyles.typed}
                />
              </View>

              <View style={ChangeLoginStyles.typeBox}>
                <TextInput
                  placeholder="Password"
                  placeholderTextColor="#543C27"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                  style={ChangeLoginStyles.typed}
                />
              </View>

              <View style={ChangeLoginStyles.typeBox}>
                <TextInput
                  placeholder="Confirm password"
                  placeholderTextColor="#543C27"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  style={ChangeLoginStyles.typed}
                />
              </View>

              <Text style={ChangeLoginStyles.helpText}>
                Password must be 8+ chars and include 1 uppercase, 1 lowercase, 1 number, and 1 special character.
              </Text>

              <View style={ChangeLoginStyles.actionsRow}>
                <Pressable onPress={handleClose} style={ChangeLoginStyles.button}>
                  <Text style={ChangeLoginStyles.text}>Cancel</Text>
                </Pressable>
                <Pressable onPress={handleSubmit} disabled={submitting} style={ChangeLoginStyles.button}>
                  {submitting ? <ActivityIndicator color="#fff" /> : <Text style={ChangeLoginStyles.text}>Submit</Text>}
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