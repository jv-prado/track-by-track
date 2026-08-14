module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo", "nativewind/babel"],
    // reanimated plugin precisa ser o último da lista (regra da própria lib)
    plugins: ["react-native-reanimated/plugin"],
  };
};
