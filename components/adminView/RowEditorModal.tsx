// components/adminView/RowEditorModal.tsx
import { useTheme } from '../../context/ThemeContext';
// Editable modal for admin Accounts grid — Edit, Save, Delete controls.

import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Modal, ScrollView, Alert } from 'react-native';
import { colors, u } from '../../styles/tokens';
import { AdminTabStyles } from '../../styles/global';

export type RowEditorField = {
  key: string;
  label: string;
  value: string;
  editable?: boolean;
};

type Props = {
  visible: boolean;
  title: string;
  fields: RowEditorField[];
  onClose: () => void;
  onSave?: (fields: RowEditorField[]) => void;
  onDelete?: () => void;
  readOnly?: boolean;
};

export default function RowEditorModal({
  visible,
  title,
  fields: initialFields,
  onClose,
  onSave,
  onDelete,
  readOnly = false,
}: Props) {
  const { colors: theme } = useTheme();
  const [fields, setFields] = useState<RowEditorField[]>(initialFields);
  const [editing, setEditing] = useState(false);

  React.useEffect(() => {
    setFields(initialFields);
    setEditing(false);
  }, [visible, initialFields]);

  const handleDelete = () => {
    Alert.alert('Confirm Delete', 'Permanently delete this record?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => onDelete?.() },
    ]);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[u.absFill, { justifyContent: 'center', alignItems: 'center' }]}>
        <Pressable onPress={onClose} style={[u.absFill, { backgroundColor: colors.overlayScrim }]} />
        <View style={{ width: '84%', maxHeight: '76%', backgroundColor: theme.bgSecondary, borderWidth: 2, borderColor: theme.border, borderRadius: 4, padding: 16 }}>
          <Text style={{ color: theme.textPrimary, fontWeight: '900', fontSize: 16, marginBottom: 12, textAlign: 'center' }}>
            {title}
          </Text>

          <ScrollView style={{ maxHeight: 360 }}>
            {fields.map((f) => (
              <View key={f.key} style={{ marginBottom: 10 }}>
                <Text style={{ color: theme.textPrimary, fontWeight: '700', fontSize: 12, marginBottom: 2 }}>
                  {f.label}
                </Text>
                <TextInput
                  value={f.value}
                  onChangeText={(text) =>
                    setFields((prev) => prev.map((pf) => (pf.key === f.key ? { ...pf, value: text } : pf)))
                  }
                  editable={!readOnly && (editing || f.editable !== false)}
                  style={{
                    borderWidth: 1,
                    borderColor: theme.textPrimary,
                    backgroundColor: readOnly ? theme.accentLight : theme.bgInput,
                    color: theme.textPrimary,
                    padding: 8,
                    fontSize: 14,
                    borderRadius: 2,
                  }}
                />
              </View>
            ))}
          </ScrollView>

          {/* Action buttons */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, gap: 8 }}>
            {!readOnly && (
              <>
                {!editing ? (
                  <Pressable onPress={() => setEditing(true)} style={[AdminTabStyles.panel, { flex: 1 }]}>
                    <Text style={AdminTabStyles.text}>Edit</Text>
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={() => {
                      onSave?.(fields);
                      setEditing(false);
                    }}
                    style={[AdminTabStyles.panel, { flex: 1, backgroundColor: '#2e7d32' }]}
                  >
                    <Text style={[AdminTabStyles.text, { color: colors.white }]}>Save</Text>
                  </Pressable>
                )}
                <Pressable onPress={handleDelete} style={[AdminTabStyles.panel, { flex: 1, backgroundColor: '#c62828' }]}>
                  <Text style={[AdminTabStyles.text, { color: colors.white }]}>Delete</Text>
                </Pressable>
              </>
            )}
            <Pressable onPress={onClose} style={[AdminTabStyles.panel, { flex: 1 }]}>
              <Text style={AdminTabStyles.text}>Close</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
