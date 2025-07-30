import React from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity } from 'react-native';

interface MangaItem {
  id: string;
  title: string;
  image: string;
  onPress?: () => void;
}

interface MangaSliderProps {
  data: MangaItem[];
}

const MangaSlider: React.FC<MangaSliderProps> = ({ data }) => {
  return (
    <View style={styles.sliderWrapper}>
      <FlatList
        contentContainerStyle={styles.sliderContainer}
        data={data}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={item.onPress}>
            <Image source={{ uri: item.image }} style={styles.image} />
            <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  sliderWrapper: {
    marginVertical: 20,
    padding: 7,
    borderWidth: 2,
    borderColor: '#463B54',
    backgroundColor: '#E3D3BD',
  },
  sliderContainer: {
    paddingHorizontal: 5,
  },
  card: {
    width: 80,
    alignItems: 'center',
    backgroundColor: '#E3D3BD', // soft beige tone for cozy feel
    borderWidth: 1,
    borderColor: '#543C27', // dark brown border
    padding: 5,
  },
  image: {
    width: 100,
    height: 90,
    marginBottom: 5,
  },
  title: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default MangaSlider;