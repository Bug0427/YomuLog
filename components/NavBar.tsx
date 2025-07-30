import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const NavBar = () => {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.navItem} onPress={() => console.warn('Navigation to Home not yet implemented')}>
        <Text style={styles.navText}>Home</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.navItem} onPress={() => console.warn('Navigation to Search not yet implemented')}>
        <Text style={styles.navText}>Search</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.navItem} onPress={() => console.warn('Navigation to Library not yet implemented')}>
        <Text style={styles.navText}>Library</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.navItem} onPress={() => console.warn('Navigation to Downloads not yet implemented')}>
        <Text style={styles.navText}>Downloads</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.navItem, { borderRightWidth: 2 }]} onPress={() => console.warn('Navigation to Settings not yet implemented')}>
        <Text style={styles.navText}>Settings</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: '#D4B89B',
    width: '100%',
    height: 40,
    overflow: 'hidden',
  },
  navItem: {
    flex: 1,
    borderWidth: 2,
    borderRightWidth: 0,
    borderColor: '#543C27',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#543C27',
  },
});

export default NavBar;
