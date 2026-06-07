/**
 * EdumentX Metro configuration
 *
 * - `@tamagui/metro-plugin` v2.x exports `withTamagui` (a wrapper, not a
 *   plugin factory). It mutates the resolver to add `css` to sourceExts and
 *   wires the static extractor into the transformer.
 * - `react-native-reanimated/metro-config` wraps the config so the worklets
 *   runtime is configured correctly. It must be the outermost wrapper.
 */

const { getDefaultConfig } = require('expo/metro-config');
const exclusionList = require('metro-config/private/defaults/exclusionList').default;
const { wrapWithReanimatedMetroConfig } = require('react-native-reanimated/metro-config');
const { withTamagui } = require('@tamagui/metro-plugin');

const config = getDefaultConfig(__dirname, { isCSSEnabled: true });

const escapePathForRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const projectRoot = escapePathForRegex(__dirname);

config.resolver.blockList = exclusionList([
  new RegExp(`${projectRoot}[/\\\\]Documentation[/\\\\]98-Reference-BasoBas[/\\\\].*`),
  new RegExp(`${projectRoot}[/\\\\]dist[/\\\\].*`),
  new RegExp(`${projectRoot}[/\\\\]firebase-export-[^/\\\\]+[/\\\\].*`),
]);

module.exports = wrapWithReanimatedMetroConfig(
  withTamagui(config, {
    components: ['tamagui'],
    config: './tamagui.config.ts',
  }),
);
