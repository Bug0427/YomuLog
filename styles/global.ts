// styles/global.ts
import { StyleSheet } from 'react-native';

const HomeScreenStyles = StyleSheet.create({
    container: {
        backgroundColor: '#AFA6DD',
        paddingTop: 60,
        paddingHorizontal: 5,
        flexGrow: 1,
        minHeight: '100%',
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
    alignment: {
        flexDirection: 'row',
        paddingTop: 25,
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
        backgroundColor: '#E3D3BD', // soft beige tone for cozy feel
        borderWidth: 2,
        borderRightWidth: 0,
        borderColor: '#543C27', // dark brown border
        padding: 5,
        },
    lastCard: {
        borderRightWidth: 2, // Restore right border
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
    scrollButtonColor:{color: '#463B54',}
});

export { HomeScreenStyles, MangaSliderStyles, NavBarStyles, IconStyles,  AnchorStyles};