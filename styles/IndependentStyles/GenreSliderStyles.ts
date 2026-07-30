import { StyleSheet } from 'react-native';
import { borders, spacing, u } from '../../styles/tokens';

const GenreSliderStyles = StyleSheet.create({
    genrePill: {
        ...u.bgSand, 
        ...u.border2Cocoa,
        borderRadius: borders.br20, 
        marginRight: spacing.p12,
        paddingHorizontal: spacing.p16,
        paddingVertical: 6,
        flexShrink: 0,
        alignSelf: 'flex-start',
    },
    genreSlider: {
        alignItems: 'flex-start', 
        paddingTop: 0,
    },
    outerWrap: { 
        width: '100%', 
        alignItems: 'center', 
        paddingHorizontal: spacing.p12 
    },
    rowWrap: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'flex-start' 
    },
});

export{GenreSliderStyles}