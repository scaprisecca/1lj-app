const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add SQL file support for Drizzle migrations
config.resolver.assetExts.push('sql');

module.exports = config;
