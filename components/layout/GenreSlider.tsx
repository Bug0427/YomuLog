import React, { FC, useState } from 'react';
import { View, ScrollView, Pressable, Text, StyleProp, ViewStyle, useWindowDimensions } from 'react-native';
import { GenreSliderStyles, GeneralStyles } from '../../styles/global';

type GenreSliderProps = {
    genres: string[];
    onGenrePress?: (genre: string) => void;
    containerStyle?: StyleProp<ViewStyle>;
    contentContainerStyle?: StyleProp<ViewStyle>;
};

const GenreSlider: FC<GenreSliderProps> = ({ genres, onGenrePress, containerStyle, contentContainerStyle }) => {
const { width: screenWidth } = useWindowDimensions();
const [contentWidth, setContentWidth] = useState<number>(0);

// Match MangaSlider’s outer gutter behavior
const MIN_HPAD = 12; // px
const availableWidth = Math.max(0, screenWidth - MIN_HPAD * 2);

// Use measured content width if available; otherwise default to available width on first paint
const containerWidth = Math.min(availableWidth, contentWidth || availableWidth);

return (
    <View style={[{ width: '100%', alignItems: 'center', paddingHorizontal: MIN_HPAD }, containerStyle]}>
    <View style={{ width: containerWidth }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View
            style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start' }, contentContainerStyle]}
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