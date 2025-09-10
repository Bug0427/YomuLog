import React from 'react';
import { FlatList, View, Text, Image, Pressable, Dimensions, ActivityIndicator } from 'react-native';
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
        numColumnsGrid?: number;
        aspectRatio?: number;
        contentPadding?: number;
        headerComponent?: React.ComponentType<any> | React.ReactElement | null;
        isLoading?: boolean;
        hasMore?: boolean;
        onLoadMore?: () => void;
        emptyMessage?: string;
    };

    const { width: SCREEN_WIDTH } = Dimensions.get('window');

    const CardView: React.FC<Props> = ({
        data,
        viewMode,
        onPressItem,
        numColumnsGrid,
        aspectRatio = 2 / 3,
        contentPadding = 5,
        headerComponent,
        isLoading = false,
        hasMore = false,
        onLoadMore,
        emptyMessage = 'No items yet.',
    }) => {
        const safeData = data ?? [];
        const isTablet = SCREEN_WIDTH >= 768;

        const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
        const itemSpacing = 12;
        const gridItemMinWidth = 100;

        let columns = 1;
        if (viewMode === 'grid') {
            if (numColumnsGrid && numColumnsGrid > 0) {
                columns = clamp(numColumnsGrid, 3, 6);
            } else {
                const inner = Math.max(0, SCREEN_WIDTH - contentPadding * 2);
                const autoCols = Math.floor((inner + itemSpacing) / (gridItemMinWidth + itemSpacing));
                columns = clamp(autoCols, 3, 6);
            }
        } else {
            columns = 1;
        }

        const totalSpacing = contentPadding * 2 + itemSpacing * (columns - 1);
        const cardWidth = viewMode === 'grid'
            ? Math.floor((SCREEN_WIDTH - totalSpacing) / columns)
            : SCREEN_WIDTH - contentPadding * 2;
        const cardHeight = viewMode === 'grid' ? Math.round(cardWidth / aspectRatio) : Math.max(88, Math.round(cardWidth / 3));

        const renderItem = ({ item }: { item: CardItem }) => {
            if (viewMode === 'grid') {
            return (
                <Pressable onPress={() => onPressItem?.(item)} style={[CardViewStyles.gridCard, { width: cardWidth, height: cardHeight, marginBottom: itemSpacing }]}>
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
            <Pressable onPress={() => onPressItem?.(item)} style={[CardViewStyles.rowCard, { width: cardWidth, minHeight: cardHeight, marginBottom: itemSpacing }]}>
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
