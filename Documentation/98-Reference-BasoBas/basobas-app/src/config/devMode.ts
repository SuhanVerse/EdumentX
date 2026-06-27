export type DevMode = 'auth' | 'tenant' | 'landlord' | null;

export function getDevMode(): DevMode {
  const raw = process.env.EXPO_PUBLIC_DEV_MODE?.trim().toLowerCase();
  if (raw === 'tenant' || raw === 'landlord' || raw === 'auth') return raw;
  return null;
}

export function getInitialHref() {
  const devMode = getDevMode();

  if (devMode === 'tenant') return '/(tenant)/(tabs)';
  if (devMode === 'landlord') return '/(landlord)/(tabs)';

  return '/(auth)/loading';
}
