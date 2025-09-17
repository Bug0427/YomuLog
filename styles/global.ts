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
        paddingTop: 25,
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
    });

const SearchScreenStyles = StyleSheet.create({
    searchBar: {
        borderColor: '#543C27',
        borderWidth: 2,
        padding: 8,
        paddingHorizontal: 50,
    },
    searchBarIcon: {
        borderColor: '#543C27',
        borderWidth: 2,
        padding: 8,
        borderRightWidth: 0,
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
    alignment: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 8,
        textAlignVertical: 'center',
    },
    defaultColor: {
        color: '#543C27',
    },
    genreSlider: {
        paddingVertical: 5,
        paddingLeft: 10,
        alignItems:'center',
    },
    genrePill: {
        backgroundColor: '#E3D3BD',
        borderColor: '#543C27',
        borderWidth: 2,
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 6,
        marginRight: 8,
    },
    genreText: {
        color: '#543C27',
        fontSize: 13,
        fontWeight: '600',
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
    navText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#543C27',
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
        borderColor: '#AFA6DD',
    },
    scrollButtonDown: {
        position: 'absolute',
        right: 10,
        bottom: 70,
        zIndex: 10,
        padding: 3,
        paddingHorizontal: 5,
        elevation: 3,
        borderWidth: 2,
        borderColor: '#AFA6DD',
    },
    scrollButtonColor: {
        color: '#463B54',
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
export {
    GeneralStyles,
    MangaSliderStyles,
    NavBarStyles,
    IconStyles,
    AnchorStyles,
    SearchScreenStyles,
    CardViewStyles,
    SplashScreenStyles
    };