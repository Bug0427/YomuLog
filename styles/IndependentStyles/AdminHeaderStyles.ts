import { StyleSheet } from 'react-native';
import { colors } from '../../styles/tokens';


const AdminHeaderStyles = StyleSheet.create({
    backText: { 
        color: colors.paleLavender, 
        fontWeight: '600' as const, 
    },
    titleCenter: { 
        flex: 1, 
        textAlign: 'center' as const, 
        color: colors.deepPlum,
    },
    spacer: { 
        width: 70, 
        marginRight: 15,
    },
    activeText: { color: colors.lavender },
    diagonalCenter: { left: '50%' as const },
    diagonalTopDeep: { borderTopColor: colors.deepPlum },
    diagonalTopLav: { borderTopColor: colors.lavender },
});
export{AdminHeaderStyles}