import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { CreateNewUser, SecurityLevel } from '../../services/feedbackRepo';
import { AdminSearchBarStyles } from '../../styles/global';
import { CreateUserStyles } from '../../styles/IndependentStyles/CreateUserStyles';
import { colors } from '../../styles/tokens';

export type CreateUserPayload = {
  accountId: string;
  userNm: string;
  email: string;
  pswd: string;
  securityLvl: SecurityLevel;
};

type Props = {
  visible: boolean;
  onBack: () => void; // Back/Close handler
  // Optional: If provided, we call this instead of directly inserting.
  onSaved?: (payload: CreateUserPayload) => void | Promise<void>;
  // Optional label overrides
  title?: string;
};

export default function CreateUser({ visible, onBack, onSaved, title = 'Add User' }: Props) {
  const [userNm, setUserNm] = useState('');
  const [pswd, setPswd] = useState('');
  const [email, setEmail] = useState('');
  const [level, setLevel] = useState<SecurityLevel>(SecurityLevel.Regular);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setUserNm('');
    setPswd('');
    setEmail('');
    setLevel(SecurityLevel.Regular);
  };

  const handleSave = async () => {
    if (saving) return;
    const u = userNm.trim();
    const e = email.trim();
    const p = pswd;
    if (!u || !e || !p) {
      Alert.alert('Missing info', 'Please fill username, email, and password.');
      return;
    }
    if (![SecurityLevel.Admin, SecurityLevel.Paid, SecurityLevel.Regular].includes(level)) {
      Alert.alert('Invalid level', 'Security level must be 1 (Admin), 2 (Paid), or 3 (Regular).');
      return;
    }

    setSaving(true);
    try {
      const accountId = await CreateNewUser({ userNm: u, email: e, pswd: p, securityLvl: level });
      if (onSaved) {
        const payload: CreateUserPayload = { accountId, userNm: u, email: e, pswd: p, securityLvl: level };
        await onSaved(payload);
      }

      reset();
      onBack();
    } catch (err: any) {
      Alert.alert('Create failed', String(err?.message || err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={CreateUserStyles.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={CreateUserStyles.card}>
          <View style={CreateUserStyles.headerRow}>
            <Pressable onPress={onBack} style={CreateUserStyles.smallBtn} disabled={saving}>
              <Text style={CreateUserStyles.smallBtnText}>Back</Text>
            </Pressable>
            <Text style={[AdminSearchBarStyles.checkText, CreateUserStyles.headerTitleAlt]}>{title}</Text>
            <Pressable onPress={handleSave} style={[CreateUserStyles.smallBtn, saving && CreateUserStyles.smallBtnDisabled]} disabled={saving}>
              <Text style={CreateUserStyles.smallBtnText}>Save</Text>
            </Pressable>
          </View>

          <View style={CreateUserStyles.inputBlock}>
            <Text style={CreateUserStyles.inputLabel}>Username</Text>
            <TextInput
              value={userNm}
              onChangeText={setUserNm}
              placeholder="username"
              placeholderTextColor={colors.paleLavender}
              style={CreateUserStyles.input}
              autoCapitalize="none"
            />
          </View>

          <View style={CreateUserStyles.inputBlock}>
            <Text style={CreateUserStyles.inputLabel}>Password</Text>
            <TextInput
              value={pswd}
              onChangeText={setPswd}
              placeholder="password"
              placeholderTextColor={colors.paleLavender}
              style={CreateUserStyles.input}
              secureTextEntry
            />
          </View>

          <View style={CreateUserStyles.inputBlock}>
            <Text style={CreateUserStyles.inputLabel}>E-mail</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="email@example.com"
              placeholderTextColor={colors.paleLavender}
              style={CreateUserStyles.input}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={CreateUserStyles.inputBlock}>
            <Text style={CreateUserStyles.inputLabel}>Security Level (1/2/3)</Text>
            <View style={CreateUserStyles.levelRow}>
              {[SecurityLevel.Admin, SecurityLevel.Paid, SecurityLevel.Regular].map((l) => (
                <Pressable
                  key={l}
                  onPress={() => setLevel(l)}
                  style={[CreateUserStyles.levelChip, level === l && CreateUserStyles.levelChipActive]}
                  disabled={saving}
                >
                  <Text style={CreateUserStyles.levelChipText}>{l}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}