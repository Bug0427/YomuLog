import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';

import SplashScreen from '../screens/SplashScreen';
import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import LibraryScreen from '../screens/LibraryScreen';
import DownLoadsScreen from '../screens/DownLoadsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import RecentlyUpdated from '../screens/RecentlyUpdated'
import FeedBackHome from '../screens/feedback/FeedBackHome'
import FileReport from '../screens/feedback/FileReport'
import Admin from '../screens/Admin'
import LoginScreen from '../screens/account/LoginScreen'
import UserAccount from '../screens/UserAccount'
import CreateAccount from '../screens/account/CreateAccount'
import ForgotCredentials from '../screens/account/ForgotCredentials'

const Stack = createStackNavigator();

export default function AppNavigator() {
    return (
        <NavigationContainer>
        <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Splash" component={SplashScreen} />
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="SearchScreen" component={SearchScreen} />
            <Stack.Screen name="LibraryScreen" component={LibraryScreen} />
            <Stack.Screen name="RecentlyUpdated" component={RecentlyUpdated} />
            <Stack.Screen name="DownLoadsScreen" component={DownLoadsScreen} />
            <Stack.Screen name="SettingsScreen" component={SettingsScreen} />
            <Stack.Screen name="FeedBackHome" component={FeedBackHome} />
            <Stack.Screen name="FileReport" component={FileReport} />
            <Stack.Screen name="Admin" component={Admin} />
            <Stack.Screen name="LoginScreen" component={LoginScreen} />
            <Stack.Screen name="UserAccount" component={UserAccount} />
            <Stack.Screen name="CreateAccount" component={CreateAccount} />
            <Stack.Screen name="ForgotCredentials" component={ForgotCredentials} />

        </Stack.Navigator>
        </NavigationContainer>
    );
}