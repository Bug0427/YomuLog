import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { CreateNewUser, SecurityLevel } from '../../services/feedbackRepo';
import { AdminSearchBarStyles } from '../../styles/global';

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

/**
 * CreateUser
 * A self-contained popup for adding a new user using built-in React Native Modal.
 * - Shows Back | Title | Save header
 * - Fields: Username, Password, Email, Security Level (1/2/3)
 * - Generates ACCOUNTID on save; by default calls CreateUser(),
 *   or forwards payload to onSaved if provided.
 */
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
      <View style={styles.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.card}>
          <View style={styles.headerRow}>
            <Pressable onPress={onBack} style={styles.smallBtn} disabled={saving}>
              <Text style={styles.smallBtnText}>Back</Text>
            </Pressable>
            <Text style={[AdminSearchBarStyles.checkText, {color:'#bfb9deff'}]}>{title}</Text>
            <Pressable onPress={handleSave} style={[styles.smallBtn, saving && styles.smallBtnDisabled]} disabled={saving}>
              <Text style={styles.smallBtnText}>Save</Text>
            </Pressable>
          </View>

          <View style={styles.inputBlock}>
            <Text style={styles.inputLabel}>Username</Text>
            <TextInput
              value={userNm}
              onChangeText={setUserNm}
              placeholder="username"
              placeholderTextColor="#bfb9deff"
              style={styles.input}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputBlock}>
            <Text style={styles.inputLabel}>Password</Text>
            <TextInput
              value={pswd}
              onChangeText={setPswd}
              placeholder="password"
              placeholderTextColor="#bfb9deff"
              style={styles.input}
              secureTextEntry
            />
          </View>

          <View style={styles.inputBlock}>
            <Text style={styles.inputLabel}>E-mail</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="email@example.com"
              placeholderTextColor="#bfb9deff"
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputBlock}>
            <Text style={styles.inputLabel}>Security Level (1/2/3)</Text>
            <View style={styles.levelRow}>
              {[SecurityLevel.Admin, SecurityLevel.Paid, SecurityLevel.Regular].map((l) => (
                <Pressable
                  key={l}
                  onPress={() => setLevel(l)}
                  style={[styles.levelChip, level === l && styles.levelChipActive]}
                  disabled={saving}
                >
                  <Text style={styles.levelChipText}>{l}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 560,
    borderWidth: 1,
    borderColor: '#AFA6DD',
    backgroundColor: '#412d5cff',
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom:15,
    borderBottomWidth: 2,
    borderBottomColor:'#AFA6DD',
  },
  smallBtn: {
    borderWidth: 1,
    borderColor: '#AFA6DD',
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  smallBtnDisabled: {
    opacity: 0.6,
  },
  smallBtnText: {
    color: '#bfb9deff',
    fontWeight: '600',
  },
  inputBlock: { marginTop: 10 },
  inputLabel: { 
    color: '#bfb9deff', 
    marginBottom: 6, 
    fontSize: 12 
  },
  input: {
    borderWidth: 1,
    borderColor: '#AFA6DD',
    paddingVertical: 10,
    paddingHorizontal: 12,
    color: '#bfb9deff',
  },
  levelRow: { 
    flexDirection: 'row', 
    gap: 8 
  },
  levelChip: {
    borderWidth: 1,
    borderColor: '#AFA6DD',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 15,
  },
  levelChipActive: { 
    backgroundColor: '#AFA6DD', 
    color: '#412d5cff', 
    fontWeight: '600' 
  },
  levelChipText: { 
    color: '#bfb9deff', 
    fontWeight: '600' 
  },
});