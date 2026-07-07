import { useState } from 'react';
import { ScrollView, View, Text, Pressable } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, MapPin, ChevronDown, SlidersHorizontal, Heart, Map } from 'lucide-react-native';

import { tokens } from '@/src/theme/tokens';
import { FilterDrawer } from '@/src/components/property/FilterDrawer';
import { DOCK_BOTTOM_GAP } from '@/src/components/navigation/GlassDock/GlassDock';
import { usePropertyStore } from '@/src/store/propertyStore';

const BHK_FILTERS = ['All', '1BHK', '2BHK', '3BHK', 'Studio'] as const;
type BhkFilter = (typeof BHK_FILTERS)[number];

const FAB_SIZE = 56;

export default function SearchResults() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isFilterVisible, setIsFilterVisible] = useState(false);

  const { filters, setFilter, toggleSaved, savedPropertyIds, getFilteredProperties } = usePropertyStore();
  const filteredProperties = getFilteredProperties();

  const dockTopEdge = insets.bottom + DOCK_BOTTOM_GAP + tokens.space.dockH;
  const fabBottom = dockTopEdge + 16; // 16px gap above the floating dock

  const handleBhkPress = (chip: BhkFilter) => {
    setFilter('type', chip);
  };

  const handleSortPress = () => {
    const nextSort = filters.sortBy === 'Newest' ? 'Price: Low to High' : 'Newest';
    setFilter('sortBy', nextSort);
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      <View className="bg-bg">
        <View className="pt-4">
          {/* ── Header ─────────────────────────────────────────────────────── */}
          <View className="flex-row items-center gap-3 px-[24px]">
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Back"
              className="h-[48px] w-[48px] items-center justify-center rounded-pill bg-input">
              <ArrowLeft size={20} color="#0A0A0A" strokeWidth={2} />
            </Pressable>

            <View className="h-[48px] flex-1 flex-row items-center gap-2 rounded-pill bg-input px-4">
              <MapPin size={18} color="#0A0A0A" />
              <Text className="font-sans text-body text-ink">
                {filters.city === 'All' ? 'All Nepal' : filters.city}
              </Text>
            </View>

            <Pressable
              onPress={() => setIsFilterVisible(true)}
              accessibilityRole="button"
              accessibilityLabel="Filters"
              className="h-[48px] w-[48px] items-center justify-center rounded-pill bg-input">
              <SlidersHorizontal size={20} color="#0A0A0A" strokeWidth={2} />
            </Pressable>
          </View>

          {/* ── BHK filter chips ───────────────────────────────────────────── */}
          <View className="py-4 pl-[24px]">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12, paddingRight: 24 }}>
              {BHK_FILTERS.map((chip) => {
                const isActive = chip === filters.type;
                return (
                  <Pressable
                    key={chip}
                    onPress={() => handleBhkPress(chip)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isActive }}
                    accessibilityLabel={`Filter ${chip}`}
                    className={`h-[42px] items-center justify-center rounded-pill px-5 ${
                      isActive ? 'bg-ink' : 'bg-input'
                    }`}>
                    <Text
                      className={`font-sans text-body-sm ${isActive ? 'text-bg' : 'text-ink2'}`}>
                      {chip}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>

        {/* ── Results count + sort bar ───────────────────────────────────── */}
        <View className="flex-row items-center justify-between border-t border-canvas px-[24px] py-4">
          <Text className="font-semibold text-body-sm text-ink2">
            {filteredProperties.length} results
          </Text>
          <Pressable
            onPress={handleSortPress}
            accessibilityRole="button"
            accessibilityLabel="Sort"
            className="flex-row items-center gap-1.5">
            <ChevronDown size={16} color="#888888" strokeWidth={2} />
            <Text className="font-sans text-body-sm text-ink2">Sort: {filters.sortBy}</Text>
          </Pressable>
        </View>
      </View>

      {/* ── Results list ───────────────────────────────────────────────── */}
      <ScrollView
        className="flex-1 bg-canvas"
        contentContainerStyle={{
          paddingTop: 16,
          paddingBottom: fabBottom + FAB_SIZE + 24, // Enough padding to scroll past the FAB
          paddingHorizontal: 24,
          gap: 16,
        }}
        showsVerticalScrollIndicator={false}>
        {filteredProperties.map((row) => {
          const isSaved = savedPropertyIds.includes(row.id);
          return (
            <Pressable
              key={row.id}
              onPress={() => router.push({ pathname: '/(tenant)/property/[id]' as any, params: { id: row.id } })}
              accessibilityRole="button"
              accessibilityLabel={`${row.title}, ${row.currency} ${row.priceMonthly.toLocaleString()} / month`}
              className="flex-row items-start gap-4 rounded-card bg-bg p-4">
              <View className="h-[80px] w-[80px] shrink-0 rounded-lg bg-placeholder-image" />
              <View className="flex-1 justify-center py-1">
                <Text numberOfLines={1} className="font-semibold text-body text-ink">
                  {row.title}
                </Text>
                <View className="mt-1">
                  <Text className="font-sans text-body-sm text-brand">
                    {row.currency} {row.priceMonthly.toLocaleString()} / month
                  </Text>
                </View>
                <View className="mt-1.5 flex-row items-center gap-1">
                  <MapPin size={12} color="#888888" />
                  <Text className="font-sans text-caption text-ink3">
                    {row.area}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  toggleSaved(row.id);
                }}
                accessibilityRole="button"
                accessibilityLabel={isSaved ? 'Remove from saved' : 'Save property'}
                className="h-[24px] w-[24px] items-center justify-center">
                <Heart
                  size={20}
                  color={isSaved ? '#E53E3E' : '#AAAAAA'}
                  fill={isSaved ? '#E53E3E' : 'transparent'}
                  strokeWidth={1.5}
                />
              </Pressable>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* ── Floating map FAB ────────────────────────────────────────────── */}
      <View pointerEvents="box-none" style={{ position: 'absolute', right: 24, bottom: fabBottom }}>
        <Pressable
          onPress={() => router.push('/(tenant)/map' as any)}
          accessibilityRole="button"
          accessibilityLabel="Show on map"
          className="h-[56px] w-[56px] items-center justify-center rounded-pill bg-ink"
          style={{
            shadowColor: '#0A0A0A',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 8,
          }}>
          <Map size={24} color="#FFFFFF" />
        </Pressable>
      </View>

      <FilterDrawer visible={isFilterVisible} onClose={() => setIsFilterVisible(false)} />
    </SafeAreaView>
  );
}

