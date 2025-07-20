// screens/HomeScreen.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import NavBar from '../components/NavBar'; 

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      
      <NavBar />
      <Text>Welcome to YomuLog!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#AFA6DD',
    paddingTop: 50,
    paddingHorizontal: 20,
  },
});