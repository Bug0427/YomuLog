import { StyleSheet } from 'react-native';
import { colors, adminUI, u, spacing, ux } from '../../styles/tokens';

const AdminFiltersStyles = StyleSheet.create({
    overlayCenter: { ...adminUI.overlayBase },
    rowFirst: { borderTopWidth: 0 },
    checkboxChecked: { backgroundColor: colors.deepPlum },
    overlayDim: { 
        ...u.absFill, 
        backgroundColor: colors.overlayScrim, 
        zIndex: 1 
    },
    organizerCard: { 
        zIndex: 2, width: '82%', 
        maxHeight: '70%', 
        backgroundColor: colors.paleLavender, 
        borderColor: colors.deepPlum, 
        borderWidth: 2 
    },
    filtersCard: { 
        borderWidth: 2, 
        width: 180, 
        zIndex: 2, 
        backgroundColor: colors.paleLavender, 
        borderColor: colors.deepPlum, 
    },
    headerRow: { 
        ...ux.headerRowBase,
        paddingHorizontal: spacing.p12,
        borderColor: colors.deepPlum,
        paddingVertical: spacing.p10, 
        borderBottomWidth: 2, 
    },
    headerTitle: { 
        fontSize: 16, 
        color: colors.deepPlum, 
        fontWeight: '700' as const 
    },
    rowBase: { 
        paddingVertical: 10, 
        paddingHorizontal: 12, 
        borderColor: colors.deepPlum 
    },
    rowActive: { 
        backgroundColor: colors.paleLavender, 
        borderWidth: 2,
    },
    rowText: { 
        fontSize: 14, 
        color: colors.deepPlum, 
        fontWeight: '500' as const 
    },
    rowTextHeavy: { 
        fontSize: 14, 
        color: colors.deepPlum, 
        fontWeight: '900' as const 
    },
    filterRow: { 
        ...u.row, 
        borderColor: colors.deepPlum,
        paddingVertical: 10, 
        paddingHorizontal: 12, 
        alignItems: 'center',
    },
    checkbox: { 
        width: 18, 
        height: 18, 
        marginRight: 10, 
        borderWidth: 2, 
        borderColor: colors.deepPlum 
    },
    checkText: { 
        color: colors.paleLavender,
        marginTop: -1,
        textAlign: 'center' as const, 
        lineHeight: 16, 
    },
});

export{AdminFiltersStyles}