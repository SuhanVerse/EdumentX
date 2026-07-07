import { useState, useRef, useEffect } from 'react';
import { View, Text, Pressable, Modal, ScrollView, Animated, PanResponder } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePropertyStore } from '@/src/store/propertyStore';

type FilterDrawerProps = {
  visible: boolean;
  onClose: () => void;
};

const PROPERTY_TYPES = ['All', '1BHK', '2BHK', 'Studio', '3BHK'] as const;
const AMENITIES = ['Wi-Fi', 'Parking', 'Furnished', 'Balcony', 'Gym'] as const;
const SORT_OPTIONS = ['Newest', 'Price: Low to High'] as const;

export const FilterDrawer = ({ visible, onClose }: FilterDrawerProps) => {
  const insets = useSafeAreaInsets();
  
  const { filters, setFilter, properties } = usePropertyStore();

  const [activeType, setActiveType] = useState<string>(filters.type);
  const [activeAmenities, setActiveAmenities] = useState<string[]>(filters.amenities);
  const [activeSort, setActiveSort] = useState<string>(filters.sortBy);
  const [minPrice, setMinPrice] = useState<number>(filters.minPrice);
  const [maxPrice, setMaxPrice] = useState<number>(filters.maxPrice);

  useEffect(() => {
    if (visible) {
      // Sync local state with store filters when opening
      setActiveType(filters.type);
      setActiveAmenities(filters.amenities);
      setActiveSort(filters.sortBy);
      setMinPrice(filters.minPrice);
      setMaxPrice(filters.maxPrice);

      panY.setValue(1000); // Start off-screen
      Animated.timing(panY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const panY = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 10 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          panY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 150 || gestureState.vy > 1) {
          Animated.timing(panY, {
            toValue: 800,
            duration: 250,
            useNativeDriver: true,
          }).start(() => {
            onClose();
          });
        } else {
          Animated.spring(panY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 0,
          }).start();
        }
      },
    })
  ).current;

  const toggleAmenity = (amenity: string) => {
    setActiveAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]
    );
  };

  const handleReset = () => {
    setActiveType('All');
    setActiveAmenities([]);
    setActiveSort('Newest');
    setMinPrice(10000);
    setMaxPrice(60000);
  };

  const handleApply = () => {
    // Commit local draft filters to the propertyStore
    setFilter('type', activeType as any);
    setFilter('amenities', activeAmenities);
    setFilter('sortBy', activeSort as any);
    setFilter('minPrice', minPrice);
    setFilter('maxPrice', maxPrice);
    onClose();
  };

  // Dynamically count matching results based on current draft filters
  const draftFilteredCount = properties.filter((property) => {
    if (activeType !== 'All' && property.type !== activeType) {
      return false;
    }
    if (filters.city !== 'All' && property.location !== filters.city) {
      return false;
    }
    if (property.priceMonthly < minPrice || property.priceMonthly > maxPrice) {
      return false;
    }
    if (activeAmenities.length > 0) {
      const hasAll = activeAmenities.every((amenity) =>
        property.amenityStrings.includes(amenity),
      );
      if (!hasAll) return false;
    }
    return true;
  }).length;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/40" onPress={onClose}>
        <Animated.View
          onStartShouldSetResponder={() => true}
          className="overflow-hidden rounded-t-[32px] bg-bg"
          style={{
            paddingBottom: insets.bottom > 0 ? insets.bottom : 24,
            transform: [{ translateY: panY }],
          }}>
          {/* Drag Handle */}
          <View {...panResponder.panHandlers} className="w-full items-center bg-bg pb-2 pt-4">
            <View className="h-1.5 w-12 rounded-pill bg-line" />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}>
            {/* Header */}
            <View className="flex-row items-center justify-between py-4">
              <Text className="font-semibold text-h2 text-ink">Filters</Text>
              <Pressable onPress={handleReset}>
                <Text className="font-sans text-body-sm text-ink2">Reset All</Text>
              </Pressable>
            </View>

            {/* Price Range */}
            <View className="py-4">
              <Text className="mb-4 font-semibold text-body text-ink">Price Range</Text>
              <View className="flex-row items-center gap-3">
                <View className="h-[48px] flex-1 flex-row items-center rounded-lg border border-line bg-input px-4">
                  <Text className="mr-1 font-sans text-body text-ink2">Rs.</Text>
                  <Text className="font-sans text-body text-ink">{minPrice.toLocaleString()}</Text>
                </View>
                <Text className="font-sans text-body-sm text-placeholder">to</Text>
                <View className="h-[48px] flex-1 flex-row items-center rounded-lg border border-line bg-input px-4">
                  <Text className="mr-1 font-sans text-body text-ink2">Rs.</Text>
                  <Text className="font-sans text-body text-ink">{maxPrice.toLocaleString()}</Text>
                </View>
              </View>
            </View>

            {/* Property Type */}
            <View className="py-4">
              <Text className="mb-4 font-semibold text-body text-ink">Property Type</Text>
              <View className="flex-row flex-wrap gap-2">
                {PROPERTY_TYPES.map((type) => {
                  const isActive = activeType === type;
                  return (
                    <Pressable
                      key={type}
                      onPress={() => setActiveType(type)}
                      className={`h-[42px] items-center justify-center rounded-pill px-5 ${
                        isActive ? 'bg-ink' : 'bg-input'
                      }`}>
                      <Text
                        className={`font-sans text-body-sm ${isActive ? 'text-bg' : 'text-ink'}`}>
                        {type}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Amenities */}
            <View className="py-4">
              <Text className="mb-4 font-semibold text-body text-ink">Amenities</Text>
              <View className="flex-row flex-wrap gap-2">
                {AMENITIES.map((amenity) => {
                  const isActive = activeAmenities.includes(amenity);
                  return (
                    <Pressable
                      key={amenity}
                      onPress={() => toggleAmenity(amenity)}
                      className={`h-[42px] items-center justify-center rounded-pill px-5 ${
                        isActive ? 'bg-ink' : 'bg-input'
                      }`}>
                      <Text
                        className={`font-sans text-body-sm ${isActive ? 'text-bg' : 'text-ink'}`}>
                        {amenity}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Sort By */}
            <View className="py-4">
              <Text className="mb-4 font-semibold text-body text-ink">Sort By</Text>
              <View className="flex-row flex-wrap gap-2">
                {SORT_OPTIONS.map((sort) => {
                  const isActive = activeSort === sort;
                  return (
                    <Pressable
                      key={sort}
                      onPress={() => setActiveSort(sort)}
                      className={`h-[42px] items-center justify-center rounded-pill px-5 ${
                        isActive ? 'bg-ink' : 'bg-input'
                      }`}>
                      <Text
                        className={`font-sans text-body-sm ${isActive ? 'text-bg' : 'text-ink'}`}>
                        {sort}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Show Results Button */}
            <View className="pt-6">
              <Pressable
                onPress={handleApply}
                className="h-[56px] w-full items-center justify-center rounded-pill bg-ink">
                <Text className="font-semibold text-body text-bg">
                  Show {draftFilteredCount} results
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

