// screens/admin/AdminAccounts.tsx
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import GridView, { Column } from '../../components/adminView/GridView';
import { queryAll } from '../../services/feedbackRepo';
import usePagedTable from '../../hooks/admin/UsePagedTable';
import AdminSearchBar from '../../components/adminView/searchbar';

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

export default function AdminAccounts() {
  const [rows, setRows] = useState<AccountRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [query, setQuery] = useState('');
  const [selectedFields, setSelectedFields] = useState<string[]>(ACCOUNT_FIELDS.map(f => f.key));
  const [priority, setPriority] = useState<string>('');
  const [activeField, setActiveField] = useState<string>('all');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const dbRows = await queryAll<{
          ACCOUNTID: string;
          USERNM: string;
          EMAIL: string;
          PSWD: string;
          SECURITYLVL: number;
        }>(
          `SELECT ACCOUNTID, USERNM, EMAIL, PSWD, SECURITYLVL FROM users ORDER BY USERNM`
        );
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
    return () => {
      mounted = false;
    };
  }, []);

  const { rows: pageRows, onEndReached, keyExtractor } = usePagedTable(rows, {
    pageSize: 50,
    filter: (r: AccountRow) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      const keys = activeField === 'all' ? selectedFields : [activeField];
      for (const key of keys) {
        const v = String((r as any)[key] ?? '').toLowerCase();
        if (v.includes(q)) return true;
      }
      return false;
    },
    sortCompare: (a: AccountRow, b: AccountRow) => {
      if (!priority) return 0; // no organizer selected: keep original order
      const k = priority as keyof AccountRow;
      const av = (a[k] ?? '') as any;
      const bv = (b[k] ?? '') as any;
      if (typeof av === 'number' && typeof bv === 'number') return av - bv;
      return String(av).localeCompare(String(bv), undefined, { numeric: true });
    },
    keyExtractor: (r) => r.id,
  });

  let visibleColumns: Column<AccountRow>[] = columns.filter(c => selectedFields.includes(String(c.key)));
  if (visibleColumns.length === 0) visibleColumns = columns; // fallback so user can recover

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
        onSubmit={() => { /* client-side filtering already reacts to query; keep for future server-side */ }}
      />

      <GridView<AccountRow>
        columns={visibleColumns}
        data={pageRows}
        priority={priority}
        isLoading={loading}
        onEndReached={onEndReached}
        keyExtractor={keyExtractor}
      />
    </View>
  );
}
