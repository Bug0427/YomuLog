// styles/global.ts (refactored: tokens + utilities + zero-visual-change)

// -----------------------------
// Tokens
// -----------------------------
import { StyleSheet } from 'react-native';

const colors = {
lavender: '#AFA6DD',
sand: '#E3D3BD',
plum: '#463B54',
cocoa: '#543C27',
deepPlum: '#412d5cff',   // with alpha as originally used
paleLavender: '#bfb9deff',
highlight: '#D7D2EE',
creamWhite: '#fff8f0',
white: '#ffffff',
};

const z = {
upBtn: 10,
overlay: 9999,
overlayElev: 6,
};

const borders = {
bw1: 1 as const,
bw2: 2 as const,
bw3: 3 as const,
br20: 20 as const,
};

const spacing = {
p0: 0,
p3: 3,
p4: 4,
p5: 5,
p6: 6,
p7: 7,
p8: 8,
p10: 10,
p12: 12,
p13: 13,
p14: 14,
p15: 15,
p16: 16,
p18: 18,
p20: 20,
p21: 21,
p23: 23,
p24: 24,
p50: 50,
};

// -----------------------------
// Utilities / primitives
// (spread into concrete styles; no visual change)
// -----------------------------
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
};

// Shared composed presets (built from u)
const ux = {
cellItem: { ...u.border2Cocoa, ...u.bgSand },
navItemBase: { flex: 1 as const, ...u.border2Cocoa, borderRightWidth: 0, ...u.center },
};

// Typography presets (optional helpers; zero visual change)
const t = {
h1: {
    fontSize: 20 as const,
    fontWeight: 'bold' as const,
    ...u.textPlum,
    textShadowColor: colors.highlight,
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
},
titleXXL: { fontSize: 36 as const, fontWeight: 'bold' as const, ...u.textPlum },
label: { fontSize: 12 as const, fontWeight: '600' as const, ...u.textCocoa },
body: { fontSize: 16 as const, ...u.textCocoa },
};

// Anchors (base + position variants)
const AnchorBase = {
button: {
    position: 'absolute' as const,
    right: 10,
    zIndex: z.upBtn,
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

// -----------------------------
// Styles (names preserved)
// -----------------------------
const GeneralStyles = StyleSheet.create({
container: {
    ...u.bgLavender,
    paddingTop: 52,
    paddingHorizontal: 7,
    ...u.full,
},
section: {
    ...u.bgLavender,
    paddingHorizontal: 0,
    paddingBottom: spacing.p24,
    ...u.full,
},
h1: {
    ...t.h1,
    paddingTop: spacing.p18,
},
scrollContainer: {
    ...u.bgLavender,
    flexGrow: 1,
},
header: {
    ...u.row,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.p10,
    marginBottom: spacing.p10,
},
title: {
    ...t.titleXXL,
},
plainText: {
    ...t.label,
},
alignment: {
    ...u.rowCenter,
    paddingHorizontal: 0,
    paddingVertical: spacing.p8,
    textAlignVertical: 'center',
},
box: {
    ...u.absFill,
},
});

const MangaSliderStyles = StyleSheet.create({
sliderWrapper: {
    marginVertical: spacing.p3,
    padding: spacing.p7,
    ...u.border2Plum,
    borderColor: colors.plum, // exact original color
    ...u.bgSand,
},
sliderContainer: {
    paddingHorizontal: spacing.p5,
},
card: {
    width: 80,
    alignItems: 'center',
    ...u.bgSand,
    ...u.border2Cocoa,
    borderRightWidth: 0,
    padding: spacing.p5,
},
lastCard: {
    borderRightWidth: borders.bw2,
},
image: {
    width: 100,
    height: 90,
    marginBottom: spacing.p5,
},
title: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
},
});

const NavBarStyles = StyleSheet.create({
container: {
    ...u.row,
    alignItems: 'stretch',
    ...u.bgSand,
    width: '100%',
    height: 50,
    overflow: 'hidden',
},
navItem: {
    ...ux.navItemBase,
},
});

const IconStyles = StyleSheet.create({
iconContainer: {
    padding: 0,
    ...u.row,
    alignItems: 'center',
    justifyContent: 'flex-end',
    ...u.full,
},
profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
},
});

const AnchorStyles = StyleSheet.create({
scrollButtonUp: {
    ...AnchorBase.button,
    ...AnchorBase.posUp,
},
scrollButtonDown: {
    ...AnchorBase.button,
    ...AnchorBase.posDown,
},
scrollButtonOverlay: {
    ...AnchorBase.overlay,
},
});

const CardViewStyles = StyleSheet.create({
gridCard: {
    overflow: 'hidden',
},
gridImage: {
    flex: 1,
    ...u.bgSand,
},
gridTitle: {
    marginTop: spacing.p6,
    ...t.label,
},
rowCard: {
    ...u.rowCenter,
    padding: spacing.p10,
    ...u.bgSand,
},
rowImage: {
    width: 50,
    height: 70,
    backgroundColor: colors.cocoa,
    borderColor: colors.white,
},
rowTextWrap: {
    ...u.full,
    marginLeft: 12,
},
rowTitle: {
    ...t.body,
    fontWeight: '700',
    marginBottom: 2,
},
placeholder: {
    ...ux.cellItem,
},
footer: {
    paddingVertical: 16,
    alignItems: 'center',
},
footerEnd: {
    paddingVertical: 15,
    alignItems: 'center',
},
footerText: {
    marginTop: spacing.p6,
    ...u.textCocoa,
    opacity: 0.8,
},
emptyWrap: {
    ...u.full,
    alignItems: 'center',
    justifyContent: 'center',
},
emptyText: {
    marginTop: 8,
    ...u.textCocoa,
},
});

const SplashScreenStyles = StyleSheet.create({
container: {
    ...u.full,
    backgroundColor: colors.creamWhite,
    justifyContent: 'center',
    alignItems: 'center',
},
text: {
    fontSize: 24,
    fontWeight: '600',
    color: '#8e6e53',
},
});

const GenreSliderStyles = StyleSheet.create({
genrePill: {
    ...u.bgSand,
    ...u.border2Cocoa,
    borderRadius: borders.br20,
    paddingHorizontal: 15,
    paddingVertical: 6,
    marginRight: 8,
},
genreSlider: {
    alignItems: 'flex-start',
    paddingTop: 0,
},
});

const SearchBarStyles = StyleSheet.create({
searchBar: {
    ...u.border2Cocoa,
    padding: spacing.p8,
    paddingHorizontal: 50,
},
filter: {
    ...u.border2Cocoa,
    padding: spacing.p5,
    marginLeft: spacing.p23,
},
order: {
    ...u.border2Cocoa,
    borderRadius: borders.br20,
    padding: spacing.p8,
    marginRight: spacing.p21,
},
input: {
    ...u.full,
    fontSize: 16,
    ...u.textCocoa,
},
});

const UpdatedStyles = StyleSheet.create({
container: {
    ...u.row,
    alignItems: 'stretch',
    ...u.bgLavender,
    width: '100%',
    height: 55,
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

const SettingButtonStyles = StyleSheet.create({
grid: {
    padding: spacing.p10,
    borderColor: colors.cocoa,
    backgroundColor: colors.lavender,
    ...u.row,
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
},
icon: {
    fontSize: 35,
    color: colors.plum,
},
cell: {
    width: '30%',
    minWidth: 96,
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
},
button: {
    width: '100%',
    aspectRatio: 1,
    ...u.border3Plum,
    alignItems: 'center',
    justifyContent: 'center',
    ...u.bgSand,
},
cellLabel: {
    color: colors.plum,
    fontWeight: '700',
    textAlign: 'center',
},
flag: {
    fontSize: 35,
    lineHeight: 30,
},
});

const FeedbackStyles = StyleSheet.create({
text: {
    fontSize: 16,
    fontWeight: '600',
    ...u.textPlum,
    ...u.border2Plum,
    padding: spacing.p5,
    marginTop: spacing.p13,
    marginHorizontal: spacing.p10,
},
grid: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    borderColor: colors.plum,
    backgroundColor: colors.lavender,
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 90,
},
button: {
    ...u.rowCenter,
    marginBottom: 20,
},
wrapper: {
    paddingHorizontal: spacing.p12,
    paddingTop: spacing.p10,
    paddingBottom: spacing.p8,
    backgroundColor: colors.lavender,
    borderColor: colors.plum,
    borderBottomWidth: 0,
    marginTop: 70,
},
actionBtnPlaceholder: {
    width: 72,
    height: 32,
},
divider: {
    marginTop: spacing.p6,
    height: 2,
    backgroundColor: colors.plum,
},
screen: {
    ...u.full,
    backgroundColor: colors.lavender,
},
body: {
    padding: spacing.p16,
    gap: 12,
},
item: {
    ...u.border2Cocoa,
    ...u.bgSand,
    paddingVertical: 14,
    paddingHorizontal: 12,
    ...u.rowCenter,
    justifyContent: 'space-between',
},
itemText: {
    ...u.textCocoa,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
},
caret: {
    marginLeft: 12,
    fontSize: 16,
},
dropdown: {
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: 8,
},
option: {
    paddingVertical: 14,
    paddingHorizontal: 16,
},
optionPressed: {
    opacity: 0.7,
},
helper: {
    marginTop: 12,
    opacity: 0.6,
},
});

const SubmitButtonStyles = StyleSheet.create({
item: {
    ...ux.cellItem,
    paddingVertical: 14,
    ...u.rowCenter,
    justifyContent: 'center',
    marginLeft: 130,
    marginRight: 130,
},
});

const confirmationStyles = StyleSheet.create({
backdrop: {
    ...u.full,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
},
card: {
    backgroundColor: colors.paleLavender,
    padding: spacing.p16,
    width: '80%',
    height: '40%',
    ...u.border2Plum,
},
});



const AdminTabStyles = StyleSheet.create({
header: {
    ...u.rowCenter,
    marginTop: 60,
    paddingBottom: 7,
    borderBottomWidth: 3,
    borderColor: colors.deepPlum,
},
button: {
    paddingVertical: 10,
    paddingHorizontal: spacing.p16,
    marginHorizontal: 12,
    backgroundColor: colors.deepPlum,
    borderWidth: 2,
    borderColor: '543C27',
    alignItems: 'center',
    width: 70,
},
tabsWrap: {
    position: 'relative',
    height: 50,
    borderBottomWidth: 3,
    borderBottomColor: colors.deepPlum,
    overflow: 'hidden',
    backgroundColor: colors.lavender,
},
activeHalf: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '50%',
    backgroundColor: colors.deepPlum,
    zIndex: 0,
},
diagonalRight: {
    position: 'absolute',
    top: 0,
    width: 0,
    height: 0,
    borderTopWidth: 48,
    borderTopColor: colors.deepPlum,
    borderRightWidth: 20,
    borderRightColor: 'transparent',
    zIndex: 1,
},
tabHit: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingHorizontal: spacing.p15,
    zIndex: 2,
},
tabLeft: {
    left: 0,
    width: '45%',
    alignItems: 'center',
},
tabRight: {
    right: 0,
    width: '50%',
    alignItems: 'center',
},
text: {
    fontSize: 16,
    color: colors.deepPlum,
    fontWeight: '700',
},
panel: {
    marginHorizontal: 24,
    marginTop: 12,
    marginBottom: 8,
    zIndex: 500,
    borderRadius: 0,
    alignSelf: 'center',
},
addBtnPressed: { opacity: 0.75 },
});

const AdminCommonStyles = StyleSheet.create({
dataRow: {
    ...u.row,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderTopWidth: 1,
    borderColor: colors.deepPlum,
},
dataCell: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.deepPlum,
},
});

const AdminSearchBarStyles = StyleSheet.create({
wrap: {
    paddingHorizontal: spacing.p12,
    paddingTop: spacing.p8,
    paddingBottom: spacing.p10,
    borderBottomWidth: 1,
    borderBottomColor: colors.deepPlum,
    backgroundColor: colors.lavender,
    position: 'relative',
},
hLine: {
    width: 18,
    height: 2,
    backgroundColor: colors.deepPlum,
    marginVertical: 1.5,
},
queryBox: {
    ...u.full,
    borderWidth: 1,
    borderColor: colors.deepPlum,
    backgroundColor: colors.paleLavender,
},
iconBtn: {
    width: 34,
    height: 34,
    borderWidth: 1,
    borderColor: colors.deepPlum,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.paleLavender,
},
checkText: {
    color: colors.deepPlum,
    fontSize: 18,
    fontWeight: '800',
},
dropdown: {
    borderColor: colors.deepPlum,
    backgroundColor: colors.paleLavender,
    borderRadius: 0,
},
});

const CreateUserStyles = StyleSheet.create({
overlay: {
    ...u.full,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
},
card: {
    width: '100%',
    maxWidth: 560,
    borderWidth: 1,
    borderColor: colors.lavender,
    backgroundColor: colors.deepPlum,
    padding: 16,
},
headerRow: {
    ...u.row,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: colors.lavender,
},
smallBtn: {
    borderWidth: 1,
    borderColor: colors.lavender,
    paddingVertical: 6,
    paddingHorizontal: 10,
},
smallBtnDisabled: {
    opacity: 0.6,
},
smallBtnText: {
    color: colors.paleLavender,
    fontWeight: '600',
},
inputBlock: { marginTop: 10 },
inputLabel: {
    color: colors.paleLavender,
    marginBottom: 6,
    fontSize: 12,
},
input: {
    borderWidth: 1,
    borderColor: colors.lavender,
    paddingVertical: 10,
    paddingHorizontal: 12,
    color: colors.paleLavender,
},
levelRow: {
    ...u.row,
    gap: 8,
},
levelChip: {
    borderWidth: 1,
    borderColor: colors.lavender,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 15,
},
levelChipActive: {
    backgroundColor: colors.lavender,
    color: colors.deepPlum,
    fontWeight: '600',
},
levelChipText: {
    color: colors.paleLavender,
    fontWeight: '600',
},
});

// -----------------------------
// Exports
// -----------------------------
export {
colors,        // exposed for reuse if needed
u,             // utilities for composition in components (optional)
ux, t,
GeneralStyles,
MangaSliderStyles,
NavBarStyles,
IconStyles,
AnchorStyles,
CardViewStyles,
SplashScreenStyles,
GenreSliderStyles,
SearchBarStyles,
UpdatedStyles,
SettingButtonStyles,
FeedbackStyles,
SubmitButtonStyles,
confirmationStyles,
AdminTabStyles,
AdminCommonStyles,
AdminSearchBarStyles,
CreateUserStyles,
};