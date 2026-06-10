/**
 * EdumentX Metro configuration (post-NativeWind migration).
 *
 * - Tailwind/NativeWind needs only the default Expo Metro config.
 * - The Documentation/98-Reference-BasoBas/ folder is a Figma-Make web
 *   export and is excluded from the bundle.
 */

const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require("nativewind/metro");
const exclusionList = require('metro-config/private/defaults/exclusionList').default;

const config = getDefaultConfig(__dirname, { isCSSEnabled: true });

const escapePathForRegex = (value) => value.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');
const projectRoot = escapePathForRegex(__dirname);

config.resolver.blockList = exclusionList([
  new RegExp(`${projectRoot}[/\\\\]Documentation[/\\\\]98-Reference-BasoBas[/\\\\].*`),
  new RegExp(`${projectRoot}[/\\\\]dist[/\\\\].*`),
  new RegExp(`${projectRoot}[/\\\\]firebase-export-[^/\\\\]+[/\\\\].*`),
]);

module.exports = withNativeWind(config, { input: "./global.css" });
