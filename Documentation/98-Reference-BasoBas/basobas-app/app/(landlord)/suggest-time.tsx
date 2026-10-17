import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';

/**
 * Superseded by `/(landlord)/reschedule` (shared DateTimePicker flow).
 * Any stale deep link bounces back to the requests tab.
 */
export default function RetiredSuggestTimeScreen() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/(landlord)/(tabs)/requests' as any);
  }, [router]);
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color="#1A6B4A" />
    </View>
  );
}
