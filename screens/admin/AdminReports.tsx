// screens/admin/AdminReports.tsx
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import GridView, { Column } from '../../components/adminView/GridView';
import AdminSearchBar from '../../components/adminView/searchbar';
import { queryAll, runAsync } from '../../services/feedbackRepo';
import usePagedTable from '../../hooks/admin/UsePagedTable';
import RowEditorModal, { RowEditorField } from '../../components/adminView/RowEditorModal';
import { AdminSearchBarStyles } from '../../styles/global';
import { colors } from '../../styles/tokens';
import { useTheme } from '../../context/ThemeContext';

type CategoryType = typeof CATEGORY_OPTIONS[number];
const CATEGORY_OPTIONS = ['Reported Issues', 'Reviews', 'Ratings'] as const;

type ReportRow = {
  sid?: string;
  id?: string;
  username: string;
  category?: string;
  subcategory?: string;
  rating?: number;
  comments?: string;
};

function toEditorFields(row: ReportRow): RowEditorField[] {
  const result: RowEditorField[] = [];
  if (row.sid) result.push({ key: 'sid', label: 'SID', value: row.sid, editable: false });
  if (row.id) result.push({ key: 'id', label: 'ID', value: row.id, editable: false });
  if (row.category) result.push({ key: 'category', label: 'Category', value: row.category, editable: false });
  if (row.subcategory) result.push({ key: 'subcategory', label: 'Sub Category', value: row.subcategory, editable: false });
  if (row.rating !== undefined) result.push({ key: 'rating', label: 'Rating', value: String(row.rating), editable: false });
  if (row.comments) result.push({ key: 'comments', label: 'Comments', value: row.comments, editable: false });
  return result;
}

export default function AdminReports() {
  const { colors: theme } = useTheme();
  const [category, setCategory] = useState<CategoryType | null>(null);
  const [catOpen, setCatOpen] = useState(false);
  const [catValue, setCatValue] = useState<CategoryType | null>(null);
  const [catItems, setCatItems] = useState(
    CATEGORY_OPTIONS.map((label) => ({ label, value: label as CategoryType }))
  );

  useEffect(() => { setCategory(catValue); }, [catValue]);
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [query, setQuery] = useState('');
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [priority, setPriority] = useState<string>('');
  const [activeField, setActiveField] = useState<string>('all');

  // ── View-only modal ────────────────────────────────────────────────
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerFields, setViewerFields] = useState<RowEditorField[]>([]);

  // ── Bulk selection ─────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fields = useMemo(() => {
    if (category === 'Reported Issues') {
      return [
        { key: 'sid', label: 'SID' },
        { key: 'id', label: 'ID' },
        { key: 'category', label: 'Main Cat' },
        { key: 'subcategory', label: 'Sub Cat' },
      ];
    }
    if (category === 'Reviews') {
      return [{ key: 'sid', label: 'SID' }, { key: 'id', label: 'ID' }];
    }
    if (category === 'Ratings') {
      return [{ key: 'sid', label: 'SID' }, { key: 'id', label: 'ID' }, { key: 'rating', label: 'Rating' }];
    }
    return [{ key: 'sid', label: 'SID' }, { key: 'id', label: 'ID' }];
  }, [category]);

  useEffect(() => {
    const allKeys = fields.map(f => f.key);
    setSelectedFields(allKeys);
    if (!allKeys.includes(priority)) setPriority('');
  }, [category, fields]);

  const [columns, setColumns] = useState<Column<ReportRow>[]>([]);

  useEffect(() => {
    if (category === 'Reported Issues') {
      setColumns([
        { key: 'sid', title: 'SID', width: 100, align: 'center' },
        { key: 'id', title: 'ID', width: 120, align: 'center' },
        { key: 'category', title: 'Main Cat', width: 160, align: 'center' },
        { key: 'subcategory', title: 'Sub Cat', width: 160, align: 'center' },
      ]);
    } else if (category === 'Reviews') {
      setColumns([
        { key: 'sid', title: 'SID', width: 100, align: 'center' },
        { key: 'id', title: 'ID', width: 120, align: 'center' },
      ]);
    } else if (category === 'Ratings') {
      setColumns([
        { key: 'sid', title: 'SID', width: 100, align: 'center' },
        { key: 'id', title: 'ID', width: 120, align: 'center' },
        { key: 'rating', title: 'Rating', width: 120, align: 'center' },
      ]);
    } else {
      setColumns([]);
    }
  }, [category]);

  // ── Data fetching ──────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (category === 'Reported Issues') {
        const dbRows = await queryAll<{ SID: string; ACCOUNTID?: string; MAINCAT: string; SUBCAT: string; COMMENTS?: string }>(
          `SELECT SID, ACCOUNTID, MAINCAT, SUBCAT, COMMENTS FROM reports ORDER BY SID DESC`
        );
        setRows((dbRows || []).map((r: any) => ({
          sid: r.SID, id: r.ACCOUNTID ?? '', username: '', category: r.MAINCAT, subcategory: r.SUBCAT, comments: r.COMMENTS ?? '',
        })));
      } else if (category === 'Reviews') {
        const dbRows = await queryAll<{ SID: string; ACCOUNTID?: string; COMMENTS?: string }>(
          `SELECT SID, ACCOUNTID, COMMENTS FROM comments ORDER BY SID DESC`
        );
        setRows((dbRows || []).map((r: any) => ({
          sid: r.SID, id: r.ACCOUNTID ?? '', username: '', comments: r.COMMENTS ?? '',
        })));
      } else if (category === 'Ratings') {
        const dbRows = await queryAll<{ SID: string; ACCOUNTID?: string; RATING: number }>(
          `SELECT SID, ACCOUNTID, RATING FROM ratings ORDER BY SID DESC`
        );
        setRows((dbRows || []).map((r: any) => ({
          sid: r.SID, id: r.ACCOUNTID ?? '', username: '', rating: r.RATING,
        })));
      } else {
        setRows([]);
      }
    } catch (e) { console.warn('Reports fetch error:', e); setRows([]); }
    finally { setLoading(false); }
  }, [category]);

  useEffect(() => { if (category) fetchData(); else setRows([]); }, [category, fetchData]);

  // ── Long-press → view-only modal ──────────────────────────────────
  const handleRowLongPress = useCallback((row: ReportRow) => {
    setViewerFields(toEditorFields(row));
    setViewerVisible(true);
  }, []);

  // ── Bulk selection / delete ──────────────────────────────────────
  const handleToggleSelect = useCallback((item: ReportRow) => {
    const id = item.sid ?? item.id ?? '';
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

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
          const tableMap: Record<string, string> = { 'Reported Issues': 'reports', Reviews: 'comments', Ratings: 'ratings' };
          const table = tableMap[category ?? ''] ?? '';
          if (!table) return;
          try {
            await runAsync(`DELETE FROM ${table} WHERE SID IN (${placeholders})`, ids);
            setSelectedIds(new Set());
            await fetchData();
          } catch (e) { console.error('Bulk delete failed:', e); }
        },
      },
    ]);
  }, [selectedIds, category, fetchData]);

  const { rows: pageRows, onEndReached, keyExtractor } = usePagedTable<ReportRow>(rows, {
    pageSize: 50,
    filter: (r: ReportRow) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      const keys = activeField === 'all' ? selectedFields : [activeField];
      for (const key of keys) {
        if (String((r as any)[key] ?? '').toLowerCase().includes(q)) return true;
      }
      return false;
    },
    sortCompare: (a: ReportRow, b: ReportRow) => {
      if (!priority) return 0;
      const k = priority as keyof ReportRow;
      const av = (a[k] ?? '') as any;
      const bv = (b[k] ?? '') as any;
      if (typeof av === 'number' && typeof bv === 'number') return av - bv;
      return String(av).localeCompare(String(bv), undefined, { numeric: true });
    },
    keyExtractor: (r) => `${r.sid ?? ''}-${r.id ?? ''}`,
  });

  let visibleColumns: Column<ReportRow>[] = columns.filter(c => selectedFields.includes(String(c.key)));
  if (visibleColumns.length === 0) visibleColumns = columns;

  return (
    <View style={[{ flex: 1 }]}>
      <AdminSearchBar
        fields={fields as any}
        selectedFields={selectedFields}
        onChangeFields={setSelectedFields}
        priority={priority}
        onChangePriority={setPriority}
        query={query}
        onChangeQuery={setQuery}
        activeField={activeField}
        onChangeActiveField={setActiveField}
      />

      {/* Category Picker Row */}
      <View style={{ marginHorizontal: 24, marginTop: 12, marginBottom: 8, zIndex: 500 }}>
        <DropDownPicker
          open={catOpen} value={catValue} items={catItems} setOpen={setCatOpen}
          setValue={setCatValue as any} setItems={setCatItems}
          placeholder="Select an option" searchable={false} listMode="SCROLLVIEW"
          zIndex={500} zIndexInverse={400} closeAfterSelecting
          style={[AdminSearchBarStyles.dropdown, { minHeight: 36 }]}
          dropDownContainerStyle={AdminSearchBarStyles.dropdown}
          textStyle={{ color: theme.accent, fontWeight: '600' }}
          placeholderStyle={{ color: theme.placeholder }}
          selectedItemLabelStyle={{ fontWeight: '900' }}
        />
      </View>

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
          <Text style={{ color: theme.textInverse, fontWeight: '800', fontSize: 14 }}>
            Delete Selected ({selectedIds.size})
          </Text>
        </Pressable>
      )}

      <GridView<ReportRow>
        columns={visibleColumns}
        data={pageRows}
        isLoading={loading}
        onEndReached={onEndReached}
        keyExtractor={keyExtractor}
        commentKey="comments"
        enableBulkSelect
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
        onRowLongPress={handleRowLongPress}
      />

      {/* View-only modal for Reports */}
      <RowEditorModal
        visible={viewerVisible}
        title="Report Details"
        fields={viewerFields}
        onClose={() => setViewerVisible(false)}
        readOnly
      />
    </View>
  );
}
