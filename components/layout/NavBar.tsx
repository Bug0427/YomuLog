import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {NavBarStyles, GeneralStyles} from '../../styles/global';


const NavBar = () => {
  const navigation = useNavigation();

  return (
    <View style={NavBarStyles.container}>
      <Pressable style={NavBarStyles.navItem} onPress={() => navigation.navigate('Home' as never)}>
        <Text style={GeneralStyles.plainText}>Home</Text>
      </Pressable>
      <Pressable style={NavBarStyles.navItem} onPress={() => navigation.navigate('SearchScreen' as never)}>
        <Text style={GeneralStyles.plainText}>Search</Text>
      </Pressable>
      <Pressable style={NavBarStyles.navItem} onPress={() => navigation.navigate('LibraryScreen' as never)}>
        <Text style={GeneralStyles.plainText}>Library</Text>
      </Pressable>
      <Pressable style={NavBarStyles.navItem} onPress={() => navigation.navigate('DownLoadsScreen' as never)}>
        <Text style={GeneralStyles.plainText}>Downloads</Text>
      </Pressable>
      <Pressable style={[NavBarStyles.navItem, { borderRightWidth: 2 }]} onPress={() => navigation.navigate('SettingsScreen' as never)}>
        <Text style={GeneralStyles.plainText}>Settings</Text>
      </Pressable>
    </View>
  );
};

export default NavBar;
