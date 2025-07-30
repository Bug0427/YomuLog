import React from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity } from 'react-native';
import { MangaSliderStyles } from '../styles/global';

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
    <View style={MangaSliderStyles.sliderWrapper}>
      <FlatList
        contentContainerStyle={MangaSliderStyles.sliderContainer}
        data={data}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            style={[
              MangaSliderStyles.card,
              index === data.length - 1 && MangaSliderStyles.lastCard
            ]}
            onPress={item.onPress}
          >
            <Image source={{ uri: item.image }} style={MangaSliderStyles.image} />
            <Text style={MangaSliderStyles.title} numberOfLines={1}>{item.title}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};



export default MangaSlider;