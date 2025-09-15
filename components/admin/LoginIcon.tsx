import React from 'react';
import { View, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { IconStyles } from '../../styles/global';


export default function LoginIcon({ userImage }: { userImage?: string }) {
  return (
    <Pressable onPress={() => console.log('Login Pressed!')} style={IconStyles.iconContainer}>
      {userImage ? (
        <Image source={{ uri: userImage }} style={IconStyles.profileImage} />
      ) : (
        <Ionicons name="person-circle-outline" size={40} color="#463B54" />
      )}
    </Pressable>
  );
}
