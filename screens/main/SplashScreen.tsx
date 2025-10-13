import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import{SplashScreenStyles} from '../../styles/global';

export default function SplashScreen({ navigation }: any) {
  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('Home');
    }, 2000); // 2 seconds delay

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={SplashScreenStyles.container}>
      <Text style={SplashScreenStyles.text}>YomuLog Loading... 🧸📚</Text>
    </View>
  );
}
