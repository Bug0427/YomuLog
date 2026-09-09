// __mocks__/setup-env.js
// RN 0.86 removed the legacy react-native/setup-env entry that
// @react-native/jest-preset still mocks. This shim supplies the bare
// gesture-handler import so the preset's setup.js can resolve it.
require('react-native-gesture-handler/jestSetup');