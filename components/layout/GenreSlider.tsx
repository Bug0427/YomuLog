import React, { FC, useState } from 'react';
import { View, ScrollView, Pressable, Text, StyleProp, ViewStyle } from 'react-native';
import { GeneralStyles } from '../../styles/global';
import { GenreSliderStyles } from '../../styles/IndependentStyles/GenreSliderStyles';
import { useWindowWidth } from '../../utils/findDimensions';
import { colors } from '../../styles/tokens';

type GenreSliderProps = {
    genres: string[];
    onGenrePress?: (genre: string) => void;
    selectedGenres?: string[];
    containerStyle?: StyleProp<ViewStyle>;
    contentContainerStyle?: StyleProp<ViewStyle>;
};

const GenreSlider: FC<GenreSliderProps> = ({ genres, onGenrePress, selectedGenres, containerStyle, contentContainerStyle }) => {
    const screenWidth = useWindowWidth();
    const [contentWidth, setContentWidth] = useState<number>(0);

    // Match MangaSlider’s outer gutter behavior
    const MIN_HPAD = 12; // px
    const availableWidth = Math.max(0, screenWidth - MIN_HPAD * 2);

    // Use measured content width if available; otherwise default to available width on first paint
    const containerWidth = Math.min(availableWidth, contentWidth || availableWidth);

    const selectedSet = new Set(selectedGenres ?? []);

    return (
        <View style={[GenreSliderStyles.outerWrap, containerStyle]}>
        <View style={{ width: containerWidth }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View
                style={[GenreSliderStyles.rowWrap, contentContainerStyle]}
                onLayout={(e) => {
                const w = Math.ceil(e.nativeEvent.layout.width);
                if (w && w !== contentWidth) setContentWidth(w);
                }}
            >
                {genres.map((genre) => {
                  const isActive = selectedSet.has(genre);
                  return (
                <Pressable
                  key={genre}
                  style={[
                    GenreSliderStyles.genrePill,
                    isActive && {
                      backgroundColor: colors.plum,
                      borderColor: colors.lavender,
                    },
                  ]}
                  onPress={() => onGenrePress?.(genre)}
                >
                    <Text
                      style={[
                        GeneralStyles.plainText,
                        isActive && { color: colors.creamWhite, fontWeight: '700' as const },
                      ]}
                    >
                      {genre}
                    </Text>
                </Pressable>
                  );
                })}
            </View>
            </ScrollView>
        </View>
        </View>
    );
};

export default GenreSlider;