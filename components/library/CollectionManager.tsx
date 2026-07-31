// components/library/CollectionManager.tsx
// Modal for creating, editing, and managing collections.
// Also allows assigning/removing manga from collections.

import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, Pressable, Modal, ScrollView,
  ActivityIndicator, Alert, StyleSheet, Switch,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { colors, spacing } from '../../styles/tokens';
import {
  getCollections, createCollection, updateCollection, deleteCollection,
  getCollectionsForManga, addMangaToCollection, removeMangaFromCollection,
  type Collection, type CollectionType,
} from '../../services/collectionService';

type Props = {
  visible: boolean;
  mangaId?: string;           // if set, show collection assignment for a specific manga
  mangaTitle?: string;
  onClose: () => void;
};

export default function CollectionManager({ visible, mangaId, mangaTitle, onClose }: Props) {
  const { colors: theme } = useTheme();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<CollectionType>('standard');
  const [memberOf, setMemberOf] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const load = async () => {
    setLoading(true);
    const all = await getCollections();
    setCollections(all);
    if (mangaId) {
      const members = await getCollectionsForManga(mangaId);
      setMemberOf(new Set(members.map(c => c.id)));
    }
    setLoading(false);
  };

  useEffect(() => { if (visible) load(); }, [visible, mangaId]);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    await createCollection(name, newType);
    setNewName('');
    await load();
  };

  const handleToggleMembership = async (colId: string) => {
    if (!mangaId) return;
    if (memberOf.has(colId)) {
      await removeMangaFromCollection(colId, mangaId);
      setMemberOf(prev => { const n = new Set(prev); n.delete(colId); return n; });
    } else {
      await addMangaToCollection(colId, mangaId);
      setMemberOf(prev => new Set(prev).add(colId));
    }
  };

  const handleDelete = (col: Collection) => {
    Alert.alert(
      'Delete Collection',
      `Remove "${col.name}" and all its entries? This won't delete the manga from your library.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => { await deleteCollection(col.id); await load(); } },
      ],
    );
  };

  const handleStartEdit = (col: Collection) => {
    setEditingId(col.id);
    setEditName(col.name);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    await updateCollection(editingId, { name: editName.trim() });
    setEditingId(null);
    await load();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Pressable onPress={onClose} hitSlop={12}>
            <Feather name="x" size={22} color={theme.textPrimary} />
          </Pressable>
          <Text style={[styles.title, { color: theme.textPrimary }]}>
            {mangaId ? `Add to Collection` : 'Manage Collections'}
          </Text>
          <View style={{ width: 22 }} />
        </View>

        {/* Context if assigning manga */}
        {mangaTitle ? (
          <Text style={[styles.context, { color: theme.textSecondary }]}>
            Assigning: <Text style={{ fontWeight: '600', color: theme.textPrimary }}>{mangaTitle}</Text>
          </Text>
        ) : null}

        {/* Create new */}
        <View style={styles.createSection}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>New Collection</Text>
          <View style={styles.createRow}>
            <TextInput
              style={[styles.createInput, { backgroundColor: theme.bgCard, color: theme.textPrimary, borderColor: theme.border }]}
              placeholder="Collection name"
              placeholderTextColor={theme.textMuted}
              value={newName}
              onChangeText={setNewName}
              onSubmitEditing={handleCreate}
            />
            <Pressable
              onPress={() => setNewType(newType === 'standard' ? 'reading_list' : 'standard')}
              style={[styles.typeToggle, { borderColor: theme.border }]}
            >
              <Feather
                name={newType === 'reading_list' ? 'list' : 'folder'}
                size={14}
                color={theme.textSecondary}
              />
              <Text style={[styles.typeLabel, { color: theme.textSecondary }]}>
                {newType === 'reading_list' ? 'List' : 'Folder'}
              </Text>
            </Pressable>
            <Pressable onPress={handleCreate} style={[styles.addBtn, { backgroundColor: theme.accent }]}>
              <Feather name="plus" size={16} color={colors.white} />
            </Pressable>
          </View>
        </View>

        {/* Collections list */}
        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={theme.accent} />
        ) : (
          <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: spacing.p50 }}>
            {collections.length === 0 ? (
              <Text style={[styles.empty, { color: theme.textMuted }]}>
                No collections yet. Create one above!
              </Text>
            ) : (
              collections.map(col => (
                <View
                  key={col.id}
                  style={[styles.colItem, { backgroundColor: theme.bgCard, borderColor: theme.border }]}
                >
                  {editingId === col.id ? (
                    <View style={styles.editRow}>
                      <TextInput
                        style={[styles.editInput, { color: theme.textPrimary, borderColor: theme.border }]}
                        value={editName}
                        onChangeText={setEditName}
                        onSubmitEditing={handleSaveEdit}
                        autoFocus
                      />
                      <Pressable onPress={handleSaveEdit}>
                        <Feather name="check" size={18} color={theme.accent} />
                      </Pressable>
                    </View>
                  ) : (
                    <>
                      <View style={styles.colInfo}>
                        <Feather
                          name={col.type === 'reading_list' ? 'list' : 'folder'}
                          size={16}
                          color={theme.accent}
                        />
                        <Text style={[styles.colName, { color: theme.textPrimary }]}>{col.name}</Text>
                        <Text style={[styles.colCount, { color: theme.textMuted }]}>
                          ({col.mangaIds.length})
                        </Text>
                      </View>
                      <View style={styles.colActions}>
                        {mangaId ? (
                          <Switch
                            value={memberOf.has(col.id)}
                            onValueChange={() => handleToggleMembership(col.id)}
                            trackColor={{ false: theme.border, true: theme.accent + '60' }}
                            thumbColor={memberOf.has(col.id) ? theme.accent : theme.textMuted}
                          />
                        ) : (
                          <>
                            <Pressable onPress={() => handleStartEdit(col)} hitSlop={8}>
                              <Feather name="edit-2" size={15} color={theme.textSecondary} />
                            </Pressable>
                            <Pressable onPress={() => handleDelete(col)} hitSlop={8}>
                              <Feather name="trash-2" size={15} color={theme.error} />
                            </Pressable>
                          </>
                        )}
                      </View>
                    </>
                  )}
                </View>
              ))
            )}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.p14,
    paddingHorizontal: spacing.p16,
    borderBottomWidth: 1,
  },
  title: { fontSize: 17, fontWeight: '600' },
  context: { fontSize: 13, paddingHorizontal: spacing.p16, paddingTop: spacing.p8 },
  createSection: { padding: spacing.p16 },
  sectionLabel: { fontSize: 12, fontWeight: '600', marginBottom: spacing.p8 },
  createRow: { flexDirection: 'row', gap: spacing.p6, alignItems: 'center' },
  createInput: {
    flex: 1,
    paddingVertical: spacing.p8,
    paddingHorizontal: spacing.p12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 13,
  },
  typeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.p3,
    paddingVertical: spacing.p6,
    paddingHorizontal: spacing.p8,
    borderRadius: 8,
    borderWidth: 1,
  },
  typeLabel: { fontSize: 10, fontWeight: '600' },
  addBtn: {
    padding: spacing.p10,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: { flex: 1, paddingHorizontal: spacing.p16 },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 14 },
  colItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.p12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: spacing.p8,
  },
  colInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.p8, flex: 1 },
  colName: { fontSize: 14, fontWeight: '500' },
  colCount: { fontSize: 12 },
  colActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.p12 },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.p8,
    flex: 1,
  },
  editInput: {
    flex: 1,
    borderBottomWidth: 1,
    paddingVertical: spacing.p4,
    fontSize: 14,
  },
});
