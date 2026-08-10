const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add sqlite file extension handling
config.resolver.assetExts = config.resolver.assetExts.filter(
  (ext) => ext !== 'db'
);
config.resolver.sourceExts.push('db');

// Stub out @stripe/stripe-react-native on web — it's native-only
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === '@stripe/stripe-react-native') {
    return {
      type: 'sourceFile',
      filePath: path.resolve(__dirname, 'stubs/stripe-stub.ts'),
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
