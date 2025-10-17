import { StyleSheet } from 'react-native';

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


const z = { upBtn: 10, overlay: 9999, overlayElev: 6, banner: 1000, };

const borders = {
    bw1: 1 as const, bw2: 2 as const, bw3: 3 as const,
    br20: 20 as const, br8: 8 as const,
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
    center: { alignItems: 'center' as const, justifyContent: 'center' as const },
    rowCenter: { flexDirection: 'row' as const, alignItems: 'center' as const },
    full: { flex: 1 as const },
    absFill: { position: 'absolute' as const, left: 0, right: 0, top: 0, bottom: 0 },

// backgrounds
    bgLavender: { backgroundColor: colors.lavender },
    bgSand: { backgroundColor: colors.sand },
    bgPaleLavender: { backgroundColor: colors.paleLavender },
    bgCreamWhite: { backgroundColor: colors.creamWhite },

// borders (exact colors preserved)
    border1DeepPlum: { borderWidth: borders.bw1, borderColor: colors.deepPlum },
    border2Plum: { borderWidth: borders.bw2, borderColor: colors.plum },
    border2Cocoa: { borderWidth: borders.bw2, borderColor: colors.cocoa },
    border3Plum: { borderWidth: borders.bw3, borderColor: colors.plum },

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

    fullNoPad: { flex: 1 as const, paddingLeft: 0, paddingRight: 0, paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0 },
};

const ux = {
    cellItem: { ...u.border2Cocoa, ...u.bgSand },
    navItemBase: { flex: 1 as const, ...u.border2Cocoa, borderRightWidth: 0, ...u.center },
};

const adminUI = {
    overlayBase: { ...u.full, justifyContent: 'center' as const, alignItems: 'center' as const },
    cardBase: { padding: spacing.p16 },
    headerRowBase: { ...u.row, alignItems: 'center' as const, justifyContent: 'space-between' as const },
    smallBtn: { borderWidth: 1, borderColor: colors.lavender, paddingVertical: 6, paddingHorizontal: 10 },
    smallBtnText: { color: colors.paleLavender, fontWeight: '600' as const },
    smallBtnDisabled: { opacity: 0.6 },
//inputs
    input: { borderWidth: 1, borderColor: colors.lavender, paddingVertical: 10, paddingHorizontal: 12, color: colors.paleLavender },
    inputLabel: { color: colors.paleLavender, marginBottom: 6, fontSize: 12 },
    levelRow: { ...u.row, gap: 8 },
    levelChip: { borderWidth: 1, borderColor: colors.lavender, paddingVertical: 8, paddingHorizontal: 12 },
    levelChipText: { color: colors.paleLavender, fontWeight: '600' as const },
    levelChipActive: { backgroundColor: colors.lavender, color: colors.deepPlum, fontWeight: '600' as const },
} as const;

const t = {
    h1: {
        fontSize: 20 as const, fontWeight: 'bold' as const, ...u.textPlum,
        textShadowColor: colors.paleLavender, textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 1,
    },
    titleXXL: { fontSize: 36 as const, fontWeight: 'bold' as const, ...u.textPlum },
    label: { fontSize: 12 as const, fontWeight: '600' as const, ...u.textCocoa },
    body: { fontSize: 16 as const, ...u.textCocoa },
};

const AnchorBase = {
    button: {
        position: 'absolute' as const, right: 10, zIndex: z.upBtn,
        padding: spacing.p3, paddingHorizontal: spacing.p5,
        elevation: 3, ...u.border2Plum,
    },
    posUp: { bottom: 105 }, 
    posDown: { bottom: 65 },
    overlay: {
        zIndex: z.overlay, elevation: z.overlayElev,
        ...u.bgLavender, paddingHorizontal: 6,
        paddingVertical: 4,
    },
};

const GeneralStyles = StyleSheet.create({
    container: {
        ...u.bgLavender, ...u.full,
        paddingTop: 52, paddingHorizontal: 7,
    },
    section: {
        ...u.bgLavender, ...u.full,
        paddingHorizontal: 0, paddingBottom: spacing.p24,
    },
    h1: {...t.h1, paddingTop: spacing.p18,},
    scrollContainer: {...u.bgLavender,flexGrow: 1,},
    header: {
        ...u.row,
        justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: spacing.p10, marginBottom: spacing.p10,
    },
    title: {...t.titleXXL,},
    plainText: {...t.label,},
    alignment: {
        ...u.rowCenter, paddingHorizontal: 0,
        paddingVertical: spacing.p8, textAlignVertical: 'center',
    },
    box: {...u.absFill,},
});

const MangaSliderStyles = StyleSheet.create({
    sliderWrapper: {
        marginVertical: spacing.p3, padding: spacing.p7,
        ...u.border2Plum, ...u.bgSand,
        borderColor: colors.plum,
    },
    sliderContainer: {paddingHorizontal: spacing.p5,},
    card: {
        width: 80, alignItems: 'center',
        ...u.bgSand, ...u.border2Cocoa,
        borderRightWidth: 0, padding: spacing.p5,
    },
    lastCard: {borderRightWidth: borders.bw2,},
    image: { width: 100, height: 90, marginBottom: spacing.p5,},
    title: {color: '#fff', fontSize: 14, textAlign: 'center',},
    outerWrap: { width: '100%', alignItems: 'center', paddingHorizontal: spacing.p12 },
});

const NavBarStyles = StyleSheet.create({
    container: {
        ...u.row, ...u.bgSand,
        alignItems: 'stretch', width: '100%',
        height: 50, overflow: 'hidden',
    },
    navItem: {...ux.navItemBase,},
    navItemLast: { borderRightWidth: 2 },
});

const IconStyles = StyleSheet.create({
    iconContainer: {
        padding: 0, alignItems: 'center',
        ...u.row, ...u.full,
        justifyContent: 'flex-end',
    },
    profileImage: {width: 40, height: 40, borderRadius: 20,},
});

const AnchorStyles = StyleSheet.create({
    scrollButtonUp: {...AnchorBase.button, ...AnchorBase.posUp,},
    scrollButtonDown: {...AnchorBase.button, ...AnchorBase.posDown,},
    scrollButtonOverlay: {...AnchorBase.overlay,},
    arrowText: { color: colors.plum, fontSize: 18 },
});

const CardViewStyles = StyleSheet.create({
    gridCard: {overflow: 'hidden',},
    gridImage: {flex: 1, ...u.bgSand,},
    gridTitle: {marginTop: spacing.p6, ...t.label,},
    rowCard: {...u.rowCenter, padding: spacing.p10, ...u.bgSand,},
    rowImage: {
        borderColor: colors.creamWhite, width: 50,
        backgroundColor: colors.cocoa, height: 70,
    },
    rowTextWrap: {...u.full, marginLeft: 12,},
    rowTitle: {...t.body, fontWeight: '700', marginBottom: 2,},
    placeholder: {...ux.cellItem,},
    footer: {paddingVertical: 16, alignItems: 'center',},
    footerEnd: {paddingVertical: 15, alignItems: 'center',},
    footerText: {marginTop: spacing.p6, ...u.textCocoa, opacity: 0.8,},
    emptyWrap: {...u.full, alignItems: 'center', justifyContent: 'center',},
    emptyText: {marginTop: 8, ...u.textCocoa,},
    title: {color: colors.creamWhite, fontSize: 14, textAlign: 'center',},
    // --- Added centralized helpers for CardView
    gridItemFrame: { alignItems: 'center', justifyContent: 'center' },
    gridMedia: {
        width: '92%', height: '86%', alignItems: 'center',
        justifyContent: 'center', borderRadius: 8,
    },
    mediaFull: { width: '100%', height: '100%' },
    rowMediaBase: { alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
    rowTextCenter: { flex: 1, justifyContent: 'center' },
});

const SplashScreenStyles = StyleSheet.create({
    container: {
        ...u.full, backgroundColor: colors.creamWhite,
        justifyContent: 'center', alignItems: 'center',
    },
    text: {fontSize: 24, fontWeight: '600', color: colors.splashText,
    },
});

const GenreSliderStyles = StyleSheet.create({
    genrePill: {
        ...u.bgSand, ...u.border2Cocoa,
        borderRadius: borders.br20, marginRight: 8,
        paddingHorizontal: 15, paddingVertical: 6,
    },
    genreSlider: {alignItems: 'flex-start', paddingTop: 0,},
    outerWrap: { width: '100%', alignItems: 'center', paddingHorizontal: spacing.p12 },
    rowWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start' },
});

const SearchBarStyles = StyleSheet.create({
    searchBar: {...u.border2Cocoa, padding: spacing.p8, paddingHorizontal: 50,},
    filter: {...u.border2Cocoa, padding: spacing.p5, marginLeft: spacing.p23,},
    order: {
        ...u.border2Cocoa, borderRadius: borders.br20,
        padding: spacing.p8, marginRight: spacing.p21,
    },
    input: {...u.full, fontSize: 16, ...u.textCocoa,},
    searchRow: {
        flex: 1, flexDirection: 'row', alignItems: 'center',
        paddingLeft: 0, paddingRight: spacing.p8,
    },
    searchIconBtn: { paddingLeft: spacing.p8, paddingRight: spacing.p8, justifyContent: 'center' },
    hamburger: { color: colors.cocoa },
});

const UpdatedStyles = StyleSheet.create({
    container: {
        ...u.row, ...u.bgLavender,
        alignItems: 'stretch', height: 55,
        width: '100%', overflow: 'hidden',
    },
    navItem: {
        ...ux.navItemBase, justifyContent: 'center',
        alignItems: 'flex-end', padding: spacing.p20,
        paddingVertical: spacing.p13,
    },
});

const SettingButtonStyles = StyleSheet.create({
    grid: {
        padding: spacing.p10, borderColor: colors.cocoa,
        backgroundColor: colors.lavender, ...u.row,
        flexWrap: 'wrap', justifyContent: 'space-between',
        alignItems: 'flex-start', gap: 12,
    },
    icon: {fontSize: 35,color: colors.plum,},
    cell: {
        width: '30%',minWidth: 96, gap: 8,
        alignItems: 'center',marginBottom: 16,
    },
    button: {
        alignItems: 'center', aspectRatio: 1,
        ...u.border3Plum, ...u.bgSand,
        width: '100%', justifyContent: 'center',

    },
    cellLabel: { color: colors.plum, fontWeight: '700', textAlign: 'center',},
    flag: {fontSize: 35, lineHeight: 30,},
});

const FeedbackStyles = StyleSheet.create({
    text: {
        fontSize: 16, fontWeight: '600',
        ...u.textPlum, ...u.border2Plum,
        padding: spacing.p5, marginTop: spacing.p13,
        marginHorizontal: spacing.p10,
    },
    headerRow: { ...u.rowCenter, justifyContent: 'space-between', marginBottom: spacing.p7 },
    grid: {
        flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', alignSelf: 'center',
        borderColor: colors.plum, marginTop: 90,
        backgroundColor: colors.lavender, gap: 12,
        flexWrap: 'wrap',
        
    },
    button: {...u.rowCenter, marginBottom: 20,},
    buttonTight: { marginBottom: 0 },
    wrapper: {
        paddingHorizontal: spacing.p12, paddingTop: spacing.p10,
        paddingBottom: spacing.p8, backgroundColor: colors.lavender,
        borderColor: colors.plum, borderBottomWidth: 0,
        marginTop: 70,
    },
    actionBtnPlaceholder: {width: 72, height: 32,},
    divider: {marginTop: spacing.p6, height: 2, backgroundColor: colors.plum,},
    screen: {...u.full, backgroundColor: colors.lavender,},
    body: {padding: spacing.p16, gap: 12,},
    item: {
        ...u.border2Cocoa, ...u.bgSand, ...u.rowCenter,
        paddingVertical: 14,paddingHorizontal: 12,
        justifyContent: 'space-between',
    },
    itemText: {
        ...u.textCocoa, fontSize: 16,
        fontWeight: '700', textAlign: 'center',
    },
    caret: {marginLeft: 12, fontSize: 16,
    },
    dropdown: {borderWidth: 1, overflow: 'hidden', marginTop: 8,},
    option: {paddingVertical: 14, paddingHorizontal: 16,},
    optionPressed: {opacity: 0.7,},
    helper: {marginTop: 12, opacity: 0.6,},
});

const SubmitButtonStyles = StyleSheet.create({
    item: {
        ...ux.cellItem, ...u.rowCenter,
        paddingVertical: 14, justifyContent: 'center',
        marginLeft: 130, marginRight: 130,
    },
});

const confirmationStyles = StyleSheet.create({
    backdrop: {
        ...u.full, backgroundColor: 'rgba(0,0,0,0.4)',
        alignItems: 'center', justifyContent: 'center',
    },
    card: {
        backgroundColor: colors.paleLavender, width: '80%',
        padding: spacing.p16, height: '40%',
        ...u.border2Plum,
    },
    alignEnd: { alignItems: 'flex-end' },
    cancelTextDelta: { paddingVertical: 7 },
    titleDelta: { fontSize: 25, marginLeft: 70 },
    messageDelta: { fontSize: 18, marginLeft: 20, paddingBottom: 30 },
    confirmTextDelta: { width: 80, paddingVertical: 7, marginLeft: 110 },
});

const ChangeLoginStyles = StyleSheet.create({
    button: {
        paddingVertical: 10, marginRight: 12,
        paddingHorizontal: spacing.p16, borderWidth: 2,
        backgroundColor: colors.sand, alignItems: 'center',
        borderColor: colors.cocoa,
    },
    typed: {
        ...u.textCocoa, paddingHorizontal: spacing.p12,
        paddingVertical: spacing.p12, fontSize: 16,
    },
    typeBox: {
        backgroundColor: colors.sand, borderWidth: 2,
        borderColor: colors.cocoa, marginBottom: spacing.p10,
    },
    text: {...u.textCocoa, fontSize: 16, fontWeight: '600',},
    bannerWrap: {
        position: 'absolute', top: 150, left: 0, 
        right: 0, alignItems: 'center', zIndex: z.banner,
    },
    bannerBox: {
        backgroundColor: colors.paleLavender, borderRadius: borders.br8,
        paddingVertical: 10, paddingHorizontal: 12,
        borderWidth: 1, borderColor: colors.plum,
    },
    bannerText: {color: colors.plum, fontSize: 14,
    },
    kbdWrap: { ...u.full },
    overlay: { ...adminUI.overlayBase, backgroundColor: colors.overlayScrim },
    card: { 
        ...adminUI.cardBase, width: '90%', 
        backgroundColor: colors.modalPurple, 
        borderWidth: 2, borderColor: colors.dark 
    },
    title: { color: colors.creamWhite, fontSize: 18, fontWeight: '600', marginBottom: spacing.p12 },
    errorText: { color: colors.error, marginBottom: spacing.p8,
    },
    successText: {color: colors.success, marginBottom: spacing.p8,},
    helpText: {color: colors.creamWhite, fontSize: 12, marginBottom: spacing.p12,},
    actionsRow: {...u.row, justifyContent: 'flex-end',},
});

const AdminTabStyles = StyleSheet.create({
    header: { 
        ...u.rowCenter, marginTop: 60, paddingBottom: 7,
        borderBottomWidth: 3, borderColor: colors.deepPlum 
        },
    button: {
        paddingVertical: 10, paddingHorizontal: spacing.p16, 
        marginHorizontal: 12, backgroundColor: colors.deepPlum, 
        borderWidth: 2, borderColor: colors.dark,
        alignItems: 'center', width: 70,
    },
    tabsWrap: {
        position: 'relative', height: 50, 
        borderBottomWidth: 3, borderBottomColor: colors.deepPlum,
        overflow: 'hidden', backgroundColor: colors.lavender,
    },
    activeHalf: { 
        position: 'absolute', top: 0, 
        bottom: 0, width: '50%', 
        backgroundColor: colors.deepPlum, zIndex: 0 
    },
    diagonalRight: {
        position: 'absolute', top: 0, width: 0, height: 0,
        borderTopWidth: 48, borderTopColor: colors.deepPlum,
        borderRightWidth: 20, borderRightColor: 'transparent', zIndex: 1,
    },
    tabHit: { 
        position: 'absolute', top: 0, 
        bottom: 0, justifyContent: 'center', 
        paddingHorizontal: spacing.p15, zIndex: 2
    },
    tabLeft: { left: 0, width: '45%', alignItems: 'center' },
    tabRight: { right: 0, width: '50%', alignItems: 'center' },
    text: { fontSize: 16, color: colors.deepPlum, fontWeight: '700' },
    panel: { 
        marginHorizontal: 24, marginTop: 12, 
        marginBottom: 8, zIndex: 500, 
        borderRadius: 0, alignSelf: 'center' 
    },
    addBtnPressed: { opacity: 0.75 },
});

const AdminCommonStyles = StyleSheet.create({
    dataRow: { 
        ...u.row, borderLeftWidth: 1, 
        borderRightWidth: 1, borderTopWidth: 1, 
        borderColor: colors.deepPlum },
    dataCell: { 
        justifyContent: 'center', alignItems: 'center', 
        borderRightWidth: 1, borderRightColor: colors.deepPlum 
    },
});

const AdminSearchBarStyles = StyleSheet.create({
    wrap: {
        paddingHorizontal: spacing.p12, paddingTop: spacing.p8,
        paddingBottom: spacing.p10, borderBottomWidth: 1,
        borderBottomColor: colors.deepPlum, backgroundColor: colors.lavender,
        position: 'relative',
    },
    hLine: {
        width: 18, marginVertical: 1.5,
        height: 2, backgroundColor: colors.deepPlum,
    },
    queryBox: {
        ...u.full, backgroundColor: colors.paleLavender,
        borderWidth: 1, borderColor: colors.deepPlum,
    },
    iconBtn: {
        width: 34, borderColor: colors.deepPlum,
        height: 34, backgroundColor: colors.paleLavender,
        borderWidth: 1, alignItems: 'center',
        justifyContent: 'center',
    },
    checkText: {color: colors.deepPlum, fontSize: 18, fontWeight: '800',},
    dropdown: {borderColor: colors.deepPlum, backgroundColor: colors.paleLavender, borderRadius: 0,},
    // --- Added centralized row and dropdown styles for admin search bar
    queryRow: { flexDirection: 'row', alignItems: 'center', gap: 10, zIndex: 700 },
    fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 2, flex: 1 },
    fieldPickerWrap: { width: 104, zIndex: 3000 },
    ddText: { color: colors.deepPlum, fontWeight: '600' as const, fontSize: 12 },
    ddPlaceholder: { color: colors.mutedPlum },
    ddSelectedContainer: { backgroundColor: colors.paleLavender, borderTopWidth: 1, borderBottomWidth: 1 },
    ddSelectedLabel: { fontWeight: '800' as const },
    input: { flex: 1, textAlign: 'center' as const, height: 32, fontSize: 16 },
});

const CreateUserStyles = StyleSheet.create({
    overlay: { 
        ...adminUI.overlayBase, backgroundColor: 
        colors.overlayScrim, padding: 16 
    },
    card: { 
        ...adminUI.cardBase, width: '100%', 
        backgroundColor: colors.deepPlum, maxWidth: 560, 
        borderColor: colors.lavender, borderWidth: 1,
        },
    headerRow: { 
        ...adminUI.headerRowBase, marginBottom: 12,
        paddingBottom: 15, borderBottomWidth: 2, 
        borderBottomColor: colors.lavender 
        },
    headerTitleAlt: { color: colors.paleLavender },
    smallBtn: { ...adminUI.smallBtn },
    smallBtnDisabled: { ...adminUI.smallBtnDisabled },
    smallBtnText: { ...adminUI.smallBtnText },
    inputBlock: { marginTop: 10 },
    inputLabel: { ...adminUI.inputLabel },
    input: { ...adminUI.input },
    levelRow: { ...adminUI.levelRow },
    levelChip: { ...adminUI.levelChip, marginRight: 8, marginBottom: 15 },
    levelChipActive: { ...adminUI.levelChipActive },
    levelChipText: { ...adminUI.levelChipText },
});

const AdminHeaderStyles = StyleSheet.create({
    backText: { color: colors.paleLavender, fontWeight: '600' as const },
    titleCenter: { flex: 1, textAlign: 'center' as const, color: colors.deepPlum },
    spacer: { width: 70, marginRight: 15 },
    activeText: { color: colors.lavender },
    diagonalCenter: { left: '50%' as const },
    diagonalTopDeep: { borderTopColor: colors.deepPlum },
    diagonalTopLav: { borderTopColor: colors.lavender },
});

const AdminFiltersStyles = StyleSheet.create({
    overlayCenter: { ...adminUI.overlayBase },
    overlayDim: { ...u.absFill, backgroundColor: colors.overlayScrim, zIndex: 1 },
    organizerCard: { 
        zIndex: 2, width: '82%', maxHeight: '70%', 
        backgroundColor: colors.paleLavender, 
        borderColor: colors.deepPlum, borderWidth: 2 
    },
    filtersCard: { 
        borderWidth: 2, width: 180, 
        backgroundColor: colors.paleLavender, 
        borderColor: colors.deepPlum, zIndex: 2 
    },
    headerRow: { 
        ...u.row, paddingHorizontal: spacing.p12,
        alignItems: 'center', borderColor: colors.deepPlum,
        paddingVertical: spacing.p10, borderBottomWidth: 2, 
        justifyContent: 'space-between',
    },
    headerTitle: { fontSize: 16, color: colors.deepPlum, fontWeight: '700' as const },
    rowBase: { paddingVertical: 10, paddingHorizontal: 12, borderColor: colors.deepPlum },
    rowActive: { 
        backgroundColor: colors.paleLavender, 
        borderTopWidth: 2, borderBottomWidth: 2, 
        borderLeftWidth: 2, borderRightWidth: 2 
    },
    rowFirst: { borderTopWidth: 0 },
    rowText: { fontSize: 14, color: colors.deepPlum, fontWeight: '500' as const },
    rowTextHeavy: { fontSize: 14, color: colors.deepPlum, fontWeight: '900' as const },
    filterRow: { 
        ...u.row, borderColor: colors.deepPlum,
        paddingVertical: 10, paddingHorizontal: 12, 
        borderBottomWidth: 0, alignItems: 'center',
    },
    checkbox: { 
        width: 18, height: 18, 
        marginRight: 10, borderWidth: 2, 
        borderColor: colors.deepPlum 
    },
    checkboxChecked: { backgroundColor: colors.deepPlum },
    checkText: { 
        color: colors.paleLavender, marginTop: -1,
        textAlign: 'center' as const, lineHeight: 16, 
    },
});

const CommentModalStyles = StyleSheet.create({
    cardNoPad: { padding: 0 },
    headerDelta: { 
        paddingVertical: 15, textAlign: 'center' as const, 
        borderColor: colors.plum, borderBottomWidth: 2,
    },
    scroll: { maxHeight: 350 },
    bodyText: { fontSize: 14, color: colors.deepPlum, margin: 20 },
    closeBtn: { width: 80, margin: 20, alignSelf: 'center' as const },
    closeText: { color: colors.paleLavender, fontWeight: '600' as const },
    sidStrong: { fontWeight: '600' as const },
});

const GridViewStyles = StyleSheet.create({
    headerRow: { borderBottomWidth: 2, backgroundColor: colors.deepPlum },
    headerText: { color: colors.paleLavender },
    footerDivider: { height: 0, borderBottomWidth: 2, borderBottomColor: colors.deepPlum },
    itemDivider: { height: 0, borderTopWidth: 1, borderTopColor: colors.cocoa },
});

const RowViewStyles = StyleSheet.create({
    row: { backgroundColor: colors.lavender },
    textNormal: { fontWeight: '400' },
});

const LoadingRowStyles = StyleSheet.create({
    row: { ...u.row, borderLeftWidth: 1, borderRightWidth: 1 },
    cell: { justifyContent: 'center', alignItems: 'center', borderRightWidth: 1 },
    shimmer: { height: 12, borderRadius: 6 },
});

export {
colors, u, ux, spacing, t, adminUI,
GeneralStyles, MangaSliderStyles, NavBarStyles,
IconStyles, AnchorStyles, CardViewStyles,
SplashScreenStyles, GenreSliderStyles, SearchBarStyles,
UpdatedStyles, SettingButtonStyles, FeedbackStyles,
SubmitButtonStyles, confirmationStyles, ChangeLoginStyles,
AdminTabStyles, AdminCommonStyles, AdminSearchBarStyles,
AdminHeaderStyles, AdminFiltersStyles, CreateUserStyles,
CommentModalStyles, GridViewStyles, LoadingRowStyles,
RowViewStyles,
};