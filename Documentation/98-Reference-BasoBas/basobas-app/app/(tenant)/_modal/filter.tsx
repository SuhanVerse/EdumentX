import { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { usePropertyStore } from '@/src/store/propertyStore';

// ─── Constants ──────────────────────────────────────────────────────────────

const PROPERTY_TYPES = ['All', '1BHK', '2BHK', 'Studio', '3BHK'] as const;
type PropertyType = (typeof PROPERTY_TYPES)[number];

const AMENITIES = ['Wi-Fi', 'Parking', 'Furnished', 'Balcony', 'Gym'] as const;
type Amenity = (typeof AMENITIES)[number];

const SORTS = ['Newest', 'Price: Low to High'] as const;
type SortOption = (typeof SORTS)[number];

// ─── Component ──────────────────────────────────────────────────────────────

export default function FilterDrawer() {
  const router = useRouter();
  
  const { filters, setFilter, properties } = usePropertyStore();

  const [type, setType] = useState<PropertyType>(filters.type as PropertyType);
  const [amenities, setAmenities] = useState<Set<Amenity>>(new Set(filters.amenities as Amenity[]));
  const [sort, setSort] = useState<SortOption>(filters.sortBy as SortOption);
  const [minPrice, setMinPrice] = useState<number>(filters.minPrice);
  const [maxPrice, setMaxPrice] = useState<number>(filters.maxPrice);

  const toggleAmenity = (a: Amenity) => {
    setAmenities((prev) => {
      const next = new Set(prev);
      if (next.has(a)) next.delete(a);
      else next.add(a);
      return next;
    });
  };

  const handleApply = () => {
    setFilter('type', type);
    setFilter('amenities', Array.from(amenities));
    setFilter('sortBy', sort);
    setFilter('minPrice', minPrice);
    setFilter('maxPrice', maxPrice);
    router.back();
  };

  // Dynamically count matching results based on current draft filters
  const draftFilteredCount = properties.filter((property) => {
    if (type !== 'All' && property.type !== type) {
      return false;
    }
    if (filters.city !== 'All' && property.location !== filters.city) {
      return false;
    }
    if (property.priceMonthly < minPrice || property.priceMonthly > maxPrice) {
      return false;
    }
    if (amenities.size > 0) {
      const hasAll = Array.from(amenities).every((amenity) =>
        property.amenityStrings.includes(amenity),
      );
      if (!hasAll) return false;
    }
    return true;
  }).length;

  return (
    <View
      className="flex-1 bg-bg"
      style={{
        borderTopLeftRadius: 22,
        borderTopRightRadius: 22,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 12,
      }}>
      <ScrollView
        className="px-[14px]"
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}>
        {/* Grab handle */}
        <View className="items-center pb-3">
          <View className="h-[4px] w-[36px] rounded-pill bg-line" />
        </View>

        {/* Title row */}
        <View className="flex-row items-center justify-between pb-3 pt-3">
          <Text className="font-bold text-[14px] leading-[21px] text-ink">Filters</Text>
          <Pressable
            onPress={() => {
              setType('All');
              setAmenities(new Set());
              setSort('Newest');
              setMinPrice(10000);
              setMaxPrice(60000);
            }}
            accessibilityRole="button"
            accessibilityLabel="Reset all filters">
            <Text className="font-sans text-[10px] leading-[15px] text-ink3">Reset All</Text>
          </Pressable>
        </View>

        {/* Price Range */}
        <View className="pt-[14px]">
          <Text className="font-semibold text-[10px] leading-[15px] text-ink">Price Range</Text>
          <View className="flex-row items-center gap-2 pt-2">
            <View className="h-[32px] flex-1 flex-row items-center rounded-sm border border-line bg-input px-[10px]">
              <Text className="font-sans text-[9px] leading-[13.5px] text-ink3">Rs.</Text>
              <Text className="ml-1 font-sans text-[9px] leading-[13.5px] text-ink">
                {minPrice.toLocaleString()}
              </Text>
            </View>
            <Text className="font-sans text-[10px] leading-[15px] text-placeholder">to</Text>
            <View className="h-[32px] flex-1 flex-row items-center rounded-sm border border-line bg-input px-[10px]">
              <Text className="font-sans text-[9px] leading-[13.5px] text-ink3">Rs.</Text>
              <Text className="ml-1 font-sans text-[9px] leading-[13.5px] text-ink">
                {maxPrice.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Property Type */}
        <View className="pt-[14px]">
          <Text className="font-semibold text-[10px] leading-[15px] text-ink">Property Type</Text>
          <View className="flex-row flex-wrap gap-2 pt-2">
            {PROPERTY_TYPES.map((t) => {
              const isActive = t === type;
              return (
                <Pressable
                  key={t}
                  onPress={() => setType(t)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                  accessibilityLabel={`Type ${t}`}
                  className={`h-[24px] items-center justify-center rounded-pill px-3 ${
                    isActive ? 'bg-ink' : 'bg-input'
                  }`}>
                  <Text
                    className={`font-semibold text-[8px] leading-[12px] ${
                      isActive ? 'text-bg' : 'text-ink2'
                    }`}>
                    {t}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Amenities */}
        <View className="pt-[14px]">
          <Text className="font-semibold text-[10px] leading-[15px] text-ink">Amenities</Text>
          <View className="flex-row flex-wrap gap-2 pt-2">
            {AMENITIES.map((a) => {
              const isActive = amenities.has(a);
              return (
                <Pressable
                  key={a}
                  onPress={() => toggleAmenity(a)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                  accessibilityLabel={`Amenity ${a}`}
                  className={`h-[24px] items-center justify-center rounded-pill px-3 ${
                    isActive ? 'bg-ink' : 'bg-input'
                  }`}>
                  <Text
                    className={`font-sans text-[8px] leading-[12px] ${
                      isActive ? 'text-bg' : 'text-ink2'
                    }`}>
                    {a}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Sort By */}
        <View className="pt-[14px]">
          <Text className="font-semibold text-[10px] leading-[15px] text-ink">Sort By</Text>
          <View className="flex-row flex-wrap gap-2 pt-2">
            {SORTS.map((s) => {
              const isActive = s === sort;
              return (
                <Pressable
                  key={s}
                  onPress={() => setSort(s)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                  accessibilityLabel={`Sort by ${s}`}
                  className={`h-[24px] items-center justify-center rounded-pill px-3 ${
                    isActive ? 'bg-ink' : 'bg-input'
                  }`}>
                  <Text
                    className={`font-semibold text-[8px] leading-[12px] ${
                      isActive ? 'text-bg' : 'text-ink2'
                    }`}>
                    {s}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Show results primary button */}
        <Pressable
          onPress={handleApply}
          accessibilityRole="button"
          accessibilityLabel={`Show ${draftFilteredCount} results`}
          className="mt-[18px] h-[38px] w-full items-center justify-center rounded-pill bg-ink">
          <Text className="font-bold text-[10px] leading-[15px] text-bg">
            Show {draftFilteredCount} results
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

