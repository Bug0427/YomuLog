import { StyleSheet } from 'react-native';
import { colors } from '../../styles/tokens';


const CommentModalStyles = StyleSheet.create({
    cardNoPad: { padding: 0 },
    sidStrong: { fontWeight: '600' as const },
    headerDelta: { 
        paddingVertical: 15, 
        textAlign: 'center' as const, 
        borderColor: colors.plum, 
        borderBottomWidth: 2,
    },
    scroll: { maxHeight: 350 },
    bodyText: { 
        fontSize: 14, 
        color: colors.deepPlum, 
        margin: 20 
    },
    closeBtn: { 
        width: 80, 
        margin: 20, 
        alignSelf: 'center' as const 
    },
    closeText: { 
        color: colors.paleLavender, 
        fontWeight: '600' as const 
    },
});

export{CommentModalStyles}