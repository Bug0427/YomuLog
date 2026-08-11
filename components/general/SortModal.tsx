// components/general/SortModal.tsx
// Reusable sort/order modal — used by SearchScreen, LibraryScreen, and DownloadsScreen.
// Renders a list of sort options in a centered modal overlay with active-state highlighting.

import React from 'react';
import { View, Text, Pressable, Modal, TouchableWithoutFeedback, StyleSheet } from 'react-native';
import { colors } from '../../styles/tokens';
import { useTheme } from '../../context/ThemeContext';

export type SortOption = {
  key: string;
  label: string;
};

export type SortModalProps = {
  visible: boolean;
  title?: string;
  options: SortOption[];
  selectedKey: string;
  onSelect: (key: string) => void;
  onClose: () => void;
};

export default function SortModal({
  visible,
  title = 'Sort Order',
  options,
  selectedKey,
  onSelect,
  onClose,
}: SortModalProps) {
  const { colors: theme } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.container}>
              <Text style={styles.title}>{title}</Text>
              {options.map((opt) => {
                const isSelected = opt.key === selectedKey;
                return (
                  <Pressable
                    key={opt.key}
                    onPress={() => {
                      onSelect(opt.key);
                      onClose();
                    }}
                    style={[
                      styles.option,
                      isSelected && styles.optionSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        isSelected && styles.optionTextSelected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: theme.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: theme.bgCard,
    borderRadius: 12,
    padding: 16,
    width: '80%',
    maxWidth: 320,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.textSecondary,
    marginBottom: 12,
  },
  option: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 4,
    borderRadius: 8,
    backgroundColor: theme.bgCard,
    borderWidth: 1,
    borderColor: theme.border,
  },
  optionSelected: {
    backgroundColor: theme.accentDark,
    borderColor: theme.accentDark,
  },
  optionText: {
    color: theme.textPrimary,
    fontWeight: '500',
    fontSize: 14,
  },
  optionTextSelected: {
    color: colors.white,
    fontWeight: '700',
  },
});
