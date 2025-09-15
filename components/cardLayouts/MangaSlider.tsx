import React from 'react';
import { View, Text, FlatList, Image, Pressable, useWindowDimensions } from 'react-native';
import { MangaSliderStyles, GeneralStyles } from '../../styles/global';

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
}

const MangaSlider: React.FC<MangaSliderProps> = ({ data, title, onTitlePress }) => {
  const { width: screenWidth } = useWindowDimensions();

  // Pull sizing hints from styles (fallbacks if not numeric)
  const cardWidth = (MangaSliderStyles.card?.width as number) || 120;
  const gap = Number((MangaSliderStyles.card as any)?.marginRight) || 0; // per-card spacing

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

  // Read wrapper border and padding to compute outer container width precisely
  const wrapperBorder = Number((MangaSliderStyles.sliderWrapper as any)?.borderWidth) || 0;

  // Container width includes wrapper padding + border only (exclude list internal padding); cap by screen width
  const containerWidth = Math.min(
    screenWidth,
    Math.ceil(desiredContentWidth)
  );

  // Center the whole block; keep internal padding constant
  const listExtraProps = {
    contentContainerStyle: [MangaSliderStyles.sliderContainer],
  } as any;
  return (
    <View style={{ width: '100%', alignItems: 'center' }}>
      <View style={{ width: containerWidth }}>
        {title ? (
          <Pressable disabled={!onTitlePress} onPress={onTitlePress}>
            <Text style={GeneralStyles.h1}>{title}</Text>
          </Pressable>
        ) : null}
        <View style={[MangaSliderStyles.sliderWrapper, { width: containerWidth }]}> 
          <FlatList<MangaItem>
            data={data}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            {...listExtraProps}
            renderItem={({ item, index }: { item: MangaItem; index: number }) => (
              <Pressable
                style={[
                  MangaSliderStyles.card,
                  index === data.length - 1 && MangaSliderStyles.lastCard
                ]}
                onPress={item.onPress}
              >
                <Image source={{ uri: item.image }} style={MangaSliderStyles.image} />
                <Text style={MangaSliderStyles.title} numberOfLines={1}>{item.title}</Text>
              </Pressable>
            )}
          />
        </View>
      </View>
    </View>
  );
};



export default MangaSlider;