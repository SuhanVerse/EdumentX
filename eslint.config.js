// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      'dist/**',
      'Documentation/98-Reference-BasoBas/**',
      'Documentation/99-Archive/**',
    ],
  },
  {
    // R3F intrinsics (`<mesh>`, `<ambientLight>`, `<directionalLight>`,
    // `<sphereGeometry>`, etc.) ship their own JSX types with
    // first-class props like `args`, `emissive`, `position`, etc.
    // The `react/no-unknown-property` rule is meant for native HTML
    // elements and doesn't recognise R3F intrinsics, so we disable it
    // for the four 3D files.
    files: [
      'components/premium/PremiumHero3D.tsx',
      'components/illustrations/DiscoverScene3D.tsx',
      'components/illustrations/AiOrb3D.tsx',
    ],
    rules: {
      'react/no-unknown-property': 'off',
    },
  },
]);
