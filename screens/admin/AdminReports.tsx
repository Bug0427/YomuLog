// screens/admin/AdminReports.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import GridView, { Column } from '../../components/adminView/GridView';
import AdminSearchBar from '../../components/adminView/searchbar';
import { queryAll } from '../../services/feedbackRepo';
import usePagedTable from '../../hooks/admin/UsePagedTable';
import{AdminSearchBarStyles, GeneralStyles} from '../../styles/global'
import { u } from '../../styles/tokens'

type CategoryType = typeof CATEGORY_OPTIONS[number];
const CATEGORY_OPTIONS = ['Reported Issues','Reviews','Ratings'] as const;

type ReportRow = {
  sid?: string;          // submission id ("#")
  id?: string;           // account/user id
  username: string;
  category?: string;
  subcategory?: string;
  rating?: number;
  comments?: string;
};

export default function AdminReports() {
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
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailText, setDetailText] = useState('');

  const fields = useMemo(() => {
    if (category === 'Reported Issues') {
      return [
        { key: 'sid', label: 'SID' },
        { key: 'id', label: 'ID' },
        { key: 'category', label: 'Main Cat' },
        { key: 'subcategory', label: 'Sub Cat' },
        // comments are viewed via triple-tap, not a selectable field
      ];
    }
    if (category === 'Reviews') {
      return [
        { key: 'sid', label: 'SID' },
        { key: 'id', label: 'ID' },
        // comments via triple-tap
      ];
    }
    if (category === 'Ratings') {
      return [
        { key: 'sid', label: 'SID' },
        { key: 'id', label: 'ID' },
        { key: 'rating', label: 'Rating' },
      ];
    }
    // Default before a category is chosen
    return [
      { key: 'sid', label: 'SID' },
      { key: 'id', label: 'ID' },
    ];
  }, [category]);

  useEffect(() => {
    const allKeys = fields.map(f => f.key);
    // Default: all filters checked when category/fields change
    setSelectedFields(allKeys);
    // Default: no organizer selected unless current priority is valid for this category
    if (!allKeys.includes(priority)) {
      setPriority('');
    }
  }, [category, fields]);

  // Dynamic columns depending on category
  const [columns, setColumns] = useState<Column<ReportRow>[]>([]);

  // Set columns when category changes
  useEffect(() => {
    if (category === 'Reported Issues') {
      setColumns([
        { key: 'sid', title: 'SID', width: 100, align: 'center' },
        { key: 'id', title: 'ID', width: 120, align: 'center' },
        { key: 'category', title: 'Main Cat', width: 160, align: 'center' },
        { key: 'subcategory', title: 'Sub Cat', width: 160, align: 'center' },
        // comments are shown via triple‑tap, not a column
      ]);
    } else if (category === 'Reviews') {
      setColumns([
        { key: 'sid', title: 'SID', width: 100, align: 'center' },
        { key: 'id', title: 'ID', width: 120, align: 'center' },
        // comments via triple‑tap
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

  // Data fetching depending on category & query
  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        if (category === 'Reported Issues') {
          try {
            const dbRows = await queryAll<{
              SID: string;
              ACCOUNTID?: string;
              MAINCAT: string;
              SUBCAT: string;
              COMMENTS?: string;
            }>(
              `SELECT SID, ACCOUNTID, MAINCAT, SUBCAT, COMMENTS FROM reports ORDER BY SID DESC`
            );
            if (!mounted) return;
            const mapped: ReportRow[] = (dbRows || []).map((r) => ({
              sid: (r as any).SID,
              id: r.ACCOUNTID ?? '',
              username: '',
              category: r.MAINCAT,
              subcategory: r.SUBCAT,
              comments: r.COMMENTS ?? '',
            }));
            setRows(mapped);
          } catch (err) {
            setRows([]);
          }
        } else if (category === 'Reviews') {
          try {
            const dbRows = await queryAll<{
              SID: string;
              ACCOUNTID?: string;
              COMMENTS?: string;
            }>(
              `SELECT SID, ACCOUNTID, COMMENTS FROM comments ORDER BY SID DESC`
            );
            if (!mounted) return;
            const mapped: ReportRow[] = (dbRows || []).map((r) => ({
              sid: r.SID,
              id: r.ACCOUNTID ?? '',
              username: '',
              comments: r.COMMENTS ?? '',
            }));
            setRows(mapped);
          } catch (err) {
            console.warn('AdminReports Reviews query failed:', err);
            setRows([]);
          }
        } else if (category === 'Ratings') {
          try {
            const dbRows = await queryAll<{
              SID: string;
              ACCOUNTID?: string;
              RATING: number;
            }>(
              `SELECT SID, ACCOUNTID, RATING FROM ratings ORDER BY SID DESC`
            );
            if (!mounted) return;
            const mapped: ReportRow[] = (dbRows || []).map((r) => ({
              sid: r.SID,
              id: r.ACCOUNTID ?? '',
              username: '',
              rating: r.RATING,
            }));
            setRows(mapped);
          } catch (err) {
            console.warn('AdminReports Ratings query failed:', err);
            setRows([]);
          }
        } else {
          setRows([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    if (category) fetchData();
    else setRows([]);
    return () => { mounted = false; };
  }, [category, query]);

  // Client-side paging (sorting preserved by SQL, but we keep a stable key extractor)
  const { rows: pageRows, onEndReached, keyExtractor } = usePagedTable<ReportRow>(rows, {
    pageSize: 50,
    filter: (r: ReportRow) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      const keys = activeField === 'all' ? selectedFields : [activeField];
      for (const key of keys) {
        const v = String((r as any)[key] ?? '').toLowerCase();
        if (v.includes(q)) return true;
      }
      return false;
    },
    sortCompare: (a: ReportRow, b: ReportRow) => {
      if (!priority) return 0; // no organizer selected: keep order
      const k = priority as keyof ReportRow;
      const av = (a[k] ?? '') as any;
      const bv = (b[k] ?? '') as any;
      if (typeof av === 'number' && typeof bv === 'number') return av - bv;
      return String(av).localeCompare(String(bv), undefined, { numeric: true });
    },
    keyExtractor: (r) => `${r.sid ?? ''}-${r.id ?? ''}`,
  });

  let visibleColumns: Column<ReportRow>[] = columns.filter(c => selectedFields.includes(String(c.key)));
  if (visibleColumns.length === 0) visibleColumns = columns; // fallback so user can recover

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
      <View style={{ marginHorizontal: 24, marginTop: 12, marginBottom: 8, zIndex: 500, borderRadius: 0 }}>
        <DropDownPicker
          open={catOpen}
          value={catValue}
          items={catItems}
          setOpen={setCatOpen}
          setValue={setCatValue as any}
          setItems={setCatItems}
          placeholder="Select an option"
          searchable={false}
          listMode="SCROLLVIEW"
          zIndex={500}
          zIndexInverse={400}
          // Style to match your search bar colors
          style={[AdminSearchBarStyles.dropdown, { minHeight: 36,}]}
          dropDownContainerStyle={AdminSearchBarStyles.dropdown}
          textStyle={{ color: '#412d5cff', fontWeight: '600' }}
          placeholderStyle={{ color: '#595360' }}
          selectedItemLabelStyle={{ fontWeight: '900', }}
          closeAfterSelecting
        />
      </View>
        <GridView<ReportRow>
          columns={visibleColumns}
          data={pageRows}
          isLoading={loading}
          onEndReached={onEndReached}
          keyExtractor={keyExtractor}
          commentKey="comments"   // <-- required for double-tap modal
/>
      {/* Comments detail modal */}
      {detailOpen && (
        <View style={[u.absFill, { justifyContent: 'center', alignItems: 'center' }]}>
          <View style={[u.absFill, { backgroundColor: 'rgba(0,0,0,0.35)' }]} />
          <View style={{ width: '82%', maxHeight: '70%', backgroundColor: '#bfb9deff', borderColor: '#412d5cff', borderWidth: 1, padding: 12 }}>
            <View style={{ marginBottom: 8 }}>
              <View style={{ height: 1, backgroundColor: '#412d5cff' }} />
            </View>
            <View style={{ maxHeight: 320 }}>
              <ScrollView>
                <View style={{ paddingVertical: 8 }}>
                  <Text style={{ color: '#412d5cff' }}>{detailText}</Text>
                </View>
              </ScrollView>
            </View>
            <View style={{ marginTop: 10 }}>
              <Pressable onPress={() => setDetailOpen(false)}><Text style={{color:'#412d5cff', fontWeight:'bold', textAlign:'center'}}>Close</Text></Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}