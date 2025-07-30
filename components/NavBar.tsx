import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {NavBarStyles} from '../styles/global';

const NavBar = () => {
  const navigation = useNavigation();

  return (
    <View style={NavBarStyles.container}>
      <TouchableOpacity style={NavBarStyles.navItem} onPress={() => navigation.navigate('Home' as never)}>
        <Text style={NavBarStyles.navText}>Home</Text>
      </TouchableOpacity>
      <TouchableOpacity style={NavBarStyles.navItem} onPress={() => navigation.navigate('SearchScreen' as never)}>
        <Text style={NavBarStyles.navText}>Search</Text>
      </TouchableOpacity>
      <TouchableOpacity style={NavBarStyles.navItem} onPress={() => navigation.navigate('LibraryScreen' as never)}>
        <Text style={NavBarStyles.navText}>Library</Text>
      </TouchableOpacity>
      <TouchableOpacity style={NavBarStyles.navItem} onPress={() => navigation.navigate('DownLoadsScreen' as never)}>
        <Text style={NavBarStyles.navText}>Downloads</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[NavBarStyles.navItem, { borderRightWidth: 2 }]} onPress={() => navigation.navigate('SettingsScreen' as never)}>
        <Text style={NavBarStyles.navText}>Settings</Text>
      </TouchableOpacity>
    </View>
  );
};

export default NavBar;
