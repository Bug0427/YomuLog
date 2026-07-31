// components/library/TagEditor.tsx
// Inline tag editor for assigning custom tags to a manga.
// Shows existing tags as removable chips, with an input to add new ones.

import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { colors, spacing } from '../../styles/tokens';

type Props = {
  mangaId: string;
  tags: string[];
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
};

export default function TagEditor({ mangaId, tags, onAddTag, onRemoveTag }: Props) {
  const { colors: theme } = useTheme();
  const [input, setInput] = useState('');

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    onAddTag(trimmed);
    setInput('');
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.textSecondary }]}>Tags</Text>
      <View style={styles.chipsRow}>
        {tags.map(tag => (
          <View
            key={tag}
            style={[styles.chip, { backgroundColor: theme.accent + '18', borderColor: theme.accent + '40' }]}
          >
            <Text style={[styles.chipText, { color: theme.accent }]}>{tag}</Text>
            <Pressable onPress={() => onRemoveTag(tag)} hitSlop={8}>
              <Feather name="x" size={12} color={theme.accent} />
            </Pressable>
          </View>
        ))}
      </View>
      <View style={[styles.inputRow, { borderColor: theme.border, backgroundColor: theme.bgCard }]}>
        <TextInput
          style={[styles.input, { color: theme.textPrimary }]}
          placeholder="Add tag..."
          placeholderTextColor={theme.textMuted}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={handleSubmit}
          returnKeyType="done"
        />
        <Pressable onPress={handleSubmit} style={[styles.addBtn, { backgroundColor: theme.accent }]}>
          <Feather name="plus" size={16} color={colors.white} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.p12,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: spacing.p6,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.p6,
    marginBottom: spacing.p8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.p4,
    paddingVertical: spacing.p3,
    paddingHorizontal: spacing.p8,
    borderRadius: 12,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '500',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    paddingVertical: spacing.p8,
    paddingHorizontal: spacing.p12,
    fontSize: 13,
  },
  addBtn: {
    padding: spacing.p10,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
