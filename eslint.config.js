// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
// EdumentX design-token rules — see the file's docstring.
const designTokens = require('./eslint-rules/design-tokens');

module.exports = defineConfig([
  expoConfig,
  {
    plugins: {
      'design-tokens': { rules: designTokens.rules },
    },
    rules: {
      // placeholderTextColor must reference a colors.* token, never a
      // raw hex (the June 2026 sweep found 6 stragglers after the
      // "final" pass — this rule makes that class of bug impossible).
      'design-tokens/no-raw-hex-placeholder': 'error',
      // color="#…" props (Ionicons, ActivityIndicator, …) must use a
      // colors.* token too — the July 2026 sweep found 101 of them.
      'design-tokens/no-raw-hex-color-prop': 'error',
      // Inline style backgroundColor / border*Color must be tokens;
      // pure black (#000 scrims) stays exempt.
      'design-tokens/no-raw-hex-inline-color': 'error',
      // className radii must be design tokens (xs|sm|md|card|lg|xl|
      // hero|pill). Tailwind defaults like rounded-2xl / rounded-full
      // / rounded-t-3xl and arbitrary rounded-[…] values silently
      // drift off the documented scale (theme.extend keeps defaults).
      'design-tokens/no-non-token-radius': 'error',
      // className may not use Tailwind default palette shades
      // (text-slate-300, bg-blue-500, …) — those fall back to
      // framework defaults. Dark surfaces use text-glass-secondary /
      // text-glass-muted; light surfaces use text-text-secondary /
      // text-text-muted.
      'design-tokens/no-non-token-color-class': 'error',
    },
  },
  {
    ignores: [
      'dist/**',
      // Separate npm package (own deps, own tsc build) — the root
      // install never has firebase-functions, so import/no-unresolved
      // fires on every file. Lint it from within functions/ instead.
      'functions/**',
      // Expo-generated route types — rebuilt on every `expo start`;
      // gitignored and not source.
      '.expo/**',
      // Deno edge functions — `jsr:`/`npm:` specifiers are not
      // resolvable by the Node-based linter.
      'supabase/**',
      'Documentation/98-Reference-BasoBas/**',
      'Documentation/99-Archive/**',
      // Extracted Figma AI reference bundle — standalone Vite web app
      // (own deps, own eslint needs). Not part of the RN app.
      'Documentation/02-Design-System/Asim_EdumentX_Design/**',
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
