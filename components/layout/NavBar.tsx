import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {NavBarStyles} from '../../styles/global';


const NavBar = () => {
  const navigation = useNavigation();

  return (
    <View style={NavBarStyles.container}>
      <Pressable style={NavBarStyles.navItem} onPress={() => navigation.navigate('Home' as never)}>
        <Text style={NavBarStyles.navText}>Home</Text>
      </Pressable>
      <Pressable style={NavBarStyles.navItem} onPress={() => navigation.navigate('SearchScreen' as never)}>
        <Text style={NavBarStyles.navText}>Search</Text>
      </Pressable>
      <Pressable style={NavBarStyles.navItem} onPress={() => navigation.navigate('LibraryScreen' as never)}>
        <Text style={NavBarStyles.navText}>Library</Text>
      </Pressable>
      <Pressable style={NavBarStyles.navItem} onPress={() => navigation.navigate('DownLoadsScreen' as never)}>
        <Text style={NavBarStyles.navText}>Downloads</Text>
      </Pressable>
      <Pressable style={[NavBarStyles.navItem, { borderRightWidth: 2 }]} onPress={() => navigation.navigate('SettingsScreen' as never)}>
        <Text style={NavBarStyles.navText}>Settings</Text>
      </Pressable>
    </View>
  );
};

export default NavBar;
