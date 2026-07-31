import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { GeneralStyles} from '../../styles/global';
import { NavBarStyles } from '../../styles/IndependentStyles/NavBarStyles';
import { useTheme } from '../../context/ThemeContext';
import { tabA11y, touchTargetStyle } from '../../utils/accessibility';


const NavBar = () => {
  const navigation = useNavigation();
  const { colors: theme } = useTheme();

  return (
    <View style={[NavBarStyles.container, { backgroundColor: theme.bgCard }]}>
      <Pressable
        style={[NavBarStyles.navItem, touchTargetStyle, { borderColor: theme.borderLight }]}
        onPress={() => navigation.navigate('HomeScreen' as never)}
        {...tabA11y('Home')}
      >
        <Text style={[GeneralStyles.plainText, { color: theme.textPrimary }]}>Home</Text>
      </Pressable>
      <Pressable
        style={[NavBarStyles.navItem, touchTargetStyle, { borderColor: theme.borderLight }]}
        onPress={() => navigation.navigate('SearchScreen' as never)}
        {...tabA11y('Search')}
      >
        <Text style={[GeneralStyles.plainText, { color: theme.textPrimary }]}>Search</Text>
      </Pressable>
      <Pressable
        style={[NavBarStyles.navItem, touchTargetStyle, { borderColor: theme.borderLight }]}
        onPress={() => navigation.navigate('LibraryScreen' as never)}
        {...tabA11y('Library')}
      >
        <Text style={[GeneralStyles.plainText, { color: theme.textPrimary }]}>Library</Text>
      </Pressable>
      <Pressable
        style={[NavBarStyles.navItem, touchTargetStyle, { borderColor: theme.borderLight }]}
        onPress={() => navigation.navigate('DownLoadsScreen' as never)}
        {...tabA11y('Downloads')}
      >
        <Text style={[GeneralStyles.plainText, { color: theme.textPrimary }]}>Downloads</Text>
      </Pressable>
      <Pressable
        style={[NavBarStyles.navItem, NavBarStyles.navItemLast, touchTargetStyle, { borderColor: theme.borderLight }]}
        onPress={() => navigation.navigate('SettingsScreen' as never)}
        {...tabA11y('Settings')}
      >
        <Text style={[GeneralStyles.plainText, { color: theme.textPrimary }]}>Settings</Text>
      </Pressable>
    </View>
  );
};

export default NavBar;
