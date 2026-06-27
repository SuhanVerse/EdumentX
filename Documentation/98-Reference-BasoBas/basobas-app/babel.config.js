module.exports = function (api) {
  api.cache(true);
  let plugins = [];

  plugins.push('react-native-reanimated/plugin');

  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind', unstable_transformImportMeta: true }],
      'nativewind/babel',
    ],

    plugins,
  };
};
