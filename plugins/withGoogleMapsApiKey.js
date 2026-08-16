/**
 * withGoogleMapsApiKey — injects `com.google.android.geo.API_KEY`
 * into the AndroidManifest for expo-maps (<GoogleMaps.View />).
 *
 * Expo's built-in `android.config.googleMaps` is only honored by the
 * legacy react-native-maps prebuild plugin (which we don't install),
 * so without this plugin the key never reaches the manifest and
 * Google Maps crashes at runtime with "API key not found".
 *
 * Key source: EXPO_PUBLIC_GOOGLE_MAPS_API_KEY (read from .env during
 * prebuild). Falls back to android.config.googleMaps.apiKey if set.
 */
const { withAndroidManifest } = require('expo/config-plugins');

const META_API_KEY = 'com.google.android.geo.API_KEY';

module.exports = function withGoogleMapsApiKey(config) {
  const apiKey =
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ??
    config.android?.config?.googleMaps?.apiKey;

  if (!apiKey) {
    console.warn(
      '[withGoogleMapsApiKey] No Google Maps API key found. Set EXPO_PUBLIC_GOOGLE_MAPS_API_KEY in .env or Android will crash with "API key not found".',
    );
    return config;
  }

  return withAndroidManifest(config, (config) => {
    const mainApp = config.modResults.manifest.application?.[0];
    if (!mainApp) return config;

    const metaData = (mainApp['meta-data'] ?? []).filter(
      (item) => item.$?.['android:name'] !== META_API_KEY,
    );
    metaData.push({
      $: {
        'android:name': META_API_KEY,
        'android:value': apiKey,
      },
    });
    mainApp['meta-data'] = metaData;
    return config;
  });
};