import React from 'react';
import { Platform } from 'react-native';
import ErrorBoundary from '../components/layout/ErrorBoundary';
import ScreenErrorBoundary from '../components/layout/ScreenErrorBoundary';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createStackNavigator } from '@react-navigation/stack';
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

const Stack = Platform.OS === 'web'
  ? createStackNavigator<RootStackParamList>()
  : createNativeStackNavigator<RootStackParamList>();

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
            <Stack.Screen name="Splash" component={withScreenBoundary('Splash', SplashScreen)} />
            <Stack.Screen name="HomeScreen" component={withScreenBoundary('HomeScreen', HomeScreen)} />
            <Stack.Screen name="SearchScreen" component={withScreenBoundary('SearchScreen', SearchScreen)} />
            <Stack.Screen name="LibraryScreen" component={withScreenBoundary('LibraryScreen', LibraryScreen)} />
            <Stack.Screen name="RecentlyUpdated" component={withScreenBoundary('RecentlyUpdated', RecentlyUpdated)} />
            <Stack.Screen name="RecentlyReadScreen" component={withScreenBoundary('RecentlyReadScreen', RecentlyReadScreen)} />
            <Stack.Screen name="DownLoadsScreen" component={withScreenBoundary('DownLoadsScreen', DownLoadsScreen)} />
            <Stack.Screen name="ManageDownloadsScreen" component={withScreenBoundary('ManageDownloadsScreen', ManageDownloadsScreen)} />
            <Stack.Screen name="SettingsScreen" component={withScreenBoundary('SettingsScreen', SettingsScreen)} />
            <Stack.Screen name="ReadingStatsScreen" component={withScreenBoundary('ReadingStatsScreen', ReadingStatsScreen)} />
            <Stack.Screen name="FeedBackHome" component={withScreenBoundary('FeedBackHome', FeedBackHome)} />
            <Stack.Screen name="FileReport" component={withScreenBoundary('FileReport', FileReport)} />
            <Stack.Screen name="AdminScreen" component={withScreenBoundary('AdminScreen', AdminScreen)} />
            <Stack.Screen name="LoginScreen" component={withScreenBoundary('LoginScreen', LoginScreen)} />
            <Stack.Screen name="UserAccount" component={withScreenBoundary('UserAccount', UserAccount)} />
            <Stack.Screen name="CreateAccount" component={withScreenBoundary('CreateAccount', CreateAccount)} />
            <Stack.Screen name="ForgotCredentials" component={withScreenBoundary('ForgotCredentials', ForgotCredentials)} />
            <Stack.Screen name="ChooseProfileIcon" component={withScreenBoundary('ChooseProfileIcon', ChooseProfileIcon)} />
            <Stack.Screen name="ReaderScreen" component={withScreenBoundary('ReaderScreen', ReaderScreen)} />
            <Stack.Screen name="MangaInfoScreen" component={withScreenBoundary('MangaInfoScreen', MangaInfoScreen)} />
            <Stack.Screen name="LeaveRating" component={withScreenBoundary('LeaveRating', LeaveRating)} />
            <Stack.Screen name="LeaveReview" component={withScreenBoundary('LeaveReview', LeaveReview)} />
            <Stack.Screen name="AuthScreen" component={withScreenBoundary('AuthScreen', AuthScreen)} />
            <Stack.Screen name="OnboardingFlow" component={withScreenBoundary('OnboardingFlow', OnboardingFlow)} />
            <Stack.Screen name="ReaderThemeSettingsScreen" component={withScreenBoundary('ReaderThemeSettingsScreen', ReaderThemeSettingsScreen)} />
            <Stack.Screen name="UpgradeScreen" component={withScreenBoundary('UpgradeScreen', UpgradeScreen)} />
            <Stack.Screen name="ManageSubscriptionScreen" component={withScreenBoundary('ManageSubscriptionScreen', ManageSubscriptionScreen)} />
        </Stack.Navigator>
        </NavigationContainer>
      </ErrorBoundary>
    );
}
