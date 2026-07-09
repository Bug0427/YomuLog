import { StyleSheet } from 'react-native';
import { u } from '../../styles/tokens';

const LoadingRowStyles = StyleSheet.create({
    row: { ...u.row, borderLeftWidth: 1, borderRightWidth: 1 },
    cell: { ...u.center, borderRightWidth: 1 },
    shimmer: { height: 12, borderRadius: 6 },
});
export{LoadingRowStyles}