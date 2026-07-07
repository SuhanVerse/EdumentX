import { useCallback, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  PanResponder,
  Pressable,
  TextInput,
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  type LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Compass,
  Heart,
  MapPin,
  Search as SearchIcon,
  Crosshair,
  X,
} from 'lucide-react-native';

import { RadiusMapView } from '@/src/components/property/RadiusMapView';

// ─── Types ───────────────────────────────────────────────────────────────────

interface SearchLocation {
  label: string;
  coordinate?: { latitude: number; longitude: number };
}

interface NearbyProperty {
  id: string;
  title: string;
  priceMonthly: number;
  currency: string;
  distanceKm: number;
  thumbnailUrl?: string;
  isFavorited: boolean;
}

// ─── Location Data ───────────────────────────────────────────────────────────
// Searchable list of popular Nepal locations. The picker filters this list by
// user input, and also supports free-text entry for unlisted locations.

const NEPAL_LOCATIONS: SearchLocation[] = [
  { label: 'Kathmandu, Nepal', coordinate: { latitude: 27.7172, longitude: 85.324 } },
  { label: 'Lalitpur, Nepal', coordinate: { latitude: 27.6588, longitude: 85.3247 } },
  { label: 'Bhaktapur, Nepal', coordinate: { latitude: 27.6712, longitude: 85.4298 } },
  { label: 'Pokhara, Nepal', coordinate: { latitude: 28.2096, longitude: 83.9856 } },
  { label: 'Thamel, Kathmandu', coordinate: { latitude: 27.7154, longitude: 85.3123 } },
  { label: 'Kupondole, Lalitpur', coordinate: { latitude: 27.6849, longitude: 85.3163 } },
  { label: 'Patan, Lalitpur', coordinate: { latitude: 27.6727, longitude: 85.3259 } },
  { label: 'Lazimpat, Kathmandu', coordinate: { latitude: 27.7218, longitude: 85.3222 } },
  { label: 'Boudha, Kathmandu', coordinate: { latitude: 27.7215, longitude: 85.362 } },
  { label: 'Budhanilkantha, Kathmandu', coordinate: { latitude: 27.7728, longitude: 85.3642 } },
  { label: 'Baneshwor, Kathmandu', coordinate: { latitude: 27.6915, longitude: 85.3445 } },
  { label: 'Baluwatar, Kathmandu', coordinate: { latitude: 27.7288, longitude: 85.3305 } },
  { label: 'Jhamsikhel, Lalitpur', coordinate: { latitude: 27.6771, longitude: 85.3188 } },
  { label: 'Sanepa, Lalitpur', coordinate: { latitude: 27.6867, longitude: 85.3091 } },
  { label: 'Maharajgunj, Kathmandu', coordinate: { latitude: 27.7361, longitude: 85.3349 } },
  { label: 'Chabahil, Kathmandu', coordinate: { latitude: 27.7179, longitude: 85.3475 } },
  { label: 'Koteshwor, Kathmandu', coordinate: { latitude: 27.6777, longitude: 85.3496 } },
  { label: 'Kirtipur, Kathmandu', coordinate: { latitude: 27.6783, longitude: 85.2775 } },
  { label: 'Jorpati, Kathmandu', coordinate: { latitude: 27.7289, longitude: 85.3697 } },
  { label: 'Naxal, Kathmandu', coordinate: { latitude: 27.7178, longitude: 85.3266 } },
  { label: 'Pulchowk, Lalitpur', coordinate: { latitude: 27.6811, longitude: 85.3183 } },
  { label: 'Battisputali, Kathmandu', coordinate: { latitude: 27.706, longitude: 85.3392 } },
  { label: 'Kalanki, Kathmandu', coordinate: { latitude: 27.6935, longitude: 85.2817 } },
  { label: 'Thapathali, Kathmandu', coordinate: { latitude: 27.6928, longitude: 85.3222 } },
  { label: 'Swayambhu, Kathmandu', coordinate: { latitude: 27.7149, longitude: 85.2904 } },
];

// ─── Mock Data ───────────────────────────────────────────────────────────────

const INITIAL_LOCATION: SearchLocation = NEPAL_LOCATIONS[0];

const ALL_NEARBY: NearbyProperty[] = [
  {
    id: 'kupondole',
    title: '2BHK in Kupondole',
    priceMonthly: 28500,
    currency: 'Rs.',
    distanceKm: 0.8,
    isFavorited: true,
  },
  {
    id: 'thamel',
    title: 'Studio near Thamel',
    priceMonthly: 18000,
    currency: 'Rs.',
    distanceKm: 1.4,
    isFavorited: false,
  },
  {
    id: 'patan',
    title: '1BHK in Patan',
    priceMonthly: 22000,
    currency: 'Rs.',
    distanceKm: 1.9,
    isFavorited: false,
  },
  {
    id: 'lazimpat',
    title: '2BHK in Lazimpat with Balcony',
    priceMonthly: 36000,
    currency: 'Rs.',
    distanceKm: 2.3,
    isFavorited: true,
  },
  {
    id: 'boudha',
    title: 'Cozy 1BHK near Boudha',
    priceMonthly: 20000,
    currency: 'Rs.',
    distanceKm: 2.8,
    isFavorited: false,
  },
  {
    id: 'budhanilkantha',
    title: 'Family home in Budhanilkantha',
    priceMonthly: 42000,
    currency: 'Rs.',
    distanceKm: 3.4,
    isFavorited: false,
  },
];

// ─── Slider Constants ────────────────────────────────────────────────────────

const RADIUS_MIN_KM = 0.5;
const RADIUS_MAX_KM = 10;
const RADIUS_INITIAL = 2.5;
const SLIDER_HIT_SLOP = 24; // px around thumb to make the 44pt target easy to grab

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function RadiusSearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Search center (the only thing whose location is disclosed on the map).
  const [location, setLocation] = useState<SearchLocation>(INITIAL_LOCATION);
  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);

  // Two radius values — see §5 of the spec for the draft/applied distinction.
  const [draftRadiusKm, setDraftRadiusKm] = useState(RADIUS_INITIAL);
  const [appliedRadiusKm, setAppliedRadiusKm] = useState(RADIUS_INITIAL);

  const [favorites, setFavorites] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(ALL_NEARBY.map((p) => [p.id, p.isFavorited])),
  );

  const [recenterFlash, setRecenterFlash] = useState(false);

  // Filter the carousel using ONLY `appliedRadiusKm`.
  const visibleProperties = useMemo(
    () => ALL_NEARBY.filter((p) => p.distanceKm <= appliedRadiusKm),
    [appliedRadiusKm],
  );

  // ── Handlers ────────────────────────────────────────────────────────────

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const goToProperty = useCallback(
    (id: string) => {
      router.push({ pathname: '/(tenant)/property/[id]' as any, params: { id } });
    },
    [router],
  );

  const onUpdateResults = useCallback(() => {
    setAppliedRadiusKm(draftRadiusKm);
  }, [draftRadiusKm]);

  // Recenter — real `expo-location` integration is a TODO; for now give a
  // visible pressed-state acknowledgement so the button never feels dead.
  const onRecenter = useCallback(() => {
    setRecenterFlash(true);
    setTimeout(() => setRecenterFlash(false), 600);
    // TODO: expo-location getCurrentPositionAsync → update `location.coordinate`
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      <View className="flex-1">
        {/* ── Map area (fills the remaining flex space) ───────────── */}
        <View className="flex-1">
          <RadiusMapView
            centerLabel={location.label}
            radiusKm={draftRadiusKm}
            onRecenter={onRecenter}
          />

          {/* ── Floating top bar ─────────────────────────────────── */}
          <View
            pointerEvents="box-none"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              paddingTop: 12,
              paddingHorizontal: 16,
            }}>
            <View className="flex-row items-center gap-3">
              <Pressable
                onPress={() => router.back()}
                accessibilityRole="button"
                accessibilityLabel="Back"
                className="h-[44px] w-[44px] items-center justify-center rounded-pill bg-bg"
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.12,
                  shadowRadius: 8,
                  elevation: 4,
                }}>
                <ArrowLeft size={20} color="#0A0A0A" strokeWidth={2} />
              </Pressable>

              <Pressable
                onPress={() => setIsLocationPickerOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="Change search location"
                className="h-[56px] flex-1 flex-row items-center gap-3 rounded-card bg-bg px-4 py-2"
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.12,
                  shadowRadius: 8,
                  elevation: 4,
                }}>
                <View className="h-7 w-7 items-center justify-center rounded-pill bg-input">
                  <SearchIcon size={14} color="#0A0A0A" />
                </View>
                <View className="flex-1">
                  <Text className="font-medium text-[10px] uppercase tracking-wide text-ink2">
                    Near location
                  </Text>
                  <Text
                    numberOfLines={1}
                    className="mt-0.5 font-semibold text-body-sm text-ink">
                    {location.label}
                  </Text>
                </View>
              </Pressable>
            </View>

            {/* ── Radius Search mode pill ─────────────────────────── */}
            <View className="mt-3 flex-row">
              <View className="flex-row items-center gap-2 rounded-pill bg-ink px-4 py-2.5">
                <Compass size={14} color="#FFFFFF" />
                <Text className="font-semibold text-body-sm text-white">Radius Search</Text>
              </View>
            </View>
          </View>

          {/* Recenter acknowledgement toast */}
          {recenterFlash && (
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                bottom: 16,
                left: 0,
                right: 0,
                alignItems: 'center',
              }}>
              <View className="rounded-pill bg-ink/85 px-3 py-1.5">
                <Text className="font-medium text-caption text-white">
                  Centering on your location…
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* ── Bottom section (normal flow, not absolute) ────────────── */}
        <View
          className="bg-bg"
          style={{ paddingBottom: Math.max(insets.bottom, 8) }}>
          {/* ── Property carousel ──────────────────────────────────── */}
          <View className="pt-3 pb-2">
            {visibleProperties.length > 0 ? (
              <FlatList
                horizontal
                data={visibleProperties}
                keyExtractor={(p) => p.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
                renderItem={({ item }) => (
                  <NearbyCard
                    property={item}
                    favorited={!!favorites[item.id]}
                    onToggleFavorite={() => toggleFavorite(item.id)}
                    onPress={() => goToProperty(item.id)}
                  />
                )}
                snapToInterval={CARD_WIDTH + 12}
                decelerationRate="fast"
                snapToAlignment="start"
              />
            ) : (
              <EmptyRadiusState />
            )}
          </View>

          {/* ── Radius control sheet ───────────────────────────────── */}
          <View
            className="border-t border-line px-5 pb-2 pt-4"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.04,
              shadowRadius: 6,
              elevation: 2,
            }}>
            <View className="flex-row items-center justify-between pb-3">
              <Text className="font-semibold text-body text-ink">Search Radius</Text>
              <Text className="font-bold text-body text-[#3B82F6]">
                {draftRadiusKm.toFixed(1)} km
              </Text>
            </View>

            <RadiusSlider value={draftRadiusKm} onChange={setDraftRadiusKm} />

            <Pressable
              onPress={onUpdateResults}
              accessibilityRole="button"
              accessibilityLabel="Update results"
              className="mt-4 h-[52px] items-center justify-center rounded-pill bg-ink">
              <Text className="font-semibold text-body text-white">Update Results</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* ── Location picker sheet (searchable) ──────────────────────── */}
      {isLocationPickerOpen && (
        <LocationPickerSheet
          current={location}
          onSelect={(loc) => {
            setLocation(loc);
            setIsLocationPickerOpen(false);
          }}
          onClose={() => setIsLocationPickerOpen(false)}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Carousel Card ───────────────────────────────────────────────────────────

const CARD_WIDTH = 264;

const NearbyCard = ({
  property,
  favorited,
  onToggleFavorite,
  onPress,
}: {
  property: NearbyProperty;
  favorited: boolean;
  onToggleFavorite: () => void;
  onPress: () => void;
}) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={`${property.title}, ${property.distanceKm.toFixed(1)} km away`}
    className="overflow-hidden rounded-card bg-bg"
    style={{
      width: CARD_WIDTH,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.10,
      shadowRadius: 10,
      elevation: 5,
    }}>
    <View className="flex-row p-3">
      <View className="h-[68px] w-[68px] shrink-0 items-center justify-center rounded-lg bg-placeholder-image">
        <Text className="font-sans text-caption text-ink3">Photo</Text>
      </View>

      <View className="ml-3 flex-1 pr-1">
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          className="font-semibold text-body-sm text-ink">
          {property.title}
        </Text>
        <Text className="mt-1 font-bold text-body-sm text-brand">
          {property.currency} {property.priceMonthly.toLocaleString()}
          <Text className="font-sans text-caption text-ink2"> / mo</Text>
        </Text>
        <View className="mt-1 flex-row items-center">
          <MapPin size={11} color="#6B6B6B" />
          <Text className="ml-1 font-sans text-caption text-ink2">
            {property.distanceKm.toFixed(1)} km away
          </Text>
        </View>
      </View>

      {/* Heart toggles favorite WITHOUT triggering the card's onPress. */}
      <Pressable
        onPress={onToggleFavorite}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={favorited ? 'Remove from favorites' : 'Add to favorites'}
        className="h-8 w-8 items-center justify-center">
        <Heart
          size={18}
          color={favorited ? '#E53E3E' : '#AAAAAA'}
          fill={favorited ? '#E53E3E' : 'transparent'}
        />
      </Pressable>
    </View>
  </Pressable>
);

// ─── Empty State ─────────────────────────────────────────────────────────────

const EmptyRadiusState = () => (
  <View className="mx-4 flex-row items-center gap-3 rounded-card bg-bg p-4"
    style={{
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.10,
      shadowRadius: 10,
      elevation: 5,
    }}>
    <View className="h-10 w-10 items-center justify-center rounded-pill bg-canvas">
      <Crosshair size={18} color="#3B82F6" />
    </View>
    <View className="flex-1">
      <Text className="font-semibold text-body-sm text-ink">No properties in this radius</Text>
      <Text className="mt-0.5 font-sans text-caption text-ink2">
        Try expanding it — drag the slider and tap Update Results.
      </Text>
    </View>
  </View>
);

// ─── Radius Slider ───────────────────────────────────────────────────────────
//
// Built locally because no slider package is installed and the existing design
// system has no slider atom. The drag is smooth (PanResponder + Animated-style
// state updates) and the touch target is ≥44pt via SLIDER_HIT_SLOP.

const TRACK_HEIGHT = 4;
const THUMB_SIZE = 24;

const RadiusSlider = ({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) => {
  const [width, setWidth] = useState(0);
  const widthRef = useRef(0);

  const ratio = useMemo(() => {
    if (width <= 0) return 0;
    return Math.max(0, Math.min(1, (value - RADIUS_MIN_KM) / (RADIUS_MAX_KM - RADIUS_MIN_KM)));
  }, [value, width]);

  const valueFromX = useCallback(
    (x: number) => {
      if (widthRef.current <= 0) return value;
      const r = Math.max(0, Math.min(1, x / widthRef.current));
      const km = RADIUS_MIN_KM + r * (RADIUS_MAX_KM - RADIUS_MIN_KM);
      // Snap to 0.1 km increments so the display is stable.
      return Math.round(km * 10) / 10;
    },
    [value],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => {
          onChange(valueFromX(e.nativeEvent.locationX));
        },
        onPanResponderMove: (e) => {
          onChange(valueFromX(e.nativeEvent.locationX));
        },
      }),
    [onChange, valueFromX],
  );

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    widthRef.current = w;
    setWidth(w);
  };

  const fillWidth = ratio * width;
  const thumbX = fillWidth - THUMB_SIZE / 2;

  return (
    <View
      accessibilityRole="adjustable"
      accessibilityLabel={`Search radius, ${value.toFixed(1)} kilometers`}
      // accessibilityValue requires integers on iOS (JSI long-long conversion).
      // Report in tenths of a km so we don't lose meaningful precision.
      accessibilityValue={{
        min: Math.round(RADIUS_MIN_KM * 10),
        max: Math.round(RADIUS_MAX_KM * 10),
        now: Math.round(value * 10),
      }}
      onLayout={onLayout}
      {...panResponder.panHandlers}
      className="h-[44px] justify-center">
      {/* Track */}
      <View
        className="overflow-hidden rounded-pill bg-line"
        style={{ height: TRACK_HEIGHT }}>
        <View
          className="h-full bg-[#3B82F6]"
          style={{ width: Math.max(2, fillWidth) }}
        />
      </View>

      {/* Thumb (positioned absolutely to sit on the track) */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: Math.max(0, thumbX),
          width: THUMB_SIZE,
          height: THUMB_SIZE,
          borderRadius: THUMB_SIZE / 2,
          backgroundColor: '#3B82F6',
          borderWidth: 3,
          borderColor: '#FFFFFF',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.18,
          shadowRadius: 4,
          elevation: 4,
        }}
      />

      {/* Hit-slop overlay keeps the touch target ≥44pt without affecting visuals */}
      <View
        pointerEvents="none"
        style={{ position: 'absolute', top: -SLIDER_HIT_SLOP, left: 0, right: 0, height: 44 + SLIDER_HIT_SLOP * 2 }}
      />
    </View>
  );
};

// ─── Location Picker Sheet ───────────────────────────────────────────────────
//
// Searchable location picker — filters the NEPAL_LOCATIONS list by user input,
// and also supports free-text entry for unlisted locations. This replaces the
// previous hard-coded 4-item list.

const LocationPickerSheet = ({
  current,
  onSelect,
  onClose,
}: {
  current: SearchLocation;
  onSelect: (loc: SearchLocation) => void;
  onClose: () => void;
}) => {
  const [query, setQuery] = useState('');
  const insets = useSafeAreaInsets();

  const filteredLocations = useMemo(() => {
    if (!query.trim()) return NEPAL_LOCATIONS;
    const lowerQuery = query.trim().toLowerCase();
    return NEPAL_LOCATIONS.filter((loc) =>
      loc.label.toLowerCase().includes(lowerQuery),
    );
  }, [query]);

  // Show a "use custom location" option when the user types something
  // that doesn't exactly match any listed location.
  const showCustomOption = useMemo(() => {
    if (!query.trim()) return false;
    const lowerQuery = query.trim().toLowerCase();
    return !NEPAL_LOCATIONS.some(
      (loc) => loc.label.toLowerCase() === lowerQuery,
    );
  }, [query]);

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        justifyContent: 'flex-end',
      }}>
      <Pressable
        onPress={onClose}
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: 'rgba(0,0,0,0.35)',
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}>
        <View
          className="rounded-t-hero bg-bg px-5 pb-4 pt-3"
          style={{
            paddingBottom: Math.max(insets.bottom, 16),
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -8 },
            shadowOpacity: 0.18,
            shadowRadius: 16,
            elevation: 12,
            maxHeight: 480,
          }}>
          {/* Drag handle */}
          <View className="mb-3 h-1 w-10 self-center rounded-pill bg-line" />

          <Text className="font-display text-h2 text-ink">Search near</Text>
          <Text className="mt-1 font-sans text-body-sm text-ink2">
            Search for a city or area in Nepal.
          </Text>

          {/* Search input */}
          <View className="mt-4 h-[48px] flex-row items-center rounded-lg bg-input px-4">
            <SearchIcon size={18} color="#AAAAAA" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Type a location..."
              placeholderTextColor="#C0C0C0"
              autoFocus
              autoCapitalize="words"
              autoCorrect={false}
              className="ml-2 flex-1 font-sans text-body text-ink"
            />
            {query.length > 0 && (
              <Pressable
                onPress={() => setQuery('')}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
                className="ml-1 h-7 w-7 items-center justify-center rounded-pill bg-line">
                <X size={14} color="#6B6B6B" />
              </Pressable>
            )}
          </View>

          {/* Custom free-text option */}
          {showCustomOption && (
            <Pressable
              onPress={() => onSelect({ label: query.trim() })}
              accessibilityRole="button"
              accessibilityLabel={`Use "${query.trim()}" as location`}
              className="mt-3 flex-row items-center gap-3 rounded-card border border-[#3B82F6] bg-[#EFF6FF] px-4 py-3">
              <View className="h-8 w-8 items-center justify-center rounded-pill bg-[#DBEAFE]">
                <MapPin size={14} color="#3B82F6" />
              </View>
              <View className="flex-1">
                <Text className="font-sans text-caption text-[#3B82F6]">Use this location</Text>
                <Text className="font-medium text-body text-ink">{query.trim()}</Text>
              </View>
            </Pressable>
          )}

          {/* Filtered results */}
          <View className="mt-3 overflow-hidden rounded-card border border-line" style={{ maxHeight: 280 }}>
            <FlatList
              data={filteredLocations}
              keyExtractor={(loc) => loc.label}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              renderItem={({ item: loc, index: i }) => {
                const isActive = loc.label === current.label;
                return (
                  <Pressable
                    onPress={() => onSelect(loc)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isActive }}
                    accessibilityLabel={loc.label}
                    className={`flex-row items-center justify-between px-4 py-3.5 ${
                      i < filteredLocations.length - 1 ? 'border-b border-row-divider' : ''
                    }`}>
                    <View className="flex-row items-center gap-3">
                      <View
                        className={`h-8 w-8 items-center justify-center rounded-pill ${
                          isActive ? 'bg-brand-light' : 'bg-canvas'
                        }`}>
                        <MapPin size={14} color={isActive ? '#1A6B4A' : '#6B6B6B'} />
                      </View>
                      <Text
                        numberOfLines={1}
                        className={`font-medium text-body ${isActive ? 'text-brand' : 'text-ink'}`}>
                        {loc.label}
                      </Text>
                    </View>
                    {isActive && (
                      <View className="h-2 w-2 rounded-pill bg-brand" />
                    )}
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <View className="items-center py-6">
                  <Text className="font-sans text-body-sm text-ink2">
                    No locations found
                  </Text>
                </View>
              }
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};
