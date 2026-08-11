import { StyleSheet } from 'react-native';
import { colors, z, spacing, u } from '../../styles/tokens';

const AnchorBase = {
    button: {
        position: 'absolute' as const, 
        right: 10, zIndex: z.upBtn,
        padding: spacing.p3, 
        paddingHorizontal: spacing.p5,
        elevation: 3, 
        ...u.border2Plum,
    },
    
    posUp: { bottom: 105 }, 
    posDown: { bottom: 65 },

    overlay: {
        zIndex: z.overlay, 
        elevation: z.overlayElev,
        ...u.bgLavender, 
        paddingHorizontal: 6,
        paddingVertical: 4,
    },
};

const AnchorStyles = StyleSheet.create({
    scrollButtonUp: {
        ...AnchorBase.button, 
        ...AnchorBase.posUp,
    },
    scrollButtonDown: {
        ...AnchorBase.button, 
        ...AnchorBase.posDown,
    },
    scrollButtonOverlay: {...AnchorBase.overlay,},

    arrowText: { 
        color: colors.plum, 
        fontSize: 18 
    },

    // A-6 a11y: guaranteed ≥44×44 hit target independent of glyph metrics
    // (hitSlop bump in Anchor.tsx is belt-and-braces on top of this).
    pressable: {
        minWidth: 44,
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export{AnchorStyles}