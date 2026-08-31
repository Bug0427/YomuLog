/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  // Test infra only (no product code). AsyncStorage has no native module under
  // jest — without these, any module that imports it (ThemeContext,
  // PremiumContext, the KPI services) fails at load with
  // "NativeModule: AsyncStorage is null".
  setupFiles: ['@react-native-async-storage/async-storage/jest/async-storage-mock'],
  moduleNameMapper: {
    '^@react-native-async-storage/async-storage$':
      '@react-native-async-storage/async-storage/jest/async-storage-mock',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@react-native-async-storage/.*|react-native-screens|react-native-safe-area-context|react-native-gesture-handler|react-native-reanimated|react-native-svg|react-native-web|react-native-dropdown-picker|expo-file-system|expo-secure-store|expo-sqlite)',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)'],
};
