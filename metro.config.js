
const { getDefaultConfig } = require('expo/metro-config');


const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('jsx');

module.exports = config;
