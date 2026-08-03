import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  ActivityIndicator,
  Animated,
  Keyboard,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useDebounce } from 'use-debounce';
import { ArrowLeft, Navigation, MapPin, Search, X, Pencil } from 'lucide-react-native';

import { AppMapView, type AppMapViewHandle } from '@/src/components/map/AppMap';
import { useClerkSupabase } from '@/src/hooks/useClerkSupabase';
import { useLocation } from '@/src/hooks/useLocation';
import { geocodePlace, reverseGeocodePlace, type GeocodeResult } from '@/src/services/map.service';
import { useListingLocationStore } from '@/src/store/listingLocationStore';
import { tokens } from '@/src/theme/tokens';

const { color, space, radius, font, size } = tokens;

const DEFAULT_LOCATION = {
  latitude: 27.7172,
  longitude: 85.324,
};

const PICKER_ZOOM = 16;
const CAMERA_GEOCODE_DELAY = 550;
const PIN_ICON_SIZE = 38;

export default function LandlordLocationPicker() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    lat?: string;
    lng?: string;
    area?: string;
    address?: string;
  }>();
  const insets = useSafeAreaInsets();
  const supabase = useClerkSupabase();
  const { getCurrentLocation, permissionDenied } = useLocation();
  const setLocationStore = useListingLocationStore((s) => s.setLocation);

  const initialCoords = useCallback(() => {
    const lat = parseFloat(params.lat ?? '');
    const lng = parseFloat(params.lng ?? '');
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
      return { latitude: lat, longitude: lng };
    }
    return DEFAULT_LOCATION;
  }, [params.lat, params.lng]);

  const [coords, setCoords] = useState(initialCoords);
  const [initialCamera] = useState(() => ({ ...initialCoords(), zoom: PICKER_ZOOM }));
  const [address, setAddress] = useState(params.address ?? '');
  const [area, setArea] = useState(params.area ?? '');
  const [placeId, setPlaceId] = useState<string | undefined>(undefined);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeFailed, setGeocodeFailed] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [debouncedQuery] = useDebounce(query.trim(), 400);

  const [locating, setLocating] = useState(false);

  const mapRef = useRef<AppMapViewHandle>(null);
  const editingRef = useRef(false);
  const skipCameraUntilRef = useRef(0);
  const pendingGeocodeRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const geocodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const geoSeqRef = useRef(0);
  const drop = useRef(new Animated.Value(0)).current;

  const dropPin = useCallback(() => {
    drop.stopAnimation();
    drop.setValue(1);
    Animated.spring(drop, { toValue: 0, friction: 5, tension: 150, useNativeDriver: true }).start();
  }, [drop]);

  const reverseGeocode = useCallback(
    async (c: { latitude: number; longitude: number }) => {
      const seq = ++geoSeqRef.current;
      setGeocoding(true);
      setGeocodeFailed(false);
      setGeocodeError(null);
      const res = await reverseGeocodePlace(c.latitude, c.longitude, supabase);
      if (seq !== geoSeqRef.current) return;
      setGeocoding(false);
      if (res.success && (res.data.address || res.data.area)) {
        if (!editingRef.current) {
          setAddress(res.data.address);
          setArea(res.data.area);
        }
        if (res.data.placeId) setPlaceId(res.data.placeId);
        setCoords(c);
        dropPin();
      } else if (res.success) {
        setGeocodeFailed(true);
        setGeocodeError('No address found for this spot — try a street or neighbourhood.');
      } else {
        setGeocodeFailed(true);
        setGeocodeError(res.error);
      }
    },
    [supabase, dropPin]
  );

  const moveCamera = useCallback((c: { latitude: number; longitude: number }, duration = 450) => {
    skipCameraUntilRef.current = Date.now() + duration + 250;
    mapRef.current?.setCameraPosition({
      latitude: c.latitude,
      longitude: c.longitude,
      zoom: PICKER_ZOOM,
      duration,
    });
  }, []);

  useEffect(() => {
    skipCameraUntilRef.current = Date.now() + 1200;
    if (!params.address && !params.area) reverseGeocode(initialCoords());
    return () => {
      if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current);
      geoSeqRef.current += 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCameraMove = useCallback(
    (e: { latitude: number; longitude: number }) => {
      if (Date.now() < skipCameraUntilRef.current) return;
      pendingGeocodeRef.current = { latitude: e.latitude, longitude: e.longitude };
      if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current);
      geocodeTimerRef.current = setTimeout(() => {
        const c = pendingGeocodeRef.current;
        pendingGeocodeRef.current = null;
        if (c) reverseGeocode(c);
      }, CAMERA_GEOCODE_DELAY);
    },
    [reverseGeocode]
  );

  const handleMapClick = useCallback(
    (c: { latitude: number; longitude: number }) => {
      setCoords(c);
      moveCamera(c, 350);
      reverseGeocode(c);
    },
    [moveCamera, reverseGeocode]
  );

  const handleLocateMe = useCallback(async () => {
    if (locating) return;
    setLocating(true);
    const loc = await getCurrentLocation();
    if (loc) {
      const c = { latitude: loc.latitude, longitude: loc.longitude };
      setCoords(c);
      moveCamera(c, 400);
      reverseGeocode(c);
    }
    setLocating(false);
  }, [locating, getCurrentLocation, moveCamera, reverseGeocode]);

  const handleQueryChange = useCallback((t: string) => {
    setQuery(t);
    setSearchError(false);
    if (t.trim().length < 2) setSuggestionsOpen(false);
  }, []);

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
      return;
    }
    let cancelled = false;
    setSearching(true);
    (async () => {
      const result = await geocodePlace(debouncedQuery, supabase);
      if (cancelled) return;
      if (result.success) {
        setSuggestions(result.data);
        setSearchError(false);
      } else {
        setSuggestions([]);
        setSearchError(true);
      }
      setSuggestionsOpen(true);
      setSearching(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, supabase]);

  const handleSelectSuggestion = useCallback(
    (s: GeocodeResult) => {
      Keyboard.dismiss();
      setQuery('');
      setSuggestions([]);
      setSuggestionsOpen(false);
      const c = { latitude: s.lat, longitude: s.lng };
      setCoords(c);
      setAddress(s.name);
      setArea(s.area);
      if (s.placeId) setPlaceId(s.placeId);
      moveCamera(c, 500);
      dropPin();
    },
    [moveCamera, dropPin]
  );

  const canConfirm = Boolean((address || area).trim());

  const handleConfirm = useCallback(() => {
    const finalAddress = (address || area).trim();
    if (!finalAddress) return;
    setLocationStore({
      lat: coords.latitude,
      lng: coords.longitude,
      area,
      address: finalAddress,
      placeId,
    });
    router.back();
  }, [coords, area, address, placeId, setLocationStore, router]);

  const dropTranslateY = drop.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });
  const dropScale = drop.interpolate({ inputRange: [0, 1], outputRange: [1, 0.9] });

  return (
    <View style={styles.screen}>
      <AppMapView
        ref={mapRef as any}
        style={styles.map}
        cameraPosition={initialCamera}
        isMyLocationEnabled={false}
        onMapClick={handleMapClick}
        onCameraMove={handleCameraMove}
      />

      {/* ── Center pin ─────────────────────────────────────────────── */}
      <View pointerEvents="none" style={styles.pinLayer}>
        <Animated.View
          style={[
            styles.pinWrap,
            { transform: [{ translateY: dropTranslateY }, { scale: dropScale }] },
          ]}>
          <MapPin size={PIN_ICON_SIZE} color={color.brand} fill={color.brand} strokeWidth={1.6} />
        </Animated.View>
        {geocoding && (
          <View style={styles.geoPill}>
            <ActivityIndicator size="small" color={color.brand} />
            <Text style={styles.geoPillText}>Locating address…</Text>
          </View>
        )}
      </View>

      {/* ── Top bar: back + search ─────────────────────────────────── */}
      <View style={[styles.topBar, { top: insets.top + 8 }]}>
        <View style={styles.topRow}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityLabel="Go back"
            accessibilityRole="button">
            <ArrowLeft size={20} color={color.ink} strokeWidth={2} />
          </Pressable>

          <View style={styles.searchWrap}>
            <View style={styles.searchPill}>
              <Search size={17} color={color.ink3} strokeWidth={2} />
              <TextInput
                style={styles.searchInput}
                value={query}
                onChangeText={handleQueryChange}
                placeholder="Search a place — e.g. Baluwatar"
                placeholderTextColor={color.placeholder}
                returnKeyType="search"
                autoCorrect={false}
                accessibilityLabel="Search a place"
              />
              {searching ? (
                <ActivityIndicator size="small" color={color.ink3} />
              ) : query.length > 0 ? (
                <Pressable
                  onPress={() => setQuery('')}
                  style={styles.clearBtn}
                  accessibilityLabel="Clear search">
                  <X size={16} color={color.ink3} strokeWidth={2} />
                </Pressable>
              ) : null}
            </View>

            {suggestionsOpen && debouncedQuery.length >= 2 && (
              <View style={styles.suggestions}>
                {searching ? (
                  <View style={styles.suggestionRow}>
                    <ActivityIndicator size="small" color={color.brand} />
                    <Text style={styles.suggestionStatus}>Searching…</Text>
                  </View>
                ) : searchError ? (
                  <View style={styles.suggestionRow}>
                    <Text style={styles.suggestionStatus}>Couldn&apos;t search. Try again.</Text>
                  </View>
                ) : suggestions.length === 0 ? (
                  <View style={styles.suggestionRow}>
                    <Text style={styles.suggestionStatus} numberOfLines={1}>
                      No places found for &ldquo;{debouncedQuery}&rdquo;.
                    </Text>
                  </View>
                ) : (
                  suggestions.map((s, i) => (
                    <Pressable
                      key={`${s.placeId ?? ''}-${s.lat}-${s.lng}-${i}`}
                      onPress={() => handleSelectSuggestion(s)}
                      style={[
                        styles.suggestionRow,
                        i < suggestions.length - 1 && styles.suggestionDivider,
                      ]}
                      accessibilityRole="button">
                      <MapPin size={15} color={color.brand} strokeWidth={2} />
                      <View style={styles.suggestionTextWrap}>
                        <Text numberOfLines={1} style={styles.suggestionTitle}>
                          {s.area || s.name}
                        </Text>
                        <Text numberOfLines={1} style={styles.suggestionSub}>
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

        {permissionDenied && (
          <View style={styles.permissionBanner}>
            <MapPin size={14} color={color.warn} />
            <Text style={styles.permissionText}>
              Location is off — enable it to use &ldquo;Locate me&rdquo;. Search still works.
            </Text>
          </View>
        )}
      </View>

      {/* ── Bottom card: address preview + confirm ─────────────────── */}
      <View style={[styles.card, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
        <View style={styles.grabber} />

        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Selected address</Text>
          <Pressable
            onPress={handleLocateMe}
            disabled={locating}
            style={styles.locateButton}
            accessibilityLabel="Locate my position"
            accessibilityRole="button">
            {locating ? (
              <ActivityIndicator size="small" color={color.ink} />
            ) : (
              <Navigation size={18} color={color.ink} />
            )}
          </Pressable>
        </View>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.addressInput}
            value={address}
            onChangeText={setAddress}
            onFocus={() => {
              editingRef.current = true;
            }}
            onBlur={() => {
              editingRef.current = false;
            }}
            placeholder={geocoding ? 'Locating address…' : 'Move the map or search for a place'}
            placeholderTextColor={color.placeholder}
            autoCorrect={false}
            accessibilityLabel="Selected address — editable"
          />
          {geocoding ? (
            <ActivityIndicator size="small" color={color.brand} style={styles.inputAdornment} />
          ) : (
            <Pencil size={15} color={color.ink3} style={styles.inputAdornment} />
          )}
        </View>

        <View style={styles.metaRow}>
          {area ? (
            <View style={styles.areaChip}>
              <MapPin size={12} color={color.brand} strokeWidth={2} />
              <Text style={styles.areaChipText}>{area}</Text>
            </View>
          ) : null}
          <Text style={styles.coordsText}>
            {coords.latitude.toFixed(6)}, {coords.longitude.toFixed(6)}
          </Text>
        </View>

        {geocodeFailed && (
          <Text style={styles.errorText}>
            {geocodeError ?? "Couldn't fetch the address for this spot — move the map or tap it again to retry."}
          </Text>
        )}

        <Text style={styles.hint}>
          Move the map or search for a place · Tap the map to drop the pin exactly · Edit the
          address to refine it.
        </Text>

        <Pressable
          onPress={handleConfirm}
          disabled={!canConfirm}
          style={[styles.confirmButton, !canConfirm && styles.confirmButtonDisabled]}
          accessibilityLabel="Confirm location"
          accessibilityRole="button">
          <Text style={styles.confirmText}>Confirm Location</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  map: { ...StyleSheet.absoluteFillObject },

  pinLayer: { ...StyleSheet.absoluteFillObject },
  pinWrap: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    marginLeft: -PIN_ICON_SIZE / 2,
    marginTop: -PIN_ICON_SIZE,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  geoPill: {
    position: 'absolute',
    bottom: '50%',
    marginBottom: 14,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: color.bg,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
    ...tokens.shadow.card,
  },
  geoPillText: { fontFamily: font.medium, fontSize: size.caption, color: color.ink2 },

  topBar: { position: 'absolute', left: 16, right: 16, gap: 10 },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: color.bg,
    alignItems: 'center',
    justifyContent: 'center',
    ...tokens.shadow.card,
  },
  searchWrap: { flex: 1 },
  searchPill: {
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: color.bg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    ...tokens.shadow.card,
  },
  searchInput: {
    flex: 1,
    fontFamily: font.sans,
    fontSize: size.body,
    color: color.ink,
    paddingVertical: 0,
  },
  clearBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  suggestions: {
    marginTop: 8,
    borderRadius: radius.card,
    backgroundColor: color.bg,
    overflow: 'hidden',
    ...tokens.shadow.card,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  suggestionDivider: { borderBottomWidth: 1, borderBottomColor: color.divider },
  suggestionTextWrap: { flex: 1 },
  suggestionTitle: { fontFamily: font.semibold, fontSize: size.bodySm, color: color.ink },
  suggestionSub: { fontFamily: font.sans, fontSize: size.caption, color: color.ink3, marginTop: 1 },
  suggestionStatus: { fontFamily: font.sans, fontSize: size.bodySm, color: color.ink3 },
  permissionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: color.warnBg,
    borderRadius: radius.card,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  permissionText: { flex: 1, fontFamily: font.sans, fontSize: size.caption, color: color.warn },

  card: {
    backgroundColor: color.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: space.screenH,
    paddingTop: 10,
    ...tokens.shadow.sheet,
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: color.line,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardTitle: { fontFamily: font.semibold, fontSize: size.bodySm, color: color.ink },
  locateButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: color.input,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: color.line,
  },
  inputRow: { position: 'relative' },
  addressInput: {
    height: 52,
    borderRadius: radius.card,
    backgroundColor: color.input,
    paddingHorizontal: 14,
    paddingRight: 42,
    fontFamily: font.sans,
    fontSize: size.body,
    color: color.ink,
  },
  inputAdornment: { position: 'absolute', right: 14, top: 18.5 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  areaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: color.brandLight,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  areaChipText: { fontFamily: font.medium, fontSize: size.caption, color: color.brand },
  coordsText: { fontFamily: font.sans, fontSize: size.caption, color: color.ink3 },
  errorText: {
    fontFamily: font.sans,
    fontSize: size.caption,
    color: color.danger,
    marginTop: 8,
  },
  hint: {
    fontFamily: font.sans,
    fontSize: size.caption,
    color: color.ink3,
    marginTop: 8,
  },
  confirmButton: {
    height: space.buttonH,
    borderRadius: radius.pill,
    backgroundColor: color.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  confirmButtonDisabled: { opacity: 0.45 },
  confirmText: { fontFamily: font.semibold, fontSize: size.body, color: color.bg },
});
