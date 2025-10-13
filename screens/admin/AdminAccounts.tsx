// screens/admin/AdminAccounts.tsx
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import GridView, { Column } from '../../components/adminView/GridView';
import { queryAll } from '../../services/feedbackRepo';
import usePagedTable from '../../hooks/admin/UsePagedTable';

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
  { key: 'level', title: 'Lvl', width: 80, align: 'center' },
];

export default function AdminAccounts() {
  const [rows, setRows] = useState<AccountRow[]>([]);
  const [loading, setLoading] = useState(false);

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
    sortCompare: (a: AccountRow, b: AccountRow) => a.username.localeCompare(b.username),
    keyExtractor: (r) => r.id,
  });

  return (
    <View style={[{flex: 1}]}>
      <GridView<AccountRow>
        columns={columns}
        data={rows}
        isLoading={loading}
        onEndReached={onEndReached}
        keyExtractor={keyExtractor}
      />
    </View>
  );
}
