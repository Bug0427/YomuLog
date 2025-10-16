// styles/global.ts
import { StyleSheet } from 'react-native';

const GeneralStyles = StyleSheet.create({
    container: {
        backgroundColor: '#AFA6DD',
        paddingTop: 52,
        paddingHorizontal: 7,
        flex: 1,
    },
    section: {
        backgroundColor: '#AFA6DD',
        paddingHorizontal: 0,
        paddingBottom: 24,
        flex: 1,
    },
    h1: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#463B54',
        textShadowColor: '#D7D2EE',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 1,
        paddingTop: 18,
    },
    scrollContainer: {
        backgroundColor: '#AFA6DD',
        flexGrow: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 10,
        marginBottom: 10,
    },
    title: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#463B54',
        textShadowColor: '#D7D2EE',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 1,
    },
    plainText:{
        fontSize: 12,
        fontWeight: '600',
        color: '#543C27',
    },
    alignment: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 0,
        paddingVertical: 8,
        textAlignVertical: 'center',
    },
});

const MangaSliderStyles = StyleSheet.create({
    sliderWrapper: {
        marginVertical: 3,
        padding: 7,
        borderWidth: 2,
        borderColor: '#463B54',
        backgroundColor: '#E3D3BD',
    },
    sliderContainer: {
        paddingHorizontal: 5,
    },
    card: {
        width: 80,
        alignItems: 'center',
        backgroundColor: '#E3D3BD',
        borderWidth: 2,
        borderRightWidth: 0,
        borderColor: '#543C27',
        padding: 5,
    },
    lastCard: {
        borderRightWidth: 2,
    },
    image: {
        width: 100,
        height: 90,
        marginBottom: 5,
    },
    title: {
        color: '#fff',
        fontSize: 14,
        textAlign: 'center',
    },
});

const NavBarStyles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'stretch',
        backgroundColor: '#E3D3BD',
        width: '100%',
        height: 50,
        overflow: 'hidden',
    },
    navItem: {
        flex: 1,
        borderWidth: 2,
        borderRightWidth: 0,
        borderColor: '#543C27',
        justifyContent: 'center',
        alignItems: 'center',
    },
});

const IconStyles = StyleSheet.create({
    iconContainer: {
        padding: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        flex: 1,
    },
    profileImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
});

const AnchorStyles = StyleSheet.create({
    scrollButtonUp: {
        position: 'absolute',
        right: 10,
        bottom: 105,
        zIndex: 10,
        padding: 3,
        paddingHorizontal: 5,
        elevation: 3,
        borderWidth: 2,
        borderColor: '#463B54',
    },
    scrollButtonDown: {
        position: 'absolute',
        right: 10,
        bottom: 65,
        zIndex: 10,
        padding: 3,
        paddingHorizontal: 5,
        elevation: 3,
        borderWidth: 2,
        borderColor: '#463B54',
    },
    scrollButtonColor: {
        color: '#463B54',
    },
    scrollButtonOverlay: {
        zIndex: 9999,
        elevation: 6,
        backgroundColor: '#AFA6DD',
        paddingHorizontal: 6,
        paddingVertical: 4,
    },
    scrollButtonIcon: {
        fontSize: 18,
    },
});

const CardViewStyles = StyleSheet.create({
    gridCard: {
        overflow: 'hidden',
    },
    gridImage: {
        flex: 1,
        backgroundColor: '#E3D3BD',
    },
    gridTitle: {
        marginTop: 6,
        fontSize: 12,
        fontWeight: '600',
        color: '#543C27',
    },
    rowCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        backgroundColor: '#E3D3BD',
    },
    rowImage: {
        width: 50,
        height: 70,
        backgroundColor: '#543C27',
        borderColor: '#fff',
    },
    rowTextWrap: {
        flex: 1,
        marginLeft: 12,
    },
    rowTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#543C27',
        marginBottom: 2,
    },
    placeholder: {
        borderWidth: 2,
        borderColor: '#543C27',
        backgroundColor: '#E3D3BD',
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
        marginTop: 6,
        color: '#543C27',
        opacity: 0.8,
    },
    emptyWrap: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        marginTop: 8,
        color: '#543C27',
    },
});

const SplashScreenStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff8f0',
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
        backgroundColor: '#E3D3BD',
        borderColor: '#543C27',
        borderWidth: 2,
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 6,
        marginRight: 8,
    },
    genreSlider: {
        alignItems:'flex-start',
        paddingTop: 0,
    },
});

const SearchBarStyles = StyleSheet.create({
    searchBar: {
            borderColor: '#543C27',
            borderWidth: 2,
            padding: 8,
            paddingHorizontal: 50,
    },
    filter: {
        borderColor: '#543C27',
        borderWidth: 2,
        padding: 5,
        marginLeft: 23,
    },
    order: {
        borderColor: '#543C27',
        borderWidth: 2,
        borderRadius: 20,
        padding: 8,
        marginRight: 21,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#543C27',
    },
})
const UpdatedStyles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'stretch',
        backgroundColor: '#AFA6DD',
        width: '100%',
        height: 55,
        overflow: 'hidden',
    },
    navItem: {
        flex: 1,
        borderWidth: 2,
        borderRightWidth: 0,
        borderColor: '#543C27',
        justifyContent: 'center',
        alignItems: 'flex-end',
        padding: 20,
        paddingVertical: 13,
    },
    Text:{
        fontSize: 20,
        fontWeight: '500',
        color: '#463B54',
    },
})
const SettingButtonStyles = StyleSheet.create({
    Grid: {
        padding: 10,
        borderColor: '#543C27',
        backgroundColor: '#AFA6DD',
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 12,
    },
    Icon: {
        fontSize: 35,
        color: "#463B54",
    },
    Cell: {
        width: '30%',
        minWidth: 96,
        alignItems: 'center',
        marginBottom: 16,
        gap: 8,
    },
    Button: {
        width: '100%',
        aspectRatio: 1,
        borderWidth: 3,
        borderColor: '#463B54',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#E3D3BD',
    },
    CellLabel: {
        color: '#463B54',
        fontWeight: '700',
        textAlign: 'center',
    },
    Flag: {
        fontSize: 35,
        lineHeight: 30,
    },
    
})
const FeedBackStyles = StyleSheet.create({
    Text:{
        fontSize: 16, 
        fontWeight: '600', 
        color: '#463B54',
        borderWidth: 2,
        borderColor:'#463B54',
        padding: 5,
        marginTop: 13,
        marginHorizontal: 10,
    },
    grid:{
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        alignSelf: 'center',
        borderColor: '#463B54',
        backgroundColor: '#AFA6DD',
        flexWrap: 'wrap',
        gap: 12,
        marginTop: 90,
    },
    Button:{
        flexDirection: 'row', 
        alignItems: 'center', 
        marginBottom: 20
    },
    wrapper: {
        paddingHorizontal: 12,
        paddingTop: 10,
        paddingBottom: 8,
        backgroundColor: '#AFA6DD',
        borderColor: '#463B54',
        borderBottomWidth: 0,
        marginTop: 70,
    },
    actionBtnPlaceholder: {
        width: 72,
        height: 32,
    },
    divider: {
        marginTop: 6,
        height: 2,
        backgroundColor: '#463B54',
    },
    screen: {
        flex: 1,
        backgroundColor: '#AFA6DD',
    },
    body: {
        padding: 16,
        gap: 12,
    },
    item: {
        borderWidth: 2,
        borderColor: '#543C27',
        backgroundColor: '#E3D3BD',
        paddingVertical: 14,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    itemText: {
        color: '#543C27',
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
})
const SubmitButtonStyles = StyleSheet.create({
item: {
        borderWidth: 2,
        borderColor: '#543C27',
        backgroundColor: '#E3D3BD',
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: "center",
        marginLeft: 130,
        marginRight: 130,
    },

})
const confirmationStyles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    card: {
        backgroundColor: '#bfb9deff',
        padding: 16,
        width: '86%',
        borderWidth:2,
        borderColor: '#463B54',
    },
})
const changeLoginStyle = StyleSheet.create({
    button:{
        paddingVertical: 10, 
        paddingHorizontal: 16, 
        marginRight: 12, 
        backgroundColor: '#E3D3BD',
        borderWidth: 2, 
        borderColor:'543C27' ,
        alignItems: 'center',
        borderBlockColor: '#543C27'
    },
    typed:{
        color: '#543C27', 
        paddingHorizontal: 12, 
        paddingVertical: 12, 
        fontSize: 16
    },
    typeBox:{
        backgroundColor: '#E3D3BD', 
        borderWidth: 2, 
        borderColor: '#543C27', 
        marginBottom: 10
    },
    text:{
        color: '#543C27', 
        fontSize: 16, 
        fontWeight: '600'
    },

})
const adminTabStyles = StyleSheet.create({
    header:{
        flexDirection: 'row', 
        alignItems: 'center', 
        marginTop: 60, 
        paddingBottom: 7, 
        borderBottomWidth: 3, 
        borderColor: '#412d5cff'
    },
    button:{
        paddingVertical: 10, 
        paddingHorizontal: 16, 
        marginHorizontal: 12, 
        backgroundColor: '#412d5cff',
        borderWidth: 2, 
        borderColor:'543C27' ,
        alignItems: 'center',
        width: 70,
    },
    tabsWrap: {
        position: 'relative',
        height: 50,
        borderBottomWidth: 3,
        borderBottomColor: '#412d5cff',
        overflow: 'hidden',
        backgroundColor: '#AFA6DD',
    },
    activeHalf: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: '50%',
        backgroundColor: '#412d5cff',
        zIndex: 0,
    },
    diagonalRight: {
        position: 'absolute',
        top: 0,
        width: 0,
        height: 0,
        borderTopWidth: 48,
        borderTopColor: '#412d5cff',
        borderRightWidth: 20,
        borderRightColor: 'transparent',
        zIndex: 1,
    },
    tabHit: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        justifyContent: 'center',
        paddingHorizontal: 15,
        zIndex: 2,
    },
    tabLeft: 
    { 
        left: 0, 
        width: '45%', 
        alignItems: 'center',
    },
    tabRight:{ 
        right: 0, 
        width: '50%', 
        alignItems: 'center',
    },
    text:
    {
        fontSize: 16,
        color: '#412d5cff',
        fontWeight: '700',
}

})
const adminCommonStyles = StyleSheet.create({
    dataRow: {
        flexDirection: 'row',
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: '#412d5cff',
        borderTopWidth: 1,

    },
    dataCell: {
        justifyContent: 'center',
        alignItems: 'center',
        borderRightWidth: 1,
        borderRightColor: '#412d5cff',
    },

})
const AdminSearchBarStyles = StyleSheet.create({
    wrap: {
        paddingHorizontal: 12,
        paddingTop: 8,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#412d5cff',
        backgroundColor: '#AFA6DD',
        position: 'relative',
    },
    hLine: {
        width: 18,
        height: 2,
        backgroundColor: '#412d5cff',
        marginVertical: 1.5,
    },
    queryBox: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#412d5cff',
        backgroundColor: '#bfb9deff',
    },
    iconBtn: {
        width: 34,
        height: 34,
        borderWidth: 1,
        borderColor: '#412d5cff',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#bfb9deff',
    },
    checkText: {
        color: '#412d5cff',
        fontSize: 18,
        fontWeight: '800',
    },
    dropdown:{
        borderColor: '#412d5cff', 
        backgroundColor: '#bfb9deff', 
        borderRadius: 0

    }
});


export {
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
    FeedBackStyles,
    SubmitButtonStyles,
    confirmationStyles,
    changeLoginStyle, 
    adminTabStyles,
    adminCommonStyles,
    AdminSearchBarStyles
    };