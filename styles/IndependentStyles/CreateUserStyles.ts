import { StyleSheet } from 'react-native';
import { colors, adminUI, spacing } from '../../styles/tokens';

const CreateUserStyles = StyleSheet.create({
    overlay: { 
        ...adminUI.overlayBase, 
        backgroundColor: colors.overlayScrim, 
        padding: 16 
    },
    card: { 
        padding: spacing.p16, 
        width: '100%', 
        backgroundColor: colors.deepPlum, 
        maxWidth: 560, 
        borderColor: colors.lavender, 
        borderWidth: 1,
    },
    headerRow: { 
        ...adminUI.headerRowBase, 
        marginBottom: 12,
        paddingBottom: 15, 
        borderBottomWidth: 2, 
        borderBottomColor: colors.lavender 
    },
    levelChip: {
        ...adminUI.levelChip,
        marginRight: 8, 
        marginBottom: 15 },
    headerTitleAlt: { color: colors.paleLavender },
    smallBtn: { ...adminUI.smallBtn },
    smallBtnDisabled: { opacity: 0.6 },
    smallBtnText: { ...adminUI.smallBtnText },
    inputBlock: { marginTop: 10 },
    inputLabel: { ...adminUI.inputLabel },
    input: { ...adminUI.input },
    levelRow: { ...adminUI.levelRow },
    levelChipActive: { ...adminUI.levelChipActive },
    levelChipText: { ...adminUI.levelChipText },
});
export{CreateUserStyles}