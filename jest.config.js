/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@react-native-async-storage/.*|react-native-screens|react-native-safe-area-context|react-native-gesture-handler|react-native-reanimated|react-native-svg|react-native-web|react-native-dropdown-picker|expo-file-system|expo-secure-store|expo-sqlite)',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)'],
};
