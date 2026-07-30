import { StyleSheet } from 'react-native';
import { colors, borders, spacing, u } from '../tokens';

const MangaSliderStyles = StyleSheet.create({
    sliderWrapper: {
        marginVertical: spacing.p3, 
        padding: spacing.p7,
        ...u.border2Plum, 
        ...u.bgSand,
    },
    sliderContainer: {paddingHorizontal: spacing.p5,},
    card: {
        width: 100, 
        alignItems: 'center',
        ...u.bgSand, 
        ...u.border2Cocoa,
        borderRightWidth: 0, 
        padding: spacing.p5,
        overflow: 'hidden',
    },
    lastCard: {borderRightWidth: borders.bw2,},
    seeMoreCard: {
        width: 100,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.plum,
        borderWidth: borders.bw2,
        borderColor: colors.lavender,
        borderRightWidth: borders.bw2,
        padding: spacing.p5,
    },
    seeMoreText: {
        color: colors.creamWhite,
        fontSize: 12,
        fontWeight: '700',
        textAlign: 'center',
    },
    image: { 
        width: '100%',
        height: 90, 
        marginBottom: spacing.p5,
        borderRadius: 4,
    },
    title: {
        color: colors.plum, 
        fontSize: 12, 
        fontWeight: '600',
        textAlign: 'center',
    },
    outerWrap: { 
        width: '100%', 
        alignItems: 'center', 
        paddingHorizontal: spacing.p12 
    },
});

export{MangaSliderStyles}