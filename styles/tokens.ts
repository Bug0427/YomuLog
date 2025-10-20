const colors = {
    plum: '#463B54',
    deepPlum: '#412d5cff', 
    modalPurple: '#8c84c8',
    mutedPlum: '#7a6e8f',
    lavender: '#AFA6DD',
    paleLavender: '#b8b1dbff',
    cocoa: '#543C27',
    splashText: '#8e6e53',
    sand: '#E3D3BD',
    creamWhite: '#fff8f0',
    error: '#ff6b6b',
    success: '#7bd88f',
    placeholderText: '#595360',
    dark: '#333333',
    overlayScrim: 'rgba(0,0,0,0.5)',
};

const z = { 
    upBtn: 10, 
    overlay: 9999, 
    overlayElev: 6, 
    banner: 1000, 
};

const borders = {
    bw1: 1 as const, 
    bw2: 2 as const, 
    bw3: 3 as const,
    br20: 20 as const, 
    br8: 8 as const,
};

const spacing = {
    p0: 0, p3: 3, p4: 4, p5: 5, p6: 6, 
    p7: 7, p8: 8, p10: 10, p12: 12, p13: 13, 
    p14: 14, p15: 15, p16: 16, p18: 18, p20: 20,
    p21: 21, p23: 23, p24: 24, p50: 50,
};

const u = {
// layout
    row: { flexDirection: 'row' as const },
    full: { flex: 1 as const },
    center: { 
        alignItems: 'center' as const, 
        justifyContent: 'center' as const 
    },
    rowCenter: { 
        flexDirection: 'row' as const, 
        alignItems: 'center' as const 
    },
    absFill: { 
        position: 'absolute' as const, 
        left: 0, 
        right: 0, 
        top: 0, 
        bottom: 0 
    },

// backgrounds
    bgLavender: { backgroundColor: colors.lavender },
    bgSand: { backgroundColor: colors.sand },
    bgPaleLavender: { backgroundColor: colors.paleLavender },
    bgCreamWhite: { backgroundColor: colors.creamWhite },

// borders (exact colors preserved)
    border1DeepPlum: { 
        borderWidth: borders.bw1, 
        borderColor: colors.deepPlum 
    },
    border2Plum: { 
        borderWidth: borders.bw2, 
        borderColor: colors.plum 
    },
    border2Cocoa: { 
        borderWidth: borders.bw2, 
        borderColor: colors.cocoa 
    },
    border3Plum: { 
        borderWidth: borders.bw3, 
        borderColor: colors.plum 
    },

// text colors
    textPlum: { color: colors.plum },
    textCocoa: { color: colors.cocoa },

// common paddings/margins
    px10: { paddingHorizontal: spacing.p10 },
    px12: { paddingHorizontal: spacing.p12 },
    px15: { paddingHorizontal: spacing.p15 },
    px16: { paddingHorizontal: spacing.p16 },
    py8: { paddingVertical: spacing.p8 },
    mb0: { marginBottom: 0 },

    fullNoPad: { 
        flex: 1 as const, 
        paddingLeft: 0, 
        paddingRight: 0, 
        paddingHorizontal: 0, 
        paddingTop: 0, 
        paddingBottom: 0 
    },
};

const ux = {
    cellItem: { 
        ...u.border2Cocoa, 
        ...u.bgSand 
    },
    navItemBase: { 
        flex: 1 as const, 
        ...u.border2Cocoa, 
        borderRightWidth: 0, 
        ...u.center 
    },
};

const adminUI = {
    overlayBase: { 
        ...u.full, 
        justifyContent: 'center' as const, 
        alignItems: 'center' as const 
    },
    headerRowBase: { 
        ...u.row, 
        alignItems: 'center' as const, 
        justifyContent: 'space-between' as const 
    },
    smallBtn: { 
        borderWidth: 1, 
        borderColor: colors.lavender, 
        paddingVertical: 6, 
        paddingHorizontal: 10 },
    smallBtnText: { 
        color: colors.paleLavender, 
        fontWeight: '600' as const 
    },
//inputs
    input: { 
        borderWidth: 1, 
        borderColor: colors.lavender,
        paddingVertical: 10, 
        paddingHorizontal: 12, 
        color: colors.paleLavender },
    inputLabel: {
        color: colors.paleLavender, 
        marginBottom: 6, 
        fontSize: 12 
    },
    levelRow: { 
        ...u.row, 
        gap: 8 
    },
    levelChip: { 
        borderWidth: 1, 
        borderColor: colors.lavender, 
        paddingVertical: 8, 
        paddingHorizontal: 12 
    },
    levelChipText: { 
        color: colors.paleLavender, 
        fontWeight: '600' as const 
    },
    levelChipActive: { 
        backgroundColor: colors.lavender, 
        color: colors.deepPlum, 
        fontWeight: '600' as const 
    },
} as const;

const t = {
    h1: {
        fontSize: 20 as const, 
        fontWeight: 'bold' as const, 
        ...u.textPlum,
        textShadowColor: colors.paleLavender, 
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 1,
    },
    titleXXL: { 
        fontSize: 36 as const, 
        fontWeight: 'bold' as const, 
        ...u.textPlum 
    },
    label: { 
        fontSize: 12 as const, 
        fontWeight: '600' as const, 
        ...u.textCocoa 
    },
    body: { 
        fontSize: 16 as const, 
        ...u.textCocoa 
    },
};
export{colors, z, borders, spacing, u, ux, adminUI, t}
