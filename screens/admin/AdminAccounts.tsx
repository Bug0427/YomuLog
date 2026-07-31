// screens/admin/AdminAccounts.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { View, Pressable, Text, Alert } from 'react-native';
import GridView, { Column } from '../../components/adminView/GridView';
import { queryAll, runAsync } from '../../services/feedbackRepo';
import usePagedTable from '../../hooks/admin/UsePagedTable';
import AdminSearchBar from '../../components/adminView/searchbar';
import CreateUserModal, { CreateUserPayload } from '../../components/adminView/createUser';
import RowEditorModal, { RowEditorField } from '../../components/adminView/RowEditorModal';
import { AdminTabStyles } from '../../styles/global';
import { colors } from '../../styles/tokens';

type AccountRow = {
  id: string;
  username: string;
  password: string;
  email: string;
  level: number;
};

const columns: Column<AccountRow>[] = [
  { key: 'id', title: 'ID', width: 100, align: 'center' },
  { key: 'username', title: 'Username', width: 160, align: 'center' },
  { key: 'password', title: 'Password', width: 160, align: 'center' },
  { key: 'email', title: 'E-mail', width: 200, align: 'center' },
  { key: 'level', title: 'SecurityLvl', width: 80, align: 'center' },
];

const ACCOUNT_FIELDS = [
  { key: 'id', label: 'ID' },
  { key: 'username', label: 'userNm' },
  { key: 'password', label: 'PSWD' },
  { key: 'email', label: 'E-M' },
  { key: 'level', label: 'Lvl' },
] as const;

function toEditorFields(row: AccountRow): RowEditorField[] {
  return [
    { key: 'id', label: 'ID', value: row.id, editable: false },
    { key: 'username', label: 'Username', value: row.username },
    { key: 'password', label: 'Password', value: row.password },
    { key: 'email', label: 'Email', value: row.email },
    { key: 'level', label: 'Security Level', value: String(row.level) },
  ];
}

export default function AdminAccounts() {
  const [rows, setRows] = useState<AccountRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [query, setQuery] = useState('');
  const [selectedFields, setSelectedFields] = useState<string[]>(ACCOUNT_FIELDS.map(f => f.key));
  const [priority, setPriority] = useState('');
  const [activeField, setActiveField] = useState('all');
  const [showAdd, setShowAdd] = useState(false);

  // ── Row editor modal ───────────────────────────────────────────────
  const [editorVisible, setEditorVisible] = useState(false);
  const [editorFields, setEditorFields] = useState<RowEditorField[]>([]);
  const [editingRow, setEditingRow] = useState<AccountRow | null>(null);

  // ── Bulk selection ─────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const dbRows = await queryAll<{
          ACCOUNTID: string; USERNM: string; EMAIL: string; PSWD: string; SECURITYLVL: number;
        }>(`SELECT ACCOUNTID, USERNM, EMAIL, PSWD, SECURITYLVL FROM users ORDER BY USERNM`);
        if (!mounted) return;
        const mapped: AccountRow[] = (dbRows || []).map((r) => ({
          id: r.ACCOUNTID,
          username: r.USERNM,
          password: r.PSWD,
          email: r.EMAIL,
          level: r.SECURITYLVL,
        }));
        setRows(mapped);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const reloadRows = useCallback(async () => {
    const dbRows = await queryAll<{
      ACCOUNTID: string; USERNM: string; EMAIL: string; PSWD: string; SECURITYLVL: number;
    }>(`SELECT ACCOUNTID, USERNM, EMAIL, PSWD, SECURITYLVL FROM users ORDER BY USERNM`);
    setRows((dbRows || []).map((r) => ({
      id: r.ACCOUNTID, username: r.USERNM, password: r.PSWD, email: r.EMAIL, level: r.SECURITYLVL,
    })));
  }, []);

  const handleUserSaved = (p: CreateUserPayload) => {
    setRows(prev => [{ id: p.accountId, username: p.userNm, password: p.pswd, email: p.email, level: p.securityLvl }, ...prev]);
  };

  // ── Row long-press → editor modal ──────────────────────────────────
  const handleRowLongPress = useCallback((row: AccountRow) => {
    setEditingRow(row);
    setEditorFields(toEditorFields(row));
    setEditorVisible(true);
  }, []);

  // ── Save edited row ────────────────────────────────────────────────
  const handleSaveRow = useCallback(async (fields: RowEditorField[]) => {
    if (!editingRow) return;
    const vals: Record<string, string> = {};
    fields.forEach(f => { vals[f.key] = f.value; });
    try {
      await runAsync(
        `UPDATE users SET USERNM = ?, EMAIL = ?, PSWD = ?, SECURITYLVL = ? WHERE ACCOUNTID = ?`,
        [vals.username, vals.email, vals.password, Number(vals.level), vals.id]
      );
      setEditorVisible(false);
      await reloadRows();
    } catch (e) {
      console.error('Failed to save row:', e);
      Alert.alert('Error', 'Failed to save changes.');
    }
  }, [editingRow, reloadRows]);

  // ── Delete single row ─────────────────────────────────────────────
  const handleDeleteRow = useCallback(async () => {
    if (!editingRow) return;
    try {
      await runAsync(`DELETE FROM users WHERE ACCOUNTID = ?`, [editingRow.id]);
      setEditorVisible(false);
      await reloadRows();
    } catch (e) {
      console.error('Failed to delete row:', e);
      Alert.alert('Error', 'Failed to delete record.');
    }
  }, [editingRow, reloadRows]);

  // ── Bulk delete ──────────────────────────────────────────────────
  const handleBulkDelete = useCallback(() => {
    if (selectedIds.size === 0) return;
    Alert.alert('Confirm Bulk Delete', `Permanently delete ${selectedIds.size} selected records?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: `Delete ${selectedIds.size}`,
        style: 'destructive',
        onPress: async () => {
          const ids = Array.from(selectedIds);
          const placeholders = ids.map(() => '?').join(',');
          try {
            await runAsync(`DELETE FROM users WHERE ACCOUNTID IN (${placeholders})`, ids);
            setSelectedIds(new Set());
            await reloadRows();
          } catch (e) {
            console.error('Bulk delete failed:', e);
          }
        },
      },
    ]);
  }, [selectedIds, reloadRows]);

  const handleToggleSelect = useCallback((item: AccountRow) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(item.id)) next.delete(item.id); else next.add(item.id);
      return next;
    });
  }, []);

  const { rows: pageRows, onEndReached, keyExtractor } = usePagedTable(rows, {
    pageSize: 50,
    filter: (r: AccountRow) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      const keys = activeField === 'all' ? selectedFields : [activeField];
      for (const key of keys) {
        if (String((r as any)[key] ?? '').toLowerCase().includes(q)) return true;
      }
      return false;
    },
    sortCompare: (a: AccountRow, b: AccountRow) => {
      if (!priority) return 0;
      const k = priority as keyof AccountRow;
      const av = (a[k] ?? '') as any;
      const bv = (b[k] ?? '') as any;
      if (typeof av === 'number' && typeof bv === 'number') return av - bv;
      return String(av).localeCompare(String(bv), undefined, { numeric: true });
    },
    keyExtractor: (r) => r.id,
  });

  let visibleColumns: Column<AccountRow>[] = columns.filter(c => selectedFields.includes(String(c.key)));
  if (visibleColumns.length === 0) visibleColumns = columns;

  return (
    <View style={[{ flex: 1 }]}>
      <AdminSearchBar
        fields={ACCOUNT_FIELDS as any}
        selectedFields={selectedFields}
        onChangeFields={setSelectedFields}
        priority={priority}
        onChangePriority={setPriority}
        query={query}
        onChangeQuery={setQuery}
        activeField={activeField}
        onChangeActiveField={setActiveField}
        onSubmit={() => {}}
      />

      <Pressable onPress={() => setShowAdd(true)} style={({ pressed }) => [AdminTabStyles.panel, pressed && AdminTabStyles.addBtnPressed]}>
        <Text style={[AdminTabStyles.text, { paddingBottom: 2 }]}>Add New User</Text>
      </Pressable>

      {/* Bulk delete floating button */}
      {selectedIds.size > 0 && (
        <Pressable
          onPress={handleBulkDelete}
          style={{
            position: 'absolute', bottom: 20, right: 20, zIndex: 100,
            backgroundColor: colors.error, paddingHorizontal: 18, paddingVertical: 12,
            borderRadius: 8, elevation: 5,
          }}
        >
          <Text style={{ color: colors.white, fontWeight: '800', fontSize: 14 }}>
            Delete Selected ({selectedIds.size})
          </Text>
        </Pressable>
      )}

      <GridView<AccountRow>
        columns={visibleColumns}
        data={pageRows}
        priority={priority}
        isLoading={loading}
        onEndReached={onEndReached}
        keyExtractor={keyExtractor}
        enableBulkSelect
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
        onRowLongPress={handleRowLongPress}
      />

      <CreateUserModal
        visible={showAdd}
        onBack={() => setShowAdd(false)}
        onSaved={handleUserSaved}
        title="Add User"
      />

      <RowEditorModal
        visible={editorVisible}
        title="Edit Account"
        fields={editorFields}
        onClose={() => setEditorVisible(false)}
        onSave={handleSaveRow}
        onDelete={handleDeleteRow}
        readOnly={false}
      />
    </View>
  );
}
