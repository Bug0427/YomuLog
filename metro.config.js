const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add sqlite file extension handling
config.resolver.assetExts = config.resolver.assetExts.filter(
  (ext) => ext !== 'db'
);
config.resolver.sourceExts.push('db');

// ── Web platform: alias native-only modules to no-op stubs ──
// Metro traces dynamic imports for all platforms. Native modules
// don't exist on web, so we redirect them to stubs.
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web') {
    if (moduleName === '@stripe/stripe-react-native') {
      return {
        filePath: path.resolve(__dirname, 'services/stripeNativeStub.ts'),
        type: 'sourceFile',
      };
    }
    if (moduleName === 'expo-sqlite') {
      return {
        filePath: path.resolve(__dirname, 'services/sqliteNativeStub.ts'),
        type: 'sourceFile',
      };
    }
  }
  // Fall back to default resolution
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
