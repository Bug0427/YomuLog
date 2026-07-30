import React from 'react';
import { View, Text, FlatList, Image, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GeneralStyles } from '../../styles/global';
import { MangaSliderStyles } from '../../styles/IndependentStyles/MangaSliderStyles';
import { colors } from '../../styles/tokens';
import { useWindowWidth } from '../../utils/findDimensions';

interface MangaItem {
  id: string;
  title: string;
  image: string;
  onPress?: () => void;
}

interface MangaSliderProps {
  data: MangaItem[];
  title?: string;
  onTitlePress?: () => void;
  /** Optional component rendered as the last card (e.g. RefreshCard) */
  footerComponent?: React.ReactElement;
  /** If provided, renders a "See More" trailing card that navigates to Search */
  seeMoreOnPress?: () => void;
}

const MangaSlider: React.FC<MangaSliderProps> = ({ data, title, onTitlePress, footerComponent, seeMoreOnPress }) => {
  const screenWidth = useWindowWidth();

  // Ensure a minimum horizontal gutter on all screen sizes
  const MIN_HPAD = 12; // px
  const availableWidth = Math.max(0, screenWidth - MIN_HPAD * 2);

  // Pull sizing hints from styles (fallbacks if not numeric)
  const cardWidth = (MangaSliderStyles.card?.width as number) || 100;
  const gap = Number((MangaSliderStyles.card as any)?.marginRight) || 0;

  const maxCards = 10;
  const visibleCards = Math.min(maxCards, data.length || maxCards);

  // Include card border thickness in the visual width of each card
  const cardBorder =
    Number((MangaSliderStyles.card as any)?.borderWidth) ||
    Math.max(
      Number((MangaSliderStyles.card as any)?.borderLeftWidth) || 0,
      Number((MangaSliderStyles.card as any)?.borderRightWidth) || 0
    ) || 0;
  const cardOuterWidth = cardWidth + cardBorder + 1;

  // Total content width for N cards including gaps between them
  const contentWidthForVisible = cardOuterWidth * visibleCards + gap * Math.max(0, visibleCards - 1);
  const contentWidthForMax = cardOuterWidth * maxCards + gap * (maxCards - 1);

  // Desired content width is capped at what 10 cards would occupy
  const desiredContentWidth = Math.min(contentWidthForVisible, contentWidthForMax);

  // Container width includes wrapper padding + border only (exclude list internal padding); cap by screen width
  const containerWidth = Math.min(
    availableWidth,
    Math.ceil(desiredContentWidth)
  );

  // Center the whole block; keep internal padding constant
  const listExtraProps = {
    contentContainerStyle: [MangaSliderStyles.sliderContainer],
  } as any;

  // Build data with trailing "See More" card
  const displayData = seeMoreOnPress
    ? [...data, { id: '__see_more__', title: 'See More', image: '', onPress: seeMoreOnPress } as MangaItem]
    : data;

  return (
    <View style={MangaSliderStyles.outerWrap}>
      <View style={{ width: containerWidth }}>
        {title ? (
          <Pressable disabled={!onTitlePress} onPress={onTitlePress}>
            <Text style={GeneralStyles.h1}>{title}</Text>
          </Pressable>
        ) : null}
        <View style={[MangaSliderStyles.sliderWrapper, { width: containerWidth }]}> 
          <FlatList<MangaItem>
            data={displayData}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            {...listExtraProps}
            renderItem={({ item, index }: { item: MangaItem; index: number }) => {
              const isLast = index === displayData.length - 1;
              const isSeeMore = item.id === '__see_more__';

              if (isSeeMore) {
                return (
                  <Pressable
                    style={[MangaSliderStyles.seeMoreCard, isLast && MangaSliderStyles.lastCard]}
                    onPress={item.onPress}
                  >
                    <MaterialCommunityIcons name="chevron-right-circle" size={28} color={colors.creamWhite} />
                    <Text style={MangaSliderStyles.seeMoreText}>{item.title}</Text>
                  </Pressable>
                );
              }

              return (
                <Pressable
                  style={[
                    MangaSliderStyles.card,
                    isLast && MangaSliderStyles.lastCard
                  ]}
                  onPress={item.onPress}
                >
                  <Image source={{ uri: item.image }} style={MangaSliderStyles.image} />
                  <Text style={MangaSliderStyles.title} numberOfLines={1}>{item.title}</Text>
                </Pressable>
              );
            }}
            ListFooterComponent={footerComponent}
          />
        </View>
      </View>
    </View>
  );
};



export default MangaSlider;