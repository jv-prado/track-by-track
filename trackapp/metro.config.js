const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname, {
  isTsconfigPathsEnabled: true,
});

// react-native-svg-transformer: renderiza .svg como componente RN (mesmo
// arquivo Logo.svg do web, sem converter pra PNG) em vez de asset genérico.
const { transformer, resolver } = config;
config.transformer = {
  ...transformer,
  babelTransformerPath: require.resolve("react-native-svg-transformer"),
};
config.resolver = {
  ...resolver,
  assetExts: resolver.assetExts.filter((ext) => ext !== "svg"),
  sourceExts: [...resolver.sourceExts, "svg"],
};

module.exports = withNativeWind(config, {
  input: "./src/global.css",
});
