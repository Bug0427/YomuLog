import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const NavBar = () => {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => console.warn('Navigation to Home not yet implemented')}>
        <Text style={styles.navItem}>Home</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => console.warn('Navigation to Search not yet implemented')}>
        <Text style={styles.navItem}>Search</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => console.warn('Navigation to Library not yet implemented')}>
        <Text style={styles.navItem}>Library</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => console.warn('Navigation to Downloads not yet implemented')}>
        <Text style={styles.navItem}>Downloads</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => console.warn('Navigation to Settings not yet implemented')}>
        <Text style={styles.navItem}>Settings</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 20,
    right: 20,
    flexDirection: 'row',
    backgroundColor: '#fff8f0',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 10,
  },
  navItem: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b4c3b',
  },
});

export default NavBar;
