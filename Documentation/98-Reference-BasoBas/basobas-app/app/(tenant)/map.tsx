import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  FlatList,
  Image,
  Platform,
  ActivityIndicator,
  Keyboard,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Navigation, MapPin, Search, X } from 'lucide-react-native';
import Slider from '@react-native-community/slider';
import { useDebounce } from 'use-debounce';

import { AppMapView, type MapMarkerData, type MapCircleData, type AppMapViewHandle } from '@/src/components/map/AppMap';
import { useClerkSupabase } from '@/src/hooks/useClerkSupabase';
import { useLocation } from '@/src/hooks/useLocation';
import { getPropertiesNear, geocodePlace, type GeocodeResult } from '@/src/services/map.service';
import type { PropertyPin } from '@/src/types/map.types';
import { PROPERTY_STATUS_COLORS } from '@/src/types/map.types';
import { tokens } from '@/src/theme/tokens';

const { color, radius } = tokens;

/** Initial camera — the map is otherwise uncontrolled (moved imperatively). */
const INITIAL_CAMERA = {
  latitude: 27.7172,
  longitude: 85.324,
  zoom: 11,
};

const MIN_RADIUS_M = 500;
const MAX_RADIUS_M = 20000;
const DEFAULT_RADIUS_M = 3000;
const STEP_RADIUS_M = 500;

const fmtKm = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(m % 1000 === 0 ? 0 : 1)} km` : `${m} m`);
const fmtNpr = (n: number) => `NPR ${n.toLocaleString('en-US')}`;

interface MapCenter {
  lat: number;
  lng: number;
  label: string;
}

export default function TenantMapScreen() {
  const router = useRouter();
  const supabase = useClerkSupabase();
  const { getCurrentLocation, permissionDenied } = useLocation();

  const mapRef = useRef<AppMapViewHandle>(null);

  // ── Search state ───────────────────────────────────────────────────
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [debouncedQuery] = useDebounce(query.trim(), 500);

  // ── Radius state ───────────────────────────────────────────────────
  const [center, setCenter] = useState<MapCenter | null>(null);
  const [radiusM, setRadiusM] = useState(DEFAULT_RADIUS_M);
  const [properties, setProperties] = useState<PropertyPin[]>([]);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorRetry, setErrorRetry] = useState<(() => void) | null>(null);

  // Guards against stale responses when the user moves fast.
  const fetchSeq = useRef(0);

  const fetchNear = useCallback(
    async (lat: number, lng: number, radius: number) => {
      const seq = ++fetchSeq.current;
      setLoading(true);
      setError(null);
      const result = await getPropertiesNear(lat, lng, radius, supabase);
      if (seq !== fetchSeq.current) return;
      if (result.success) {
        setProperties(result.data);
      } else {
        setProperties([]);
        setError(result.error);
        setErrorRetry(() => () => fetchNear(lat, lng, radius));
      }
      setLoading(false);
    },
    [supabase],
  );

  const setRadiusForCenter = useCallback(
    (c: MapCenter, radius: number) => {
      setRadiusM(radius);
      fetchNear(c.lat, c.lng, radius);
      mapRef.current?.setCameraPosition({ latitude: c.lat, longitude: c.lng, zoom: 13, duration: 600 });
    },
    [fetchNear],
  );

  // ── Place search (debounced) ───────────────────────────────────────
  const searchSkippedFirst = useRef(true);
  useEffect(() => {
    if (searchSkippedFirst.current) {
      searchSkippedFirst.current = false;
      return;
    }
    if (debouncedQuery.length < 2) {
      setSuggestions([]);
      setSuggestionsOpen(false);
      setSearching(false);
      setSearchError(null);
      return;
    }
    let cancelled = false;
    setSearching(true);
    setSearchError(null);
    (async () => {
      const result = await geocodePlace(debouncedQuery, supabase);
      if (cancelled) return;
      if (result.success && result.data.length > 0) {
        setSuggestions(result.data);
        setSearchError(null);
        setSuggestionsOpen(true);
      } else {
        setSuggestions([]);
        setSearchError(result.success ? null : result.error);
        setSuggestionsOpen(true);
      }
      setSearching(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, supabase]);

  const handleSelectSuggestion = useCallback(
    (s: GeocodeResult) => {
      Keyboard.dismiss();
      setSuggestionsOpen(false);
      setQuery('');
      setSuggestions([]);
      const c = { lat: s.lat, lng: s.lng, label: s.area || s.name };
      setCenter(c);
      setRadiusForCenter(c, radiusM);
    },
    [radiusM, setRadiusForCenter],
  );

  // ── Locate me ──────────────────────────────────────────────────────
  const handleLocateMe = useCallback(async () => {
    if (locating) return;
    setLocating(true);
    const loc = await getCurrentLocation();
    if (loc) {
      const c = { lat: loc.latitude, lng: loc.longitude, label: 'My location' };
      setCenter(c);
      setRadiusForCenter(c, radiusM);
    }
    setLocating(false);
  }, [locating, getCurrentLocation, radiusM, setRadiusForCenter]);

  const handleRadiusChange = useCallback((value: number) => {
    setRadiusM(value);
  }, []);

  const handleRadiusComplete = useCallback(() => {
    if (center) fetchNear(center.lat, center.lng, radiusM);
  }, [center, radiusM, fetchNear]);

  // ── Map markers: ONLY real, rentable properties (OCCUPIED / paused are
  //    filtered out client-side as a safety net on top of the SQL filter).
  const availableProperties = useMemo(
    () => properties.filter((p) => p.status !== 'OCCUPIED' && !p.isPaused),
    [properties],
  );

  const markers = useMemo((): MapMarkerData[] => {
    const pins: MapMarkerData[] = availableProperties.map((p) => ({
      id: p.id,
      latitude: p.latitude,
      longitude: p.longitude,
      title: fmtNpr(p.price),
      color: PROPERTY_STATUS_COLORS[p.status] ?? '#1A6B4A',
      zIndex: 10,
    }));

    if (center) {
      pins.push({
        id: 'center',
        latitude: center.lat,
        longitude: center.lng,
        title: 'Search center',
        zIndex: 20,
      });
    }

    return pins;
  }, [availableProperties, center]);

  const handleMarkerPress = useCallback(
    (marker: MapMarkerData) => {
      if (marker.id === 'center') return;
      router.push({ pathname: '/(tenant)/property/[id]', params: { id: marker.id } } as any);
    },
    [router],
  );

  const circles = useMemo((): MapCircleData[] => {
    if (!center || Platform.OS !== 'android') return [];
    return [
      {
        id: 'radius',
        latitude: center.lat,
        longitude: center.lng,
        radius: radiusM,
        color: 'rgba(26,107,74,0.12)',
        lineColor: '#1A6B4A',
        lineWidth: 2,
      },
    ];
  }, [center, radiusM]);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      <View className="flex-1">
        <AppMapView
          ref={mapRef as any}
          style={{ flex: 1 }}
          cameraPosition={INITIAL_CAMERA}
          markers={markers}
          circles={circles}
          isMyLocationEnabled={false}
          onMarkerClick={handleMarkerPress}
        />
        {/* ─── Top bar: back + search ─────────────────────────────── */}
        <View
          pointerEvents="box-none"
          style={{ position: 'absolute', top: 12, left: 16, right: 16, gap: 10 }}>
          <View className="flex-row items-center gap-3">
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Back"
              className="h-[44px] w-[44px] items-center justify-center rounded-pill bg-bg"
              style={styles.shadow}>
              <ArrowLeft size={20} color={color.ink} strokeWidth={2} />
            </Pressable>

            <View className="flex-1">
              <View className="h-[48px] flex-row items-center rounded-pill bg-bg pl-4 pr-2" style={styles.shadow}>
                <Search size={17} color={color.ink3} strokeWidth={2} />
                <TextInput
                  className="ml-2 flex-1 font-sans text-body text-ink"
                  placeholder="Search a place — e.g. Baluwatar"
                  placeholderTextColor={color.placeholder}
                  value={query}
                  onChangeText={(t) => {
                    setQuery(t);
                    setSearchError(null);
                    if (t.trim().length < 2) setSuggestionsOpen(false);
                  }}
                  returnKeyType="search"
                  autoCorrect={false}
                  accessibilityLabel="Search a place"
                />
                {searching ? (
                  <ActivityIndicator size="small" color={color.ink3} />
                ) : query.length > 0 ? (
                  <Pressable onPress={() => setQuery('')} className="h-[32px] w-[32px] items-center justify-center" accessibilityLabel="Clear search">
                    <X size={16} color={color.ink3} strokeWidth={2} />
                  </Pressable>
                ) : null}
              </View>

              {/* ── Suggestions dropdown ────────────────────────────── */}
              {suggestionsOpen && (suggestions.length > 0 || searchError || !searching) && (
                <View className="mt-2 overflow-hidden rounded-card bg-bg" style={styles.shadow}>
                  {searchError ? (
                    <View className="flex-row items-center gap-2 px-4 py-3">
                      <Text numberOfLines={2} className="flex-1 font-sans text-caption text-danger">
                        {searchError}
                      </Text>
                    </View>
                  ) : suggestions.length === 0 && !searching ? (
                    <View className="px-4 py-3">
                      <Text numberOfLines={1} className="font-sans text-body-sm text-ink3">
                        No places found for &ldquo;{debouncedQuery}&rdquo;.
                      </Text>
                    </View>
                  ) : (
                    suggestions.map((s, i) => (
                      <Pressable
                        key={`${s.lat}-${s.lng}-${i}`}
                        onPress={() => handleSelectSuggestion(s)}
                        className="flex-row items-center gap-3 px-4 py-3"
                        style={i < suggestions.length - 1 ? styles.suggestionDivider : undefined}
                        accessibilityRole="button">
                        <MapPin size={15} color={color.brand} strokeWidth={2} />
                        <View className="flex-1">
                          <Text numberOfLines={1} className="font-sans text-body-sm text-ink">
                            {s.area || s.name}
                          </Text>
                          <Text numberOfLines={1} className="mt-0.5 font-sans text-caption text-ink3">
                            {s.name}
                          </Text>
                        </View>
                      </Pressable>
                    ))
                  )}
                </View>
              )}
            </View>
          </View>

          {/* ─── Radius control ────────────────────────────────────── */}
          {center && (
            <View className="rounded-card bg-bg px-4 pb-3 pt-3" style={styles.shadow}>
              <View className="mb-1 flex-row items-center justify-between">
                <Text numberOfLines={1} className="flex-1 font-semibold text-body-sm text-ink">
                  {center.label}
                </Text>
                <Text className="ml-3 font-bold text-body-sm text-brand">{fmtKm(radiusM)}</Text>
              </View>
              <Slider
                minimumValue={MIN_RADIUS_M}
                maximumValue={MAX_RADIUS_M}
                step={STEP_RADIUS_M}
                value={radiusM}
                onValueChange={handleRadiusChange}
                onSlidingComplete={handleRadiusComplete}
                minimumTrackTintColor={color.brand}
                maximumTrackTintColor={color.line}
                thumbTintColor={color.ink}
                accessibilityLabel="Search radius"
              />
              <View className="flex-row justify-between px-1">
                <Text className="font-sans text-caption text-ink3">500 m</Text>
                <Text className="font-sans text-caption text-ink3">20 km</Text>
              </View>
            </View>
          )}
        </View>

        {permissionDenied && (
          <View pointerEvents="none" style={{ position: 'absolute', top: 130, left: 16, right: 16 }}>
            <View className="flex-row items-center gap-2 rounded-card bg-warn-bg px-4 py-2.5">
              <MapPin size={14} color={color.warn} />
              <Text className="font-sans text-caption text-warn">
                Search manually — Enable Location
              </Text>
            </View>
          </View>
        )}

        {error && (
          <View pointerEvents="box-none" style={{ position: 'absolute', top: 130, left: 16, right: 16 }}>
            <Pressable
              onPress={errorRetry ?? undefined}
              className="flex-row items-center gap-2 rounded-card bg-danger-bg px-4 py-2.5">
              <Text className="flex-1 font-sans text-caption text-danger">
                Unable to load properties — Retry
              </Text>
            </Pressable>
          </View>
        )}

        {/* ─── Locate me FAB ───────────────────────────────────────── */}
        <Pressable
          onPress={handleLocateMe}
          disabled={locating}
          accessibilityRole="button"
          accessibilityLabel="Locate my position"
          style={[styles.fab, { bottom: center ? 260 : 140 }]}>
          {locating ? (
            <ActivityIndicator size="small" color={color.ink} />
          ) : (
            <Navigation size={20} color={color.ink} />
          )}
        </Pressable>

        {/* ─── Bottom: property list ───────────────────────────────── */}
        {center ? (
          <View style={[styles.listPanel, styles.shadow]}>
            <View className="flex-row items-center justify-between border-b border-line px-4 py-3">
              <Text className="font-semibold text-body text-ink">
                {loading ? 'Loading…' : `${availableProperties.length} ${availableProperties.length === 1 ? 'property' : 'properties'}`}
              </Text>
              <Text className="font-sans text-caption text-ink2">within {fmtKm(radiusM)}</Text>
            </View>

            {loading && availableProperties.length === 0 ? (
              <View className="items-center justify-center py-10">
                <ActivityIndicator size="small" color={color.brand} />
              </View>
            ) : availableProperties.length === 0 ? (
              <View className="items-center justify-center gap-2 px-8 py-10">
                <MapPin size={20} color={color.ink3} strokeWidth={1.5} />
                <Text className="text-center font-sans text-body-sm text-ink2">
                  No rentals within {fmtKm(radiusM)} of {center.label}. Try a larger radius.
                </Text>
              </View>
            ) : (
              <FlatList
                data={availableProperties}
                keyExtractor={(p) => p.id}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingVertical: 4 }}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() =>
                      router.push({ pathname: '/(tenant)/property/[id]', params: { id: item.id } } as any)
                    }
                    className="flex-row items-center gap-3 px-4 py-2.5"
                    style={styles.listItem}
                    accessibilityRole="button">
                    {item.photoUrl ? (
                      <Image source={{ uri: item.photoUrl }} style={styles.thumb} />
                    ) : (
                      <View style={[styles.thumb, styles.thumbPlaceholder]}>
                        <Text className="font-sans text-caption text-ink3">Photo</Text>
                      </View>
                    )}
                    <View className="flex-1">
                      <Text numberOfLines={1} className="font-semibold text-body-sm text-ink">
                        {item.title}
                      </Text>
                      <Text numberOfLines={1} className="mt-0.5 font-sans text-caption text-ink2">
                        {item.locationArea}
                      </Text>
                      <Text className="mt-0.5 font-bold text-body-sm text-brand">
                        {fmtNpr(item.price)}/month
                      </Text>
                    </View>
                  </Pressable>
                )}
              />
            )}
          </View>
        ) : (
          <View pointerEvents="none" style={[styles.listPanel, styles.shadow]}>
            <View className="items-center justify-center gap-2 px-8 py-8">
              <Search size={22} color={color.ink3} strokeWidth={1.5} />
              <Text className="text-center font-sans text-body-sm text-ink2">
                Search a place or tap the locate button to see rentals within a radius.
              </Text>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  suggestionDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.divider,
  },
  fab: {
    position: 'absolute',
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
  },
  listPanel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '42%',
    backgroundColor: color.bg,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    overflow: 'hidden',
  },
  listItem: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.divider,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: color.canvas,
  },
  thumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
