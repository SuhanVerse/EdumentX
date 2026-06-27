/**
 * EdumentX Metro configuration (post-NativeWind migration).
 *
 * - Tailwind/NativeWind needs only the default Expo Metro config.
 * - The Documentation/98-Reference-BasoBas/ folder is a Figma-Make web
 *   export and is excluded from the bundle.
 *
 * Custom resolver patch:
 *   react-native-css-interop 0.2.5 (nested under nativewind) declares
 *   its `jsx-runtime` subpath with `"main": "../dist/runtime/jsx-runtime"`
 *   — a path that climbs OUT of the package directory. Metro refuses to
 *   resolve subpath imports whose `main` escapes the package, so we
 *   short-circuit the request here and resolve it directly to the
 *   absolute file path on disk. See CLAUDE.md for the full diagnosis.
 */

const path = require("path");
const fs = require("fs");
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

// Pre-compute the absolute path to react-native-css-interop's
// jsx-runtime entry so the resolver can return it synchronously.
const cssInteropJsxRuntimeAbs = path.join(
  __dirname,
  "node_modules",
  "nativewind",
  "node_modules",
  "react-native-css-interop",
  "dist",
  "runtime",
  "jsx-runtime.js",
);

const cssInteropPkgRoot = path.join(
  __dirname,
  "node_modules",
  "nativewind",
  "node_modules",
  "react-native-css-interop",
);

// npm/yarn dedupe nests react-native-css-interop under nativewind
// (because no other direct dep needs a different version). Metro's
// default resolver stops at nativewind's package boundary and refuses
// to climb into its nested node_modules, so plain
// `require("react-native-css-interop")` (imported transitively by
// @react-navigation/native/Link.js, which got pulled in by expo-router)
// fails. Tell Metro to look in the nested location too.
if (!config.resolver.nodeModulesPaths) {
  config.resolver.nodeModulesPaths = [];
}
config.resolver.nodeModulesPaths = [
  ...new Set([
    ...config.resolver.nodeModulesPaths,
    path.join(__dirname, "node_modules"),
    path.join(__dirname, "node_modules/nativewind/node_modules"),
  ]),
];

const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // 1) `react-native-css-interop/jsx-runtime` — its package.json uses
  //    a `..`-relative `main` that escapes the package, so Metro's
  //    standard subpath resolver rejects it. Return the absolute file
  //    directly.
  if (moduleName === "react-native-css-interop/jsx-runtime") {
    if (fs.existsSync(cssInteropJsxRuntimeAbs)) {
      return { type: "sourceFile", filePath: cssInteropJsxRuntimeAbs };
    }
    // Fall through if the file ever moves.
  }

  // 2) `react-native-css-interop` (package root) — when the import
  //    comes from a path that Metro would otherwise resolve from
  //    `node_modules/nativewind/` (i.e. nativewind's own files, like
  //    dist/index.js) Node finds the nested copy. But when the import
  //    comes from outside that subtree (e.g. from
  //    node_modules/@react-navigation/native/.../Link.js), the nested
  //    copy is hidden. We try the nested copy first; if that doesn't
  //    exist on disk fall back to the default resolver.
  if (moduleName === "react-native-css-interop") {
    if (fs.existsSync(path.join(cssInteropPkgRoot, "package.json"))) {
      return { type: "sourceFile", filePath: path.join(cssInteropPkgRoot, "dist/index.js") };
    }
  }

  return originalResolveRequest
    ? originalResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./global.css" });
