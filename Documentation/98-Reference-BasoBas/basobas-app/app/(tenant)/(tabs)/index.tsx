import { useEffect, useState } from 'react';
import { ScrollView, View, Text, Pressable, Image, ActivityIndicator } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { Bell, Search } from 'lucide-react-native';

import { ScreenBody } from '@/src/components/layout/ScreenBody';
import { usePropertyStore } from '@/src/store/propertyStore';
import { useClerkSupabase } from '@/src/hooks/useClerkSupabase';
import { useUser } from '@clerk/expo';
import { tokens } from '@/src/theme/tokens';

const { color } = tokens;

// ─── Constants ──────────────────────────────────────────────────────────────

const CITIES = ['Kathmandu', 'Lalitpur', 'Bhaktapur'] as const;
type City = (typeof CITIES)[number];

const fmtNpr = (n: number) => `NPR ${n.toLocaleString('en-US')}`;

// ─── Screen ─────────────────────────────────────────────────────────────────

export default function HomeTab() {
  const router = useRouter();
  const supabase = useClerkSupabase();
  const { user: clerkUser } = useUser();
  const [activeCity, setActiveCity] = useState<City>('Kathmandu');

  const { properties, hydrated, hydrate, hydrateError, setFilter } = usePropertyStore(
    (state) => ({
      properties: state.properties,
      hydrated: state.hydrated,
      hydrate: state.hydrate,
      hydrateError: state.hydrateError,
      setFilter: state.setFilter,
    }),
  );

  // Hydrate the real marketplace from Supabase on first mount.
  useEffect(() => {
    if (!hydrated && clerkUser?.id) {
      hydrate(supabase, clerkUser.id);
    }
  }, [hydrated, clerkUser?.id, supabase, hydrate]);

  const featuredProperty = properties[0];
  const recommendedProperties = properties.slice(1, 4);

  const handleCityPress = (city: City) => {
    setActiveCity(city);
    setFilter('city', city);
    router.push('/(tenant)/(tabs)/search' as any);
  };

  const handlePropertyPress = (id: string) => {
    router.push({ pathname: '/(tenant)/property/[id]' as any, params: { id } });
  };

  return (
    <ScreenBody>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}>
        {/* Status bar / safe-top spacer */}
        <View className="h-12" />

        {/* Greeting + bell */}
        <View className="flex-row items-center justify-between px-[24px] py-4">
          <View>
            <Text className="font-sans text-body-sm text-ink2">Namaste</Text>
            <Text className="mt-1 font-display text-h1 leading-tight text-ink">
              Find a rental in Nepal
            </Text>
          </View>
          <Link href={'/(tenant)/notifications' as any} asChild>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Notifications"
              className="h-[48px] w-[48px] items-center justify-center rounded-pill bg-input">
              <Bell size={20} color="#0A0A0A" />
            </Pressable>
          </Link>
        </View>

        {/* Search bar */}
        <View className="px-[24px] pt-2">
          <Pressable
            onPress={() => router.push('/(tenant)/(tabs)/search' as any)}
            accessibilityRole="button"
            accessibilityLabel="Open search"
            className="h-input-h flex-row items-center gap-3 rounded-pill bg-input px-5">
            <Search size={20} color="#888888" />
            <Text className="font-sans text-body text-ink2">Search city, area, or property</Text>
          </Pressable>
        </View>

        {/* City filter chips */}
        <View className="flex-row flex-wrap gap-3 px-[24px] pt-6">
          {CITIES.map((city) => {
            const isActive = city === activeCity;
            return (
              <Pressable
                key={city}
                onPress={() => handleCityPress(city)}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={`Filter by ${city}`}
                className={`h-[42px] items-center justify-center rounded-pill px-5 ${
                  isActive ? 'bg-ink' : 'bg-input'
                }`}>
                <Text className={`font-sans text-body-sm ${isActive ? 'text-bg' : 'text-ink'}`}>
                  {city}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* ── Loading ─────────────────────────────────────────────────── */}
        {!hydrated ? (
          <View className="items-center justify-center gap-3 px-[24px] pt-16">
            {hydrateError ? (
              <>
                <Text className="text-center font-sans text-body-sm text-danger">
                  Couldn&apos;t load rentals. Pull down or reopen to retry.
                </Text>
                <Pressable
                  onPress={() => clerkUser?.id && hydrate(supabase, clerkUser.id)}
                  accessibilityRole="button"
                  className="h-[44px] items-center justify-center rounded-pill bg-ink px-6">
                  <Text className="font-semibold text-body-sm text-white">Retry</Text>
                </Pressable>
              </>
            ) : (
              <ActivityIndicator size="small" color={color.brand} />
            )}
          </View>
        ) : properties.length === 0 ? (
          /* ── Empty state (no live listings) ─────────────────────────── */
          <View className="items-center gap-2 px-[24px] pt-16">
            <Text className="font-semibold text-h3 text-ink">No rentals available yet</Text>
            <Text className="text-center font-sans text-body-sm text-ink2">
              New listings from verified landlords will appear here as soon as they&apos;re live.
            </Text>
          </View>
        ) : (
          <>
            {/* Featured property card */}
            <View className="px-[24px] pt-6">
              <Pressable
                onPress={() => handlePropertyPress(featuredProperty.id)}
                accessibilityRole="button"
                accessibilityLabel={`Featured: ${featuredProperty.title}`}
                className="w-full overflow-hidden rounded-hero bg-canvas pb-2">
                {featuredProperty.photoUrls[0] ? (
                  <Image
                    source={{ uri: featuredProperty.photoUrls[0] }}
                    className="h-[210px] w-full"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="h-[210px] w-full bg-placeholder-image" />
                )}
                <View className="px-5 py-4">
                  <Text numberOfLines={1} className="font-semibold text-h3 text-ink">
                    {featuredProperty.title}
                  </Text>
                  <Text className="mt-1 font-sans text-body text-brand">
                    {fmtNpr(featuredProperty.price)} / month
                  </Text>
                  <Text className="mt-[6px] font-sans text-body-sm text-ink2">
                    {featuredProperty.locationArea}
                  </Text>
                </View>
              </Pressable>
            </View>

            {/* Recommended heading */}
            {recommendedProperties.length > 0 && (
              <>
                <View className="px-[24px] pt-8">
                  <Text className="font-semibold text-h2 text-ink">Recommended</Text>
                </View>

                {/* Recommended rows */}
                <View className="px-[24px] pt-4">
                  {recommendedProperties.map((row, idx) => (
                    <Pressable
                      key={row.id}
                      onPress={() => handlePropertyPress(row.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Recommended: ${row.title}`}
                      className={`flex-row items-center gap-4 py-4 ${
                        idx < recommendedProperties.length - 1 ? 'border-b border-divider' : ''
                      }`}>
                      {row.photoUrls[0] ? (
                        <Image
                          source={{ uri: row.photoUrls[0] }}
                          className="h-[72px] w-[72px] rounded-lg"
                          resizeMode="cover"
                        />
                      ) : (
                        <View className="h-[72px] w-[72px] rounded-lg bg-placeholder-image" />
                      )}
                      <View className="flex-1">
                        <Text numberOfLines={1} className="font-semibold text-body text-ink">
                          {row.title}
                        </Text>
                        <Text className="mt-1 font-sans text-body-sm text-ink2">
                          {fmtNpr(row.price)} / month
                        </Text>
                        <Text className="mt-1 font-sans text-caption text-placeholder">
                          {row.locationArea}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>
    </ScreenBody>
  );
}
