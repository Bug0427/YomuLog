// screens/admin/AdminReports.tsx
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import GridView, { Column } from '../../components/adminView/GridView';
import { queryAll } from '../../services/feedbackRepo';
import usePagedTable from '../../hooks/admin/UsePagedTable';

type ReportRow = {
  id: string;          // SUBMISSIONID
  username: string;    // USERNM
  category: string;    // MAINCAT
  subcategory: string; // SUBCAT
  rating?: number;     // (not present on reports; kept for future)
};

const columns: Column<ReportRow>[] = [
  { key: 'id', title: 'ID', width: 120, align: 'center' },
  { key: 'username', title: 'Username', width: 160, align: 'center' },
  { key: 'category', title: 'Main Cat', width: 160, align: 'center' },
  { key: 'subcategory', title: 'Sub Cat', width: 160, align: 'center' },
];

export default function AdminReports() {
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const dbRows = await queryAll<{
          SUBMISSIONID: string;
          USERNM: string;
          MAINCAT: string;
          SUBCAT: string;
        }>(
          `SELECT SUBMISSIONID, USERNM, MAINCAT, SUBCAT FROM reports ORDER BY SUBMISSIONID DESC`
        );
        if (!mounted) return;
        const mapped: ReportRow[] = (dbRows || []).map((r) => ({
          id: r.SUBMISSIONID,
          username: r.USERNM,
          category: r.MAINCAT,
          subcategory: r.SUBCAT,
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

  // Client-side paging (sorting preserved by SQL, but we keep a stable key extractor)
  const { rows: pageRows, onEndReached, keyExtractor } = usePagedTable<ReportRow>(rows, {
    pageSize: 50,
    keyExtractor: (r) => r.id,
    // If you want client-side sort instead of SQL, uncomment:
    // sortCompare: (a: ReportRow, b: ReportRow) => b.id.localeCompare(a.id),
  });

  return (
    <View style={[{ flex: 1 }]}>
      <GridView<ReportRow>
        columns={columns}
        data={rows}
        isLoading={loading}
        onEndReached={onEndReached}
        keyExtractor={keyExtractor}
      />
    </View>
  );
}