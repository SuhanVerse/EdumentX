// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      'dist/**',
      // Expo-generated route types — rebuilt on every `expo start`;
      // gitignored and not source.
      '.expo/**',
      // Deno edge functions — `jsr:`/`npm:` specifiers are not
      // resolvable by the Node-based linter.
      'supabase/**',
      'Documentation/98-Reference-BasoBas/**',
      'Documentation/99-Archive/**',
    ],
  },
  {
    // eslint-plugin-react-native dropped `no-inline-styles` in v4, but
    // eslint-config-expo still references the rule (severity 0) without
    // registering the plugin. ESLint rejects any rule id that names an
    // unregistered plugin, so provide a stub plugin so lint doesn't
    // hard-fail. The rule stays off — the codebase intentionally uses
    // inline styles for NativeWind-incompatible dynamic values.
    plugins: {
      'react-native': {
        rules: {
          'no-inline-styles': {
            meta: { schema: [] },
            create() {
              return {};
            },
          },
        },
      },
    },
    rules: {
      'react-native/no-inline-styles': 'off',
    },
  },
  {
    // R3F intrinsics (`<mesh>`, `<ambientLight>`, `<directionalLight>`,
    // `<sphereGeometry>`, etc.) ship their own JSX types with
    // first-class props like `args`, `emissive`, `position`, etc.
    // The `react/no-unknown-property` rule is meant for native HTML
    // elements and doesn't recognise R3F intrinsics, so we disable it
    // for the four 3D files.
    files: [
      'src/components/premium/PremiumHero3D.tsx',
      'src/components/illustrations/DiscoverScene3D.tsx',
      'src/components/illustrations/AiOrb3D.tsx',
    ],
    rules: {
      'react/no-unknown-property': 'off',
    },
  },
]);
