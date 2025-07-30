import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {NavBarStyles} from '../styles/global';

const NavBar = () => {
  const navigation = useNavigation();

  return (
    <View style={NavBarStyles.container}>
      <TouchableOpacity style={NavBarStyles.navItem} onPress={() => console.warn('Navigation to Home not yet implemented')}>
        <Text style={NavBarStyles.navText}>Home</Text>
      </TouchableOpacity>
      <TouchableOpacity style={NavBarStyles.navItem} onPress={() => console.warn('Navigation to Search not yet implemented')}>
        <Text style={NavBarStyles.navText}>Search</Text>
      </TouchableOpacity>
      <TouchableOpacity style={NavBarStyles.navItem} onPress={() => console.warn('Navigation to Library not yet implemented')}>
        <Text style={NavBarStyles.navText}>Library</Text>
      </TouchableOpacity>
      <TouchableOpacity style={NavBarStyles.navItem} onPress={() => console.warn('Navigation to Downloads not yet implemented')}>
        <Text style={NavBarStyles.navText}>Downloads</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[NavBarStyles.navItem, { borderRightWidth: 2 }]} onPress={() => console.warn('Navigation to Settings not yet implemented')}>
        <Text style={NavBarStyles.navText}>Settings</Text>
      </TouchableOpacity>
    </View>
  );
};

export default NavBar;
