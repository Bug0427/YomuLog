import React from 'react';
import { Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../styles/tokens'
import { IconStyles } from '../../styles/IndependentStyles/IconStyles';
import { useNavigation } from '@react-navigation/native';
import { useAuthContext } from '../../context/AuthContext';

export default function LoginIcon({ userImage }: { userImage?: string }) {
  const navigation = useNavigation<any>();
  const { isLoggedIn } = useAuthContext();

  return (
    <Pressable
      onPress={() => {
        // The session is the source of truth — gate on auth state, not on a
        // stored password. LoginScreen establishes the session via
        // AuthContext.login (accountId/username/level); UserAccount re-checks
        // the session on entry, so a logged-in session opens the account
        // screen from any header and otherwise we route to login. Sensitive
        // re-auth (edits, password change) prompts for credentials at the
        // point of use instead of keeping a global plaintext copy.
        if (isLoggedIn) {
          navigation.navigate('UserAccount');
        } else {
          navigation.navigate('LoginScreen');
        }
      }}
      style={IconStyles.iconContainer}
      accessibilityRole="button"
      accessibilityLabel="Account"
      accessibilityHint="Opens account login or profile"
    >
      {userImage ? (
        <Image source={{ uri: userImage }} style={IconStyles.profileImage} />
      ) : (
        <Ionicons name="person-circle-outline" size={40} color={colors.plum} />
      )}
    </Pressable>
  );
}
