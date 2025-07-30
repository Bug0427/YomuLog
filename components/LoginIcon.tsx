import React from 'react';
import { View, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function LoginIcon({ userImage }: { userImage?: string }) {
  return (
    <TouchableOpacity onPress={() => console.log('Login Pressed!')} style={styles.iconContainer}>
      {userImage ? (
        <Image source={{ uri: userImage }} style={styles.profileImage} />
      ) : (
        <Ionicons name="person-circle-outline" size={40} color="#463B54" />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    padding: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 1,
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
});