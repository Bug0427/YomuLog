// screens/HomeScreen.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import NavBar from '../components/NavBar'; 
import LoginIcon from '../components/LoginIcon';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>YomuLog</Text>
        <LoginIcon />
      </View>
      <NavBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#AFA6DD',
    paddingTop: 60,
    paddingHorizontal: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#463B54',
    textShadowColor: '#D7D2EE',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
});