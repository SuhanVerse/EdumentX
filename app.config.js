// Keep app.json as the base; EAS file variables select matching native configs.
module.exports = ({ config }) => {
  const production = process.env.EXPO_PUBLIC_APP_ENV === 'production' ||
    ['production', 'production-apk'].includes(process.env.EAS_BUILD_PROFILE);
  if (production && process.env.EXPO_PUBLIC_USE_MOCK_DATA !== 'false') {
    throw new Error('Production builds require EXPO_PUBLIC_USE_MOCK_DATA=false.');
  }
  if (production && process.env.EXPO_PUBLIC_ENABLE_SANDBOX_PAYMENTS !== undefined &&
      process.env.EXPO_PUBLIC_ENABLE_SANDBOX_PAYMENTS !== 'false') {
    throw new Error('Production builds require EXPO_PUBLIC_ENABLE_SANDBOX_PAYMENTS=false.');
  }
  return {
    ...config,
    android: {
      ...config.android,
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON || config.android?.googleServicesFile,
    },
    ios: {
      ...config.ios,
      googleServicesFile: process.env.GOOGLE_SERVICE_INFO_PLIST || config.ios?.googleServicesFile,
    },
  };
};
