import { StyleSheet } from 'react-native';
import { colors } from '../../styles/tokens';

const GridViewStyles = StyleSheet.create({
    headerText: { color: colors.paleLavender },
    headerRow: { 
        borderBottomWidth: 2, 
        backgroundColor: colors.deepPlum 
    },
    footerDivider: { 
        height: 0, 
        borderBottomWidth: 2, 
        borderBottomColor: colors.deepPlum 
    },
    itemDivider: { 
        height: 0, 
        borderTopWidth: 1, 
        borderTopColor: colors.cocoa 
    },
});
export{GridViewStyles}