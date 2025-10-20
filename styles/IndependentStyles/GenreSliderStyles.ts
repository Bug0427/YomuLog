import { StyleSheet } from 'react-native';
import { borders, spacing, u } from '../../styles/tokens';

const GenreSliderStyles = StyleSheet.create({
    genrePill: {
        ...u.bgSand, 
        ...u.border2Cocoa,
        borderRadius: borders.br20, 
        marginRight: 8,
        paddingHorizontal: 15, 
        paddingVertical: 6,
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