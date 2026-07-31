import React from 'react';
import ErrorBoundary from '../components/layout/ErrorBoundary';
import ScreenErrorBoundary from '../components/layout/ScreenErrorBoundary';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';

import SplashScreen from '../screens/main/SplashScreen';
import HomeScreen from '../screens/main/HomeScreen';
import SearchScreen from '../screens/main/SearchScreen';
import LibraryScreen from '../screens/main/LibraryScreen';
import DownLoadsScreen from '../screens/main/DownLoadsScreen';
import ManageDownloadsScreen from '../screens/main/ManageDownloadsScreen';
import SettingsScreen from '../screens/main/SettingsScreen';
import RecentlyUpdated from '../screens/main/RecentlyUpdated'
import RecentlyReadScreen from '../screens/main/RecentlyReadScreen'
import ReaderScreen from '../screens/main/ReaderScreen';
import MangaInfoScreen from '../screens/main/MangaInfoScreen';
import FeedBackHome from '../screens/feedback/FeedBackHome'
import FileReport from '../screens/feedback/FileReport'
import AdminScreen from '../screens/admin/AdminScreen'
import LoginScreen from '../screens/account/LoginScreen'
import UserAccount from '../screens/account/UserAccount'
import CreateAccount from '../screens/account/CreateAccount'
import ForgotCredentials from '../screens/account/ForgotCredentials'
import ChooseProfileIcon from '../screens/account/ChooseProfileIcon'
import LeaveRating from '../screens/feedback/LeaveRating';
import LeaveReview from '../screens/feedback/LeaveReview';
import ReadingStatsScreen from '../screens/main/ReadingStatsScreen';
import AuthScreen from '../screens/auth/AuthScreen';
import OnboardingFlow from '../screens/onboarding/OnboardingFlow';
import ReaderThemeSettingsScreen from '../screens/settings/ReaderThemeSettingsScreen';
import UpgradeScreen from '../screens/premium/UpgradeScreen';
import ManageSubscriptionScreen from '../screens/premium/ManageSubscriptionScreen';
import { RootStackParamList } from '../navigation/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Helper: wraps a screen component with a ScreenErrorBoundary.
 * Each screen gets its own error boundary so a crash in one
 * screen only affects that screen, not the entire app.
 */
function withScreenBoundary(
  name: string,
  Component: React.ComponentType<any>
) {
  return function ScreenWrapper(props: any) {
    return (
      <ScreenErrorBoundary screenName={name}>
        <Component {...props} />
      </ScreenErrorBoundary>
    );
  };
}

export default function AppNavigator() {
    return (
        <ErrorBoundary>
        <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Splash"
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            animationDuration: 300,
          }}
        >
            <Stack.Screen name="Splash" getComponent={() => withScreenBoundary('Splash', SplashScreen)} />
            <Stack.Screen name="HomeScreen" getComponent={() => withScreenBoundary('HomeScreen', HomeScreen)} />
            <Stack.Screen name="SearchScreen" getComponent={() => withScreenBoundary('SearchScreen', SearchScreen)} />
            <Stack.Screen name="LibraryScreen" getComponent={() => withScreenBoundary('LibraryScreen', LibraryScreen)} />
            <Stack.Screen name="RecentlyUpdated" getComponent={() => withScreenBoundary('RecentlyUpdated', RecentlyUpdated)} />
            <Stack.Screen name="RecentlyReadScreen" getComponent={() => withScreenBoundary('RecentlyReadScreen', RecentlyReadScreen)} />
            <Stack.Screen name="DownLoadsScreen" getComponent={() => withScreenBoundary('DownLoadsScreen', DownLoadsScreen)} />
            <Stack.Screen name="ManageDownloadsScreen" getComponent={() => withScreenBoundary('ManageDownloadsScreen', ManageDownloadsScreen)} />
            <Stack.Screen name="SettingsScreen" getComponent={() => withScreenBoundary('SettingsScreen', SettingsScreen)} />
            <Stack.Screen name="ReadingStatsScreen" getComponent={() => withScreenBoundary('ReadingStatsScreen', ReadingStatsScreen)} />
            <Stack.Screen name="FeedBackHome" getComponent={() => withScreenBoundary('FeedBackHome', FeedBackHome)} />
            <Stack.Screen name="FileReport" getComponent={() => withScreenBoundary('FileReport', FileReport)} />
            <Stack.Screen name="AdminScreen" getComponent={() => withScreenBoundary('AdminScreen', AdminScreen)} />
            <Stack.Screen name="LoginScreen" getComponent={() => withScreenBoundary('LoginScreen', LoginScreen)} />
            <Stack.Screen name="UserAccount" getComponent={() => withScreenBoundary('UserAccount', UserAccount)} />
            <Stack.Screen name="CreateAccount" getComponent={() => withScreenBoundary('CreateAccount', CreateAccount)} />
            <Stack.Screen name="ForgotCredentials" getComponent={() => withScreenBoundary('ForgotCredentials', ForgotCredentials)} />
            <Stack.Screen name="ChooseProfileIcon" getComponent={() => withScreenBoundary('ChooseProfileIcon', ChooseProfileIcon)} />
            <Stack.Screen name="ReaderScreen" getComponent={() => withScreenBoundary('ReaderScreen', ReaderScreen)} />
            <Stack.Screen name="MangaInfoScreen" getComponent={() => withScreenBoundary('MangaInfoScreen', MangaInfoScreen)} />
            <Stack.Screen name="LeaveRating" getComponent={() => withScreenBoundary('LeaveRating', LeaveRating)} />
            <Stack.Screen name="LeaveReview" getComponent={() => withScreenBoundary('LeaveReview', LeaveReview)} />
            <Stack.Screen name="AuthScreen" getComponent={() => withScreenBoundary('AuthScreen', AuthScreen)} />
            <Stack.Screen name="OnboardingFlow" getComponent={() => withScreenBoundary('OnboardingFlow', OnboardingFlow)} />
            <Stack.Screen name="ReaderThemeSettingsScreen" getComponent={() => withScreenBoundary('ReaderThemeSettingsScreen', ReaderThemeSettingsScreen)} />
            <Stack.Screen name="UpgradeScreen" getComponent={() => withScreenBoundary('UpgradeScreen', UpgradeScreen)} />
            <Stack.Screen name="ManageSubscriptionScreen" getComponent={() => withScreenBoundary('ManageSubscriptionScreen', ManageSubscriptionScreen)} />
        </Stack.Navigator>
        </NavigationContainer>
      </ErrorBoundary>
    );
}
