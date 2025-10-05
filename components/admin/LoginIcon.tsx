import React from 'react';
import { Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { IconStyles } from '../../styles/global';
import { useNavigation } from '@react-navigation/native';
import { verifyUser } from '../../services/feedbackRepo';

export default function LoginIcon({ userImage }: { userImage?: string }) {
  const navigation = useNavigation<any>();

  return (
    <Pressable
      onPress={async () => {
        try {
          const savedUsername: string | undefined = (globalThis as any).currentUsername;
          const savedPassword: string | undefined = (globalThis as any).currentPassword;
          if (!savedUsername || !savedPassword) {
            navigation.navigate('LoginScreen');
            return;
          }
          const row = await verifyUser(savedUsername, savedPassword);
          if (row) {
            navigation.navigate('UserAccount'); // your new account screen
          } else {
            navigation.navigate('LoginScreen');
          }
        } catch (e) {
          console.warn('LoginIcon check failed', e);
          navigation.navigate('LoginScreen');
        }
      }}
      style={IconStyles.iconContainer}
    >
      {userImage ? (
        <Image source={{ uri: userImage }} style={IconStyles.profileImage} />
      ) : (
        <Ionicons name="person-circle-outline" size={40} color="#463B54" />
      )}
    </Pressable>
  );
}
