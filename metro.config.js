const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add sqlite file extension handling
config.resolver.assetExts = config.resolver.assetExts.filter(
  (ext) => ext !== 'db'
);
config.resolver.sourceExts.push('db');

// ── Web platform: alias @stripe/stripe-react-native to a no-op stub ──
// The stripeService module uses a lazy dynamic import(), but Metro still
// traces and tries to resolve @stripe/stripe-react-native for all platforms.
// On web, this native module doesn't exist and causes bundling errors.
// This alias redirects it to a stub that exports the same interface as no-ops.
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === '@stripe/stripe-react-native') {
    return {
      filePath: path.resolve(__dirname, 'services/stripeNativeStub.ts'),
      type: 'sourceFile',
    };
  }
  // Fall back to default resolution
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
