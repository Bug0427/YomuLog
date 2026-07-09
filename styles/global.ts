// styles/global.ts
import { StyleSheet } from 'react-native';
import { colors, borders, spacing, u, ux, t } from '../styles/tokens';

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
    scrollContainer: {...u.bgLavender, flexGrow: 1,},
    header: {
        ...ux.headerRowBase,
        paddingHorizontal: spacing.p10, marginBottom: spacing.p10,
    },
    title: {...t.titleXXL,},
    plainText: {...t.label,},
    alignment: {
        ...u.rowCenter, paddingHorizontal: 0,
        paddingVertical: spacing.p8, textAlignVertical: 'center',
    },
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
    footerText: {marginTop: spacing.p6, ...u.textCocoa, opacity: 0.8,},
    emptyWrap: {...u.full, ...u.center},
    emptyText: {marginTop: 8, ...u.textCocoa,},
    title: {color: colors.creamWhite, fontSize: 14, textAlign: 'center',},
    // --- Centralized helpers for CardView
    gridItemFrame: {...u.center},
    gridMedia: {
        width: '92%', height: '86%', alignItems: 'center',
        justifyContent: 'center', borderRadius: 8,
    },
    mediaFull: { width: '100%', height: '100%' },
    rowMediaBase: { alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
    rowTextCenter: { flex: 1, justifyContent: 'center' },
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

const SettingButtonStyles = StyleSheet.create({
    grid: {
        padding: spacing.p10, borderColor: colors.cocoa,
        backgroundColor: colors.lavender, ...u.row,
        flexWrap: 'wrap', justifyContent: 'space-between',
        alignItems: 'flex-start', gap: 12,
    },
    icon: {fontSize: 35, color: colors.plum,},
    cell: {
        width: '30%', minWidth: 96, gap: 8,
        alignItems: 'center', marginBottom: 16,
    },
    button: {
        ...u.center, aspectRatio: 1,
        ...u.border3Plum, ...u.bgSand,
        width: '100%',
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
        paddingVertical: 14, paddingHorizontal: 12,
        justifyContent: 'space-between',
    },
    itemText: {
        ...u.textCocoa, fontSize: 16,
        fontWeight: '700', textAlign: 'center',
    },
    caret: {marginLeft: 12, fontSize: 16,},
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
        ...ux.overlayBase,
        backgroundColor: colors.overlayScrim,
    },
    card: {
        backgroundColor: colors.paleLavender, width: '80%',
        padding: spacing.p16, height: '40%',
        ...u.border2Plum,
    },
    alignEnd: { alignItems: 'flex-end' },
    cancelTextPad: { paddingVertical: 7 },
    titleDelta: { fontSize: 25, marginLeft: 70 },
    messageDelta: { fontSize: 18, marginLeft: 20, paddingBottom: 30 },
    confirmTextDelta: { width: 80, paddingVertical: 7, marginLeft: 110 },
});

const AdminTabStyles = StyleSheet.create({
    header: { 
        ...u.rowCenter, marginTop: 60, paddingBottom: 7,
        borderBottomWidth: borders.bw3, borderColor: colors.deepPlum 
    },
    button: {
        paddingVertical: 10, paddingHorizontal: spacing.p16, 
        marginHorizontal: 12, backgroundColor: colors.deepPlum, 
        borderWidth: borders.bw2, borderColor: colors.dark,
        alignItems: 'center', width: 70,
    },
    tabsWrap: {
        position: 'relative', height: 50, 
        borderBottomWidth: borders.bw3, borderBottomColor: colors.deepPlum,
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
        ...u.center,
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
        borderWidth: 1, ...u.center,
    },
    checkText: {color: colors.deepPlum, fontSize: 18, fontWeight: '800',},
    dropdown: {borderColor: colors.deepPlum, backgroundColor: colors.paleLavender, borderRadius: 0,},
    // --- Centralized row and dropdown styles for admin search bar
    queryRow: { flexDirection: 'row', alignItems: 'center', gap: 10, zIndex: 700 },
    fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 2, flex: 1 },
    fieldPickerWrap: { width: 104, zIndex: 3000 },
    ddText: { color: colors.deepPlum, fontWeight: '600' as const, fontSize: 12 },
    ddPlaceholder: { color: colors.mutedPlum },
    ddSelectedContainer: { backgroundColor: colors.paleLavender, borderTopWidth: 1, borderBottomWidth: 1 },
    ddSelectedLabel: { fontWeight: '800' as const },
    input: { flex: 1, textAlign: 'center' as const, height: 32, fontSize: 16 },
});

export {
GeneralStyles, 
CardViewStyles, 
SearchBarStyles, 
SettingButtonStyles, 
FeedbackStyles, 
SubmitButtonStyles, 
confirmationStyles,
AdminTabStyles,  
AdminCommonStyles, 
AdminSearchBarStyles,
};