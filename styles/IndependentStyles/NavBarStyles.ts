import { StyleSheet } from 'react-native';
import { u, ux } from '../tokens';

const NavBarStyles = StyleSheet.create({
    container: {
        ...u.row, 
        ...u.bgSand,
        alignItems: 'stretch', 
        width: '100%',
        height: 50, 
        overflow: 'hidden',
    },
    navItem: {...ux.navItemBase,},
    navItemLast: { borderRightWidth: 2 },
});

export{NavBarStyles}