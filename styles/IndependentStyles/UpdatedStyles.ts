import { StyleSheet } from 'react-native';
import { spacing, u, ux } from '../../styles/tokens';

const UpdatedStyles = StyleSheet.create({
    container: {
        ...u.row,
        ...u.bgLavender,
        alignItems: 'stretch', 
        height: 55,
        width: '100%', 
        overflow: 'hidden',
    },
    navItem: {
        ...ux.navItemBase, 
        justifyContent: 'center',
        alignItems: 'flex-end', 
        padding: spacing.p20,
        paddingVertical: spacing.p13,
    },
});

export {UpdatedStyles}