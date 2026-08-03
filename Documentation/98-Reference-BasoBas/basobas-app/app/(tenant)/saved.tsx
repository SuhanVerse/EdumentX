import { useCallback, useState } from 'react';
import { ScrollView, View, Text, Pressable, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Heart, MapPin } from 'lucide-react-native';
import { useUser } from '@clerk/expo';

import { ScreenHeader } from '../../src/components/layout/ScreenHeader';
import { useClerkSupabase } from '@/src/hooks/useClerkSupabase';
import { getSavedPropertiesForTenant } from '@/src/services/properties.service';
import { usePropertyStore } from '@/src/store/propertyStore';
import type { PropertyPublic } from '@/src/types/property.types';

const fmtNpr = (n: number) => `NPR ${n.toLocaleString('en-US')}`;

export default function SavedScreen() {
  const router = useRouter();
  const supabase = useClerkSupabase();
  const { user: clerkUser } = useUser();
  const toggleSaved = usePropertyStore((s) => s.toggleSaved);

  const [saved, setSaved] = useState<PropertyPublic[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const clerkId = clerkUser?.id;
    if (!clerkId) return;
    const result = await getSavedPropertiesForTenant(clerkId, supabase);
    if (result.success) setSaved(result.data);
    setLoading(false);
  }, [clerkUser?.id, supabase]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleUnsave = useCallback(
    (property: PropertyPublic) => {
      if (!clerkUser?.id) return;
      // Optimistic: the property leaves the list immediately, and the store
      // (which backs the heart icons elsewhere) is updated to match.
      setSaved((prev) => prev.filter((p) => p.id !== property.id));
      toggleSaved(property.id, supabase, clerkUser.id);
    },
    [clerkUser?.id, supabase, toggleSaved],
  );

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      <ScreenHeader title="Saved Properties" showBack centerTitle />
      <ScrollView className="px-6" contentContainerStyle={{ paddingTop: 16, paddingBottom: 120 }}>
        {loading ? (
          <View className="items-center justify-center py-20">
            <ActivityIndicator size="small" color="#1A6B4A" />
          </View>
        ) : saved.length === 0 ? (
          <Text className="mt-20 text-center font-sans text-body text-ink2">
            No saved properties yet. Tap the heart icon on any property to save it.
          </Text>
        ) : (
          saved.map((property) => (
            <Pressable
              key={property.id}
              onPress={() =>
                router.push({ pathname: '/(tenant)/property/[id]' as any, params: { id: property.id } })
              }
              accessibilityRole="button"
              accessibilityLabel={`${property.title}, ${fmtNpr(property.price)} / month`}
              className="mb-4 flex-row items-start gap-4 rounded-card bg-canvas p-4">
              {property.photoUrls[0] ? (
                <Image
                  source={{ uri: property.photoUrls[0] }}
                  className="h-[80px] w-[80px] shrink-0 rounded-lg"
                  resizeMode="cover"
                />
              ) : (
                <View className="h-[80px] w-[80px] shrink-0 rounded-lg bg-placeholder-image" />
              )}
              <View className="flex-1 justify-center py-1">
                <Text numberOfLines={1} className="font-semibold text-body text-ink">
                  {property.title}
                </Text>
                <Text className="mt-1 font-sans text-body-sm text-brand">
                  {fmtNpr(property.price)} / month
                </Text>
                <View className="mt-1.5 flex-row items-center gap-1">
                  <MapPin size={12} color="#888888" />
                  <Text className="font-sans text-caption text-ink3">{property.locationArea}</Text>
                </View>
              </View>
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  handleUnsave(property);
                }}
                accessibilityRole="button"
                accessibilityLabel="Remove from saved"
                className="h-[24px] w-[24px] items-center justify-center">
                <Heart size={20} color="#E53E3E" fill="#E53E3E" strokeWidth={1.5} />
              </Pressable>
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
