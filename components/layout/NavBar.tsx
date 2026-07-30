import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { GeneralStyles} from '../../styles/global';
import { NavBarStyles } from '../../styles/IndependentStyles/NavBarStyles';
import { useTheme } from '../../context/ThemeContext';


const NavBar = () => {
  const navigation = useNavigation();
  const { colors: theme } = useTheme();

  return (
    <View style={[NavBarStyles.container, { backgroundColor: theme.bgCard }]}>
      <Pressable style={[NavBarStyles.navItem, { borderColor: theme.borderLight }]} onPress={() => navigation.navigate('HomeScreen' as never)}>
        <Text style={[GeneralStyles.plainText, { color: theme.textPrimary }]}>Home</Text>
      </Pressable>
      <Pressable style={[NavBarStyles.navItem, { borderColor: theme.borderLight }]} onPress={() => navigation.navigate('SearchScreen' as never)}>
        <Text style={[GeneralStyles.plainText, { color: theme.textPrimary }]}>Search</Text>
      </Pressable>
      <Pressable style={[NavBarStyles.navItem, { borderColor: theme.borderLight }]} onPress={() => navigation.navigate('LibraryScreen' as never)}>
        <Text style={[GeneralStyles.plainText, { color: theme.textPrimary }]}>Library</Text>
      </Pressable>
      <Pressable style={[NavBarStyles.navItem, { borderColor: theme.borderLight }]} onPress={() => navigation.navigate('DownLoadsScreen' as never)}>
        <Text style={[GeneralStyles.plainText, { color: theme.textPrimary }]}>Downloads</Text>
      </Pressable>
      <Pressable style={[NavBarStyles.navItem, NavBarStyles.navItemLast, { borderColor: theme.borderLight }]} onPress={() => navigation.navigate('SettingsScreen' as never)}>
        <Text style={[GeneralStyles.plainText, { color: theme.textPrimary }]}>Settings</Text>
      </Pressable>
    </View>
  );
};

export default NavBar;
