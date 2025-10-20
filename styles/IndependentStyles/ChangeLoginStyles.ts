import { StyleSheet } from 'react-native';
import { colors, z, borders, spacing, u, adminUI } from '../../styles/tokens';

const ChangeLoginStyles = StyleSheet.create({
    button: {
        paddingVertical: 10, 
        marginRight: 12,
        paddingHorizontal: spacing.p16,
        borderWidth: 2,
        backgroundColor: colors.sand, 
        alignItems: 'center',
        borderColor: colors.cocoa,
    },
    typed: {
        ...u.textCocoa, 
        paddingHorizontal: spacing.p12,
        paddingVertical: spacing.p12, 
        fontSize: 16,
    },
    typeBox: {
        backgroundColor: colors.sand, 
        borderWidth: 2,
        borderColor: colors.cocoa, 
        marginBottom: spacing.p10,
    },
    text: {
        ...u.textCocoa, 
        fontSize: 16, 
        fontWeight: '600',
    },
    bannerWrap: {
        position: 'absolute', 
        top: 150, 
        left: 0, 
        right: 0, 
        alignItems: 'center', 
        zIndex: z.banner,
    },
    bannerBox: {
        backgroundColor: colors.paleLavender, 
        borderRadius: borders.br8,
        paddingVertical: 10, 
        paddingHorizontal: 12,
        borderWidth: 1, 
        borderColor: colors.plum,
    },
    bannerText: {
        color: colors.plum, 
        fontSize: 14,
    },
    kbdWrap: { ...u.full },
    overlay: { 
        ...adminUI.overlayBase, 
        backgroundColor: colors.overlayScrim 
    },
    card: { 
        padding: spacing.p16, 
        width: '90%', 
        backgroundColor: colors.modalPurple, 
        borderWidth: 2, 
        borderColor: colors.dark 
    },
    title: { 
        color: colors.creamWhite, 
        fontSize: 18, fontWeight: '600', 
        marginBottom: spacing.p12 
    },
    errorText: { 
        color: colors.error, 
        marginBottom: spacing.p8,
    },
    successText: {
        color: colors.success, 
        marginBottom: spacing.p8,
    },
    helpText: {
        color: colors.creamWhite, 
        fontSize: 12, 
        marginBottom: spacing.p12,
    },
    actionsRow: {
        ...u.row, 
        justifyContent: 'flex-end',
    },
});

export{ChangeLoginStyles}