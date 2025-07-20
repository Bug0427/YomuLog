// screens/HomeScreen.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import NavBar from '../components/NavBar'; // Adjust path if needed

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
    backgroundColor: '#fff8f0',
    paddingTop: 50,
    paddingHorizontal: 20,
  },
});