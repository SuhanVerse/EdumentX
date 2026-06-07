module.exports = function (api) {
  api.cache(true);

  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        '@tamagui/babel-plugin',
        {
          components: ['tamagui'],
          config: './constants/tamagui.config.ts', // <-- Update this path to include /constants
        },
      ],
      'react-native-reanimated/plugin', // Keeps reanimated evaluated last
    ],
  };
};