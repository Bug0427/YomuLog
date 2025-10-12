function toRNImageSource(img: any): any {
  if (!img) return undefined;
  return typeof img === 'string' ? { uri: img } : img;
}
import React from 'react';
import {
  FlatList,
  View,
  Text,
  Image,
  Pressable,
  ActivityIndicator,
  LayoutChangeEvent,
  ViewStyle,
} from 'react-native';
import { CardViewStyles } from '../../styles/global';
import { useWindowWidth } from '../../utils/findDimensions';

export type ViewMode = 'grid' | 'row';

export type CardItem = {
  id: string | number;
  title: string;
  // Support either a bundled local image (require(...)) or a remote URL
  image?: any;
  imageUrl?: string;
};

type Props = {
  data: CardItem[] | undefined;
  viewMode: ViewMode;
  onPressItem?: (item: CardItem) => void;

  // Layout controls
  numColumnsGrid?: number;           // hard override (will be clamped 3..6)
  gridItemMinWidth?: number;         // used when auto-fitting columns (default 120)
  itemSpacing?: number;              // gap between cards (default 12)
  aspectRatio?: number;              // cover aspect (default 2/3)
  contentPadding?: number;           // horizontal & bottom padding inside list (default 5)

  // Decorative
  headerComponent?: React.ComponentType<any> | React.ReactElement | null;

  // Pagination hooks
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  emptyMessage?: string;
  listRef?: React.Ref<any>;
  onScrollBeginDrag?: (e: any) => void;
  onScrollEndDrag?: (e: any) => void;
  onMomentumScrollEnd?: (e: any) => void;

  /** Optional per-item container style (e.g., for selection highlight) */
  itemStyle?: (item: CardItem) => any;

  /** Optional per-media (thumbnail) style applied to image wrapper only */
  mediaStyle?: (item: CardItem) => any;
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const CardView: React.FC<Props> = ({
  data,
  viewMode,
  onPressItem,
  numColumnsGrid,
  gridItemMinWidth = 120,
  itemSpacing = 12,
  aspectRatio = 2 / 3,
  contentPadding = 5,
  headerComponent,
  isLoading = false,
  hasMore = false,
  onLoadMore,
  emptyMessage = 'No items yet.',
  listRef,
  onScrollBeginDrag,
  onScrollEndDrag,
  onMomentumScrollEnd,
  itemStyle,
  mediaStyle,
}) => {
  const safeData = data ?? [];
  const windowWidth = useWindowWidth();
  const [containerWidth, setContainerWidth] = React.useState<number | null>(null);

  // track available width (accounts for side padding and rotation)
  const onLayout = React.useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (!containerWidth || Math.abs(containerWidth - w) > 1) {
      setContainerWidth(w);
    }
  }, [containerWidth]);

  const available = Math.max(0, containerWidth ?? windowWidth);

  // Determine columns
  let columns = 1;
  if (viewMode === 'grid') {
    if (numColumnsGrid && numColumnsGrid > 0) {
      columns = clamp(numColumnsGrid, 3, 6);
    } else {
      // auto-fit based on min width, but clamp 3..6
      const inner = Math.max(0, available - contentPadding * 2);
      const autoCols = Math.floor((inner + itemSpacing) / (gridItemMinWidth + itemSpacing));
      columns = clamp(autoCols, 3, 6);
    }
  }

  // Compute card sizes from the *current available width*
  const totalSpacing = contentPadding * 2 + itemSpacing * (columns - 1);
  const cardWidth = viewMode === 'grid'
    ? Math.floor((available - totalSpacing) / columns)
    : Math.max(0, available - contentPadding * 2);
  const cardHeight = viewMode === 'grid'
    ? Math.round(cardWidth / aspectRatio)
    : Math.max(88, Math.round(cardWidth / 10));

  // Size by height so it never exceeds the row's frame; width derives from aspect (w = 0.8 * h)
  const rowThumbH = Math.max(56, Math.round(cardHeight * 0.9));
  const rowThumbW = Math.round(rowThumbH * 0.75); // ensures h = w / 0.80

  // Center full rows by adjusting side padding, but keep row items left-aligned so the last row starts at column 1
  const gridWidth = columns > 1 ? (columns * cardWidth + (columns - 1) * itemSpacing) : cardWidth;
  const sidePad = Math.max(contentPadding, Math.floor((available - gridWidth) / 2));

  const renderItem = ({ item, index }: { item: CardItem; index: number }) => {
    const isLastInRow = columns > 1 ? (index % columns) === columns - 1 : true;
    const marginRight = columns > 1 && !isLastInRow ? itemSpacing : 0;

    if (viewMode === 'grid') {
      return (
        <Pressable
          onPress={() => onPressItem?.(item)}
          style={[
            CardViewStyles.gridCard,
            { width: cardWidth, height: cardHeight, marginBottom: itemSpacing, marginRight, alignItems: 'center', justifyContent: 'center' },
            itemStyle ? itemStyle(item) : undefined,
          ]}
        >
          <View style={[{ width: '92%', height: '86%', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }, mediaStyle ? mediaStyle(item) : undefined]}>
            {(item.image || item.imageUrl) ? (
              <Image
                source={toRNImageSource(item.image ?? item.imageUrl)}
                style={{ width: '100%', height: '100%' }}
                resizeMode="contain"
              />
            ) : (
              <View style={[CardViewStyles.placeholder, { width: '100%', height: '100%' }]} />
            )}
          </View>
          {item.title ? (
            <Text style={CardViewStyles.gridTitle} numberOfLines={1}>{item.title}</Text>
          ) : null}
        </Pressable>
      );
    }

    return (
      <Pressable
        onPress={() => onPressItem?.(item)}
        style={[
          CardViewStyles.rowCard,
          { width: cardWidth, height: cardHeight, marginBottom: itemSpacing, marginRight, alignItems: 'center' },
          itemStyle ? itemStyle(item) : undefined,
        ]}
      >
        <View style={[{ width: rowThumbW, height: rowThumbH, alignItems: 'center', justifyContent: 'center', borderRadius: 8 }, mediaStyle ? mediaStyle(item) : undefined]}>
          {(item.image || item.imageUrl) ? (
            <Image
              source={toRNImageSource(item.image ?? item.imageUrl)}
              style={[CardViewStyles.rowImage, { width: '100%', height: '100%' }]}
              resizeMode="contain"
            />
          ) : (
            <View style={[CardViewStyles.placeholder, { width: '100%', height: '100%' }]} />
          )}
        </View>
        <View style={[CardViewStyles.rowTextWrap, { flex: 1, justifyContent: 'center' }]}> 
          <Text style={CardViewStyles.rowTitle} numberOfLines={1}>{item.title}</Text>
        </View>
      </Pressable>
    );
  };

  const Footer = () => {
    if (isLoading && safeData.length === 0) return null;
    if (isLoading && safeData.length > 0) {
      return (
        <View style={CardViewStyles.footer}>
          <ActivityIndicator />
          <Text style={CardViewStyles.footerText}>Loading more…</Text>
        </View>
      );
    }
    if (!hasMore && safeData.length > 0) {
      return (
        <View style={CardViewStyles.footerEnd}>
          <Text style={CardViewStyles.footerText}>You’ve reached the end.</Text>
        </View>
      );
    }
    return null;
  };

  const Empty = () => {
    if (isLoading) {
      return (
        <View style={CardViewStyles.emptyWrap}>
          <ActivityIndicator />
          <Text style={CardViewStyles.emptyText}>Loading…</Text>
        </View>
      );
    }
    return (
      <View style={CardViewStyles.emptyWrap}>
        <Text style={CardViewStyles.emptyText}>{emptyMessage}</Text>
      </View>
    );
  };

  // Define list content container style
  const listContentStyle: ViewStyle = { paddingHorizontal: sidePad, paddingBottom: contentPadding };

  return (
    <View onLayout={onLayout}>
      <FlatList<CardItem>
        data={safeData}
        key={columns}
        keyExtractor={(it) => String(it.id)}
        numColumns={columns}
        columnWrapperStyle={columns > 1 ? { justifyContent: 'flex-start' } : undefined}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        onEndReached={() => { if (!isLoading && hasMore) onLoadMore?.(); }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={Footer}
        ListEmptyComponent={Empty}
        ListHeaderComponent={headerComponent}
        {...({ contentContainerStyle: listContentStyle } as any)}
        ref={listRef as any}
        onScrollBeginDrag={onScrollBeginDrag}
        onScrollEndDrag={onScrollEndDrag}
        onMomentumScrollEnd={onMomentumScrollEnd}
        scrollEventThrottle={16}
      />
    </View>
  );
};

export default CardView;
