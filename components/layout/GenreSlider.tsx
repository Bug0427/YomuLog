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
    /** Genre labels that are in the "excluded" state (2nd tap) */
    excludedGenres?: string[];
    containerStyle?: StyleProp<ViewStyle>;
    contentContainerStyle?: StyleProp<ViewStyle>;
};

const GenreSlider: FC<GenreSliderProps> = ({
    genres,
    onGenrePress,
    selectedGenres,
    excludedGenres,
    containerStyle,
    contentContainerStyle
}) => {
    const screenWidth = useWindowWidth();
    const [contentWidth, setContentWidth] = useState<number>(0);

    const MIN_HPAD = 12;
    const availableWidth = Math.max(0, screenWidth - MIN_HPAD * 2);
    const containerWidth = Math.min(availableWidth, contentWidth || availableWidth);

    const selectedSet = new Set(selectedGenres ?? []);
    const excludedSet = new Set(excludedGenres ?? []);

    // Reorder: selected first → unselected → excluded
    const ordered = [
        ...genres.filter((g) => selectedSet.has(g)),
        ...genres.filter((g) => !selectedSet.has(g) && !excludedSet.has(g)),
        ...genres.filter((g) => excludedSet.has(g) && !selectedSet.has(g)),
    ];

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
                {ordered.map((genre) => {
                    const isActive = selectedSet.has(genre);
                    const isExcluded = excludedSet.has(genre);
                    return (
                        <Pressable
                            key={genre}
                            style={[
                                GenreSliderStyles.genrePill,
                                isActive && {
                                    backgroundColor: colors.plum,
                                    borderColor: colors.lavender,
                                },
                                isExcluded && {
                                    backgroundColor: colors.sand,
                                    borderColor: colors.error,
                                    borderWidth: 2,
                                    opacity: 0.6,
                                },
                            ]}
                            onPress={() => onGenrePress?.(genre)}
                        >
                            <Text
                                style={[
                                    GeneralStyles.plainText,
                                    isActive && { color: colors.creamWhite, fontWeight: '700' as const },
                                    isExcluded && {
                                        color: colors.error,
                                        textDecorationLine: 'line-through' as const,
                                    },
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
