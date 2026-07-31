const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add sqlite file extension handling
config.resolver.assetExts = config.resolver.assetExts.filter(
  (ext) => ext !== 'db'
);
config.resolver.sourceExts.push('db');

module.exports = config;
