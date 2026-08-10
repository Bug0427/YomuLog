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

// ── Module-scope wrapped screen components ────────────────────────────
// Hoisted to module scope so component identities are stable across
// AppNavigator re-renders. If `component` receives a new reference on
// every render, React Navigation remounts the screen (losing scroll
// position, form state, etc.).

const SplashView = withScreenBoundary('Splash', SplashScreen);
const HomeView = withScreenBoundary('HomeScreen', HomeScreen);
const SearchView = withScreenBoundary('SearchScreen', SearchScreen);
const LibraryView = withScreenBoundary('LibraryScreen', LibraryScreen);
const RecentlyUpdatedView = withScreenBoundary('RecentlyUpdated', RecentlyUpdated);
const RecentlyReadView = withScreenBoundary('RecentlyReadScreen', RecentlyReadScreen);
const DownloadsView = withScreenBoundary('DownLoadsScreen', DownLoadsScreen);
const ManageDownloadsView = withScreenBoundary('ManageDownloadsScreen', ManageDownloadsScreen);
const SettingsView = withScreenBoundary('SettingsScreen', SettingsScreen);
const ReadingStatsView = withScreenBoundary('ReadingStatsScreen', ReadingStatsScreen);
const FeedbackHomeView = withScreenBoundary('FeedBackHome', FeedBackHome);
const FileReportView = withScreenBoundary('FileReport', FileReport);
const AdminView = withScreenBoundary('AdminScreen', AdminScreen);
const LoginView = withScreenBoundary('LoginScreen', LoginScreen);
const UserAccountView = withScreenBoundary('UserAccount', UserAccount);
const CreateAccountView = withScreenBoundary('CreateAccount', CreateAccount);
const ForgotCredentialsView = withScreenBoundary('ForgotCredentials', ForgotCredentials);
const ChooseProfileIconView = withScreenBoundary('ChooseProfileIcon', ChooseProfileIcon);
const ReaderView = withScreenBoundary('ReaderScreen', ReaderScreen);
const MangaInfoView = withScreenBoundary('MangaInfoScreen', MangaInfoScreen);
const LeaveRatingView = withScreenBoundary('LeaveRating', LeaveRating);
const LeaveReviewView = withScreenBoundary('LeaveReview', LeaveReview);
const AuthView = withScreenBoundary('AuthScreen', AuthScreen);
const OnboardingView = withScreenBoundary('OnboardingFlow', OnboardingFlow);
const ReaderThemeSettingsView = withScreenBoundary('ReaderThemeSettingsScreen', ReaderThemeSettingsScreen);
const UpgradeView = withScreenBoundary('UpgradeScreen', UpgradeScreen);
const ManageSubscriptionView = withScreenBoundary('ManageSubscriptionScreen', ManageSubscriptionScreen);

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
            <Stack.Screen name="Splash" component={SplashView} />
            <Stack.Screen name="HomeScreen" component={HomeView} />
            <Stack.Screen name="SearchScreen" component={SearchView} />
            <Stack.Screen name="LibraryScreen" component={LibraryView} />
            <Stack.Screen name="RecentlyUpdated" component={RecentlyUpdatedView} />
            <Stack.Screen name="RecentlyReadScreen" component={RecentlyReadView} />
            <Stack.Screen name="DownLoadsScreen" component={DownloadsView} />
            <Stack.Screen name="ManageDownloadsScreen" component={ManageDownloadsView} />
            <Stack.Screen name="SettingsScreen" component={SettingsView} />
            <Stack.Screen name="ReadingStatsScreen" component={ReadingStatsView} />
            <Stack.Screen name="FeedBackHome" component={FeedbackHomeView} />
            <Stack.Screen name="FileReport" component={FileReportView} />
            <Stack.Screen name="AdminScreen" component={AdminView} />
            <Stack.Screen name="LoginScreen" component={LoginView} />
            <Stack.Screen name="UserAccount" component={UserAccountView} />
            <Stack.Screen name="CreateAccount" component={CreateAccountView} />
            <Stack.Screen name="ForgotCredentials" component={ForgotCredentialsView} />
            <Stack.Screen name="ChooseProfileIcon" component={ChooseProfileIconView} />
            <Stack.Screen name="ReaderScreen" component={ReaderView} />
            <Stack.Screen name="MangaInfoScreen" component={MangaInfoView} />
            <Stack.Screen name="LeaveRating" component={LeaveRatingView} />
            <Stack.Screen name="LeaveReview" component={LeaveReviewView} />
            <Stack.Screen name="AuthScreen" component={AuthView} />
            <Stack.Screen name="OnboardingFlow" component={OnboardingView} />
            <Stack.Screen name="ReaderThemeSettingsScreen" component={ReaderThemeSettingsView} />
            <Stack.Screen name="UpgradeScreen" component={UpgradeView} />
            <Stack.Screen name="ManageSubscriptionScreen" component={ManageSubscriptionView} />
        </Stack.Navigator>
        </NavigationContainer>
      </ErrorBoundary>
    );
}
