import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import SplashScreen from './components/SplashScreen';
import HomeScreen from './screens/HomeScreen';
import SearchScreen from './screens/SearchScreen'; 
import LibraryScreen from './screens/LibraryScreen'; 
import DownLoadsScreen from './screens/DownLoadsScreen'; 
import SettingsScreen from './screens/SettingsScreen'; 

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="SearchScreen" component={SearchScreen} />
        <Stack.Screen name="LibraryScreen" component={LibraryScreen} />
        <Stack.Screen name="DownLoadsScreen" component={DownLoadsScreen} />
        <Stack.Screen name="SettingsScreen" component={SettingsScreen} />

      </Stack.Navigator>
    </NavigationContainer>
  );
}