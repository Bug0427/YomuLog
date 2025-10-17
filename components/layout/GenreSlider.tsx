import React, { FC, useState } from 'react';
import { View, ScrollView, Pressable, Text, StyleProp, ViewStyle } from 'react-native';
import { GenreSliderStyles, GeneralStyles } from '../../styles/global';
import { useWindowWidth } from '../../utils/findDimensions';

type GenreSliderProps = {
    genres: string[];
    onGenrePress?: (genre: string) => void;
    containerStyle?: StyleProp<ViewStyle>;
    contentContainerStyle?: StyleProp<ViewStyle>;
};

const GenreSlider: FC<GenreSliderProps> = ({ genres, onGenrePress, containerStyle, contentContainerStyle }) => {
const screenWidth = useWindowWidth();
const [contentWidth, setContentWidth] = useState<number>(0);

// Match MangaSlider’s outer gutter behavior
const MIN_HPAD = 12; // px
const availableWidth = Math.max(0, screenWidth - MIN_HPAD * 2);

// Use measured content width if available; otherwise default to available width on first paint
const containerWidth = Math.min(availableWidth, contentWidth || availableWidth);

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
            {genres.map((genre) => (
            <Pressable key={genre} style={GenreSliderStyles.genrePill} onPress={() => onGenrePress?.(genre)}>
                <Text style={GeneralStyles.plainText}>{genre}</Text>
            </Pressable>
            ))}
        </View>
        </ScrollView>
    </View>
    </View>
);
};

export default GenreSlider;