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
        width: 80, 
        alignItems: 'center',
        ...u.bgSand, 
        ...u.border2Cocoa,
        borderRightWidth: 0, 
        padding: spacing.p5,
    },
    lastCard: {borderRightWidth: borders.bw2,},
    image: { 
        width: 100, 
        height: 90, 
        marginBottom: spacing.p5,
    },
    title: {
        color: colors.white, 
        fontSize: 14, 
        textAlign: 'center',
    },
    outerWrap: { 
        width: '100%', 
        alignItems: 'center', 
        paddingHorizontal: spacing.p12 
    },
});

export{MangaSliderStyles}