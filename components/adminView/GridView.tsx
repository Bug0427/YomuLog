import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, FlatList, Pressable } from 'react-native';
import { useWindowWidth } from '../../utils/findDimensions';
import { abbrevForKey } from '../../utils/gridUtils';
import { CHAR_PX, PAD_CH } from '../../utils/gridUtils';
import { computeColumnWidths } from '../../utils/gridWidths';
import { LoadingRows } from './LoadingRow';
import CommentModal from './CommentModal';
import RowView from './RowView';
import { AdminCommonStyles, AdminTabStyles } from '../../styles/global';
import useDoubleTap from '../../hooks/admin/useDoubleTap';

export type Align = 'left' | 'center' | 'right';

export type Column<T> = {
  key: keyof T | string;
  title: string;
  width?: number; // optional hint, not used when docked
  align?: Align;
  render?: (row: T, rowIndex: number) => React.ReactNode;
};

export type GridViewProps<T> = {
  columns: Column<T>[];
  data: T[];
  keyExtractor?: (item: T, index: number) => string;
  headerHeight?: number;
  rowHeight?: number;
  onEndReached?: () => void;
  isLoading?: boolean;
  commentKey?: keyof T | string;
  /** Optional: prioritized column key; moves this column to position 1 and rotates others */
  priority?: string;
};


function getCellAlign(align?: Align) {
  switch (align) {
    case 'center':
      return 'center';
    case 'right':
      return 'flex-end';
    default:
      return 'flex-start';
  }
}

function reorderColumns<T>(cols: Column<T>[], priorityKey?: string): Column<T>[] {
  if (!priorityKey) return cols;
  const idx = cols.findIndex(c => String(c.key) === String(priorityKey));
  if (idx < 0) return cols;
  const left = cols.slice(0, idx);      // move to end in-order
  const chosen = cols[idx];
  const right = cols.slice(idx + 1);    // slides left
  return [chosen, ...right, ...left];
}

function computeNaturalWidths<T>(columns: Column<T>[], data: T[]): number[] {
  return columns.map((c) => {
    const titleLen = String(c.title ?? '').length;
    const values = data.map((r) => String((r as any)[c.key] ?? ''));
    const longest = Math.max(titleLen, ...values.map((s) => s.length));
    return Math.ceil(CHAR_PX * (longest + PAD_CH * 2));
  });
}

export default function GridView<T extends Record<string, any>>({
  columns,
  data,
  keyExtractor,
  headerHeight = 44,
  rowHeight = 44,
  onEndReached,
  isLoading,
  commentKey,
  priority,
}: GridViewProps<T>) {
  const screenWidth = useWindowWidth();
  const [expandedKey, setExpandedKey] = useState<string | undefined>(undefined);
  // When all visible columns naturally fit, default to expanded and allow collapsing per column
  const [collapsedSet, setCollapsedSet] = useState<Set<string>>(new Set());
  const orderedColumns = useMemo(() => reorderColumns(columns, priority), [columns, priority]);
  const naturalWidths = useMemo(() => computeNaturalWidths(orderedColumns as any, data as any), [orderedColumns, data]);
  const allFit = useMemo(() => naturalWidths.reduce((a, b) => a + b, 0) <= Math.max(320, screenWidth), [naturalWidths, screenWidth]);
  const colWidths = useMemo(
    () => computeColumnWidths(orderedColumns as any, data as any, screenWidth, expandedKey),
    [orderedColumns, data, screenWidth, expandedKey]
  );
  const totalWidth = useMemo(() => {
    const padding = 0;
    return Math.max(320, screenWidth - padding);
  }, [screenWidth]);
  const handleRowDoublePress = useDoubleTap<T>((item) => {
    if (!commentKey) return;
    const raw = (item as any)[commentKey];
    // Normalize to string safely and trim whitespace
    const text = typeof raw === 'string' ? raw.trim() : (raw == null ? '' : String(raw));
    if (!text || text.length === 0) return; // no-op if no comment
    const sid = String((item as any)['sid'] ?? '');
    setModal({ visible: true, text, sid });
  }, 300);
  const [modal, setModal] = useState<{ visible: boolean; text: string; sid?: string }>({ visible: false, text: '' });
  const _keyExtractor = keyExtractor ?? ((item: T, i: number) => String((item as any).id ?? i));
  const renderHeader = () => (
    <View style={[AdminCommonStyles.dataRow, { height: headerHeight, width: totalWidth, borderBottomWidth: 2, backgroundColor: '#412d5cff', }]}>
      {orderedColumns.map((col, i) => {
        const keyStr = String(col.key);
        let displayTitle = col.title;
        const isExpandedCol = allFit ? !collapsedSet.has(keyStr) : expandedKey === keyStr;
        if (!isExpandedCol) displayTitle = abbrevForKey(keyStr, col.title);
        return (
          <Pressable
            key={`h-${keyStr}-${i}`}
            style={[AdminCommonStyles.dataCell, { width: colWidths[i], justifyContent: getCellAlign(col.align) }]}
            onPress={() => {
              if (allFit) {
                setCollapsedSet((prev) => {
                  const next = new Set(prev);
                  if (next.has(keyStr)) next.delete(keyStr); else next.add(keyStr);
                  return next;
                });
              } else {
                setExpandedKey((prev) => (prev === keyStr ? undefined : keyStr));
              }
            }}
          >
            <Text style={[AdminTabStyles.text, {color: '#bfb9deff',}]} numberOfLines={1} ellipsizeMode="tail">{displayTitle}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <>
      <ScrollView horizontal bounces={false} showsHorizontalScrollIndicator>
        <View style={{ width: totalWidth, flex: 1 }}>
          {renderHeader()}
          <FlatList
            data={data}
            keyExtractor={_keyExtractor}
            renderItem={({ item, index }) => (
              <RowView
                item={item}
                index={index}
                columns={orderedColumns}
                colWidths={colWidths}
                rowHeight={rowHeight}
                totalWidth={totalWidth}
                expandedKey={expandedKey}
                allFit={allFit}
                collapsedKeys={Array.from(collapsedSet)}
                onPress={(index, item) => handleRowDoublePress(item)}
              />
            )}
            onEndReachedThreshold={0.2}
            onEndReached={onEndReached}
            ListEmptyComponent={
              isLoading ? null : (
                <View style={[AdminCommonStyles.dataCell, { width: totalWidth, height: rowHeight * 3 }]}>
                </View>
              )
            }
            ListFooterComponent={
              <>
                {isLoading ? (
                  <LoadingRows widths={colWidths} count={3} height={rowHeight} />
                ) : null}
                <View
                  style={{
                    height: 0,
                    width: totalWidth,
                    borderBottomWidth: 2,
                    borderBottomColor: '#412d5cff',
                  }}
                />
              </>
            }
            ItemSeparatorComponent={() => (
              <View style={{ height: 0, width: totalWidth, borderTopWidth: 1, borderTopColor: '#543C27' }} />
            )}
          />
        </View>
      </ScrollView>

      <CommentModal
        visible={modal.visible}
        text={modal.text}
        onClose={() => setModal({ visible: false, text: '', sid: undefined })}
        sid={modal.sid}
      />
    </>
  );
}