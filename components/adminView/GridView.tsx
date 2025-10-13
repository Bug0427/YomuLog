import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, FlatList, Pressable } from 'react-native';
import { useWindowWidth } from '../../utils/findDimensions';
import useTripleTap from '../../hooks/admin/useTripleTap';
import useDoubleTap from '../../hooks/admin/useDoubleTap';
import { abbrevForKey } from '../../utils/gridUtils';
import { computeColumnWidths } from '../../utils/gridWidths';
import { LoadingRows } from './LoadingRow';
import CommentModal from './CommentModal';
import RowView from './RowView';
import { adminCommonStyles, adminTabStyles } from '../../styles/global';

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

export default function GridView<T extends Record<string, any>>({
  columns,
  data,
  keyExtractor,
  headerHeight = 44,
  rowHeight = 44,
  onEndReached,
  isLoading,
  commentKey,
}: GridViewProps<T>) {
  const screenWidth = useWindowWidth();
  const [expandedKey, setExpandedKey] = useState<string | undefined>(undefined);
  const onHeaderDoubleTap = useDoubleTap<string>((key) => {
    setExpandedKey((prev) => (prev === key ? undefined : key));
  }, 300);
  const colWidths = useMemo(
    () => computeColumnWidths(columns as any, data as any, screenWidth, expandedKey),
    [columns, data, screenWidth, expandedKey]
  );
  const totalWidth = useMemo(() => {
    const padding = 0;
    return Math.max(320, screenWidth - padding);
  }, [screenWidth]);
  const handleRowPress = useTripleTap<T>((item) => {
    if (commentKey) {
      const text = String((item as any)[commentKey] ?? '');
      if (text) setModal({ visible: true, text });
    }
  }, 500);
  const [modal, setModal] = useState<{ visible: boolean; text: string }>({ visible: false, text: '' });
  const _keyExtractor = keyExtractor ?? ((item: T, i: number) => String((item as any).id ?? i));
  const renderHeader = () => (
    <View style={[adminCommonStyles.dataRow, { height: headerHeight, width: totalWidth, borderBottomWidth: 2, backgroundColor: '#745996ff', }]}> 
      {columns.map((col, i) => {
        const keyStr = String(col.key);
        let displayTitle = col.title;
        const isExpandedCol = expandedKey === keyStr;
        if (!isExpandedCol) displayTitle = abbrevForKey(keyStr, col.title);
        return (
          <Pressable
            key={`h-${keyStr}-${i}`}
            style={[adminCommonStyles.dataCell, { width: colWidths[i], justifyContent: getCellAlign(col.align) }]}
            onPress={() => onHeaderDoubleTap(keyStr)}
          >
            <Text style={[adminTabStyles.text, {color: '#bfb9deff',}]} numberOfLines={1} ellipsizeMode="tail">{displayTitle}</Text>
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
                columns={columns}
                colWidths={colWidths}
                rowHeight={rowHeight}
                totalWidth={totalWidth}
                expandedKey={expandedKey}
                onPress={handleRowPress}
              />
            )}
            onEndReachedThreshold={0.2}
            onEndReached={onEndReached}
            ListEmptyComponent={
              isLoading ? null : (
                <View style={[adminCommonStyles.dataCell, { width: totalWidth, height: rowHeight * 3 }]}>
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
        onClose={() => setModal({ visible: false, text: '' })}
      />
    </>
  );
}