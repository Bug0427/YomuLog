import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, u } from '../../styles/tokens';

export default function SplashScreen({ navigation }: any) {
  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('HomeScreen');
    }, 2000); // 2 seconds delay

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={SplashScreenStyles.container}>
      <Text style={SplashScreenStyles.text}>YomuLog Loading... 🧸📚</Text>
    </View>
  );
}

const SplashScreenStyles = StyleSheet.create({
    container: {
        ...u.full, backgroundColor: colors.creamWhite,
        justifyContent: 'center', alignItems: 'center',
    },
    text: {fontSize: 24, fontWeight: '600', color: colors.splashText,
    },
});
