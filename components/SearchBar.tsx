import React from 'react';
import {
  FlatList,
  View,
  Text,
  Image,
  Pressable,
  useWindowDimensions,
  ActivityIndicator,
  LayoutChangeEvent,
} from 'react-native';
import { CardViewStyles } from '../styles/global';

export type ViewMode = 'grid' | 'row';

export type CardItem = {
  id: string | number;
  title: string;
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
}) => {
  const safeData = data ?? [];
  const { width: windowWidth } = useWindowDimensions();
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
    : Math.max(88, Math.round(cardWidth / 3));

  const renderItem = ({ item }: { item: CardItem }) => {
    if (viewMode === 'grid') {
      return (
        <Pressable
          onPress={() => onPressItem?.(item)}
          style={[CardViewStyles.gridCard, { width: cardWidth, height: cardHeight, marginBottom: itemSpacing }]}
        >
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={CardViewStyles.gridImage} resizeMode="cover" />
          ) : (
            <View style={[CardViewStyles.placeholder, CardViewStyles.gridImage]} />
          )}
          <Text style={CardViewStyles.gridTitle} numberOfLines={1}>{item.title}</Text>
        </Pressable>
      );
    }

    return (
      <Pressable
        onPress={() => onPressItem?.(item)}
        style={[CardViewStyles.rowCard, { width: cardWidth, minHeight: cardHeight, marginBottom: itemSpacing }]}
      >
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={CardViewStyles.rowImage} resizeMode="cover" />
        ) : (
          <View style={[CardViewStyles.placeholder, CardViewStyles.rowImage]} />
        )}
        <View style={CardViewStyles.rowTextWrap}>
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

  return (
    <FlatList
      onLayout={onLayout}
      data={safeData}
      key={columns}
      keyExtractor={(it) => String(it.id)}
      numColumns={columns}
      columnWrapperStyle={columns > 1 ? { gap: itemSpacing, justifyContent: 'center' } : undefined}
      contentContainerStyle={{ paddingHorizontal: contentPadding, paddingBottom: contentPadding }}
      renderItem={renderItem}
      showsVerticalScrollIndicator={false}
      onEndReached={() => { if (!isLoading && hasMore) onLoadMore?.(); }}
      onEndReachedThreshold={0.5}
      ListFooterComponent={Footer}
      ListEmptyComponent={Empty}
      ListHeaderComponent={headerComponent}
    />
  );
};

export default CardView;
