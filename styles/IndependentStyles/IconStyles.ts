import { StyleSheet } from 'react-native';
import { u } from '../tokens';

const IconStyles = StyleSheet.create({
    iconContainer: {
        padding: 0, 
        alignItems: 'center',
        ...u.row, 
        ...u.full,
        justifyContent: 'flex-end',
    },
    profileImage: {
        width: 40, 
        height: 40, 
        borderRadius: 20,
    },
});


export{IconStyles}