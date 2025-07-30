// screens/HomeScreen.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import NavBar from '../components/NavBar'; 
import LoginIcon from '../components/LoginIcon';
import MangaSlider from '../components/MangaSlider';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>YomuLog</Text>
        <LoginIcon />
      </View>
      <NavBar />
      <MangaSlider
        data={[
          {
            id: '1',
            title: 'Sample Manga 1',
            image: 'https://via.placeholder.com/100x140.png?text=Manga+1',
            onPress: () => console.log('Pressed Manga 1'),
          },
          {
            id: '2',
            title: 'Sample Manga 2',
            image: 'https://via.placeholder.com/100x140.png?text=Manga+2',
            onPress: () => console.log('Pressed Manga 2'),
          },
          {
            id: '3',
            title: 'Sample Manga 3',
            image: 'https://via.placeholder.com/100x140.png?text=Manga+3',
            onPress: () => console.log('Pressed Manga 3'),
          },
          {
            id: '4',
            title: 'Sample Manga 4',
            image: 'https://via.placeholder.com/100x140.png?text=Manga+4',
            onPress: () => console.log('Pressed Manga 4'),
          },
          {
            id: '5',
            title: 'Sample Manga 5',
            image: 'https://via.placeholder.com/100x140.png?text=Manga+5',
            onPress: () => console.log('Pressed Manga 5'),
          },

        ]}
      />
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