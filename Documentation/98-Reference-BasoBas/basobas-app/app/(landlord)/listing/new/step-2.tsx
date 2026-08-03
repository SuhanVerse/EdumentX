import { useState, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, MapPin, Navigation } from 'lucide-react-native';

import { tokens } from '@/src/theme/tokens';
import { useListingLocationStore } from '@/src/store/listingLocationStore';
import { parseDateLabel, parseMoney, parseOptionalInt } from '@/src/types/property.types';

const { color, space, radius, font, size } = tokens;

// ─── Chip data by type ───────────────────────────────────────────────────────

const FURNISHING = ['Furnished', 'Semi-furnished', 'Unfurnished'] as const;

const AMENITIES_APARTMENT = [
  'Parking', 'Water Tank', 'Backup Power', 'Internet ready',
  'Elevator', 'Balcony', 'Security',
] as const;

const AMENITIES_HOUSE = [
  'Parking', 'Water Tank', 'Backup Power', 'Internet ready',
  'Solar', 'Servant Room', 'Rooftop',
] as const;

const AMENITIES_ROOM = [
  'Wi-Fi', 'Laundry', 'Hot Water', 'Cleaning', 'Study Desk',
] as const;

const AMENITIES_STUDIO = [
  'Parking', 'Water Tank', 'Backup Power', 'Internet ready',
  'Murphy bed', 'Balcony',
] as const;

const BATHROOM_OPTIONS = ['Attached', 'Common'] as const;
const KITCHEN_OPTIONS = ['Private', 'Shared', 'Not included'] as const;
const TENANT_OPTIONS = ['Any', 'Male', 'Female', 'Family', 'Students'] as const;
const KITCHENETTE_OPTIONS = ['Open', 'Closed', 'None'] as const;

// ─── Toggle component ────────────────────────────────────────────────────────

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (      <Pressable
          onPress={onToggle}
          style={[styles.toggleTrack, enabled && styles.toggleTrackActive]}
          accessibilityRole="switch"
          accessibilityState={{ selected: enabled }}>
        <View style={styles.toggleThumb} />
      </Pressable>
  );
}

// ─── Chip selector ──────────────────────────────────────────────────────────

function ChipGroup<T extends string>({
  options,
  selected,
  onSelect,
}: {
  options: readonly T[];
  selected: T;
  onSelect: (v: T) => void;
}) {
  return (
    <View style={styles.chipRow}>
      {options.map((o) => {
        const active = o === selected;
        return (
          <Pressable
            key={o}
            onPress={() => onSelect(o)}
            style={[styles.chip, active && styles.chipActive]}>
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{o}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

interface FieldErrors {
  title?: string;
  rent?: string;
  deposit?: string;
  location?: string;
  availableFrom?: string;
  area?: string;
  floor?: string;
  totalFloors?: string;
}

export default function NewListingStep2() {
  const router = useRouter();
  const { propertyType } = useLocalSearchParams<{ propertyType: string }>();
  const pt = (propertyType ?? 'Apartment') as 'Apartment' | 'House' | 'Room' | 'Studio';

  // ── Common state ──────────────────────────────────────────────────────────
  const [title, setTitle] = useState('');
  const [rent, setRent] = useState('');
  const [deposit, setDeposit] = useState('');
  const [availableFrom, setAvailableFrom] = useState('');
  const [furnishing, setFurnishing] = useState<string>('Semi-furnished');
  const [errors, setErrors] = useState<FieldErrors>({});

  // Map-picker location — written by the picker screen via the store.
  const mapLocation = useListingLocationStore((s) => ({
    lat: s.lat,
    lng: s.lng,
    area: s.area,
    address: s.address,
  }));

  const hasMapPin = mapLocation.lat != null && mapLocation.lng != null;
  // Exact address is mandatory and always comes from the map (read-only input).
  const locationLabel = hasMapPin ? mapLocation.address || mapLocation.area : '';

  const clearError = useCallback((key: keyof FieldErrors) => {
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  }, []);

  const handlePickOnMap = useCallback(() => {
    router.push({
      pathname: '/(landlord)/location-picker',
      params: {
        lat: hasMapPin ? String(mapLocation.lat) : undefined,
        lng: hasMapPin ? String(mapLocation.lng) : undefined,
        area: mapLocation.area,
        address: mapLocation.address,
      },
    } as any);
  }, [router, hasMapPin, mapLocation.lat, mapLocation.lng, mapLocation.area, mapLocation.address]);

  // ── Apartment state ─────────────────────────────────────────────────────
  const [bedrooms, setBedrooms] = useState(2);
  const [bathrooms, setBathrooms] = useState(1);
  const [area, setArea] = useState('');
  const [floor, setFloor] = useState('');
  const [totalFloors, setTotalFloors] = useState('');
  const [amenities, setAmenities] = useState<string[]>([]);

  // ── House state ─────────────────────────────────────────────────────────
  const [houseBedrooms, setHouseBedrooms] = useState(3);
  const [houseBathrooms, setHouseBathrooms] = useState(2);
  const [builtUpArea, setBuiltUpArea] = useState('');
  const [houseFloors, setHouseFloors] = useState('');
  const [parkingSpaces, setParkingSpaces] = useState(1);
  const [hasGarden, setHasGarden] = useState(false);
  const [hasGated, setHasGated] = useState(false);
  const [houseAmenities, setHouseAmenities] = useState<string[]>([]);

  // ── Room state ──────────────────────────────────────────────────────────
  const [roomBathroom, setRoomBathroom] = useState<string>('Attached');
  const [kitchenAccess, setKitchenAccess] = useState<string>('Shared');
  const [tenantPref, setTenantPref] = useState<string>('Any');
  const [roomAmenities, setRoomAmenities] = useState<string[]>([]);

  // ── Studio state ────────────────────────────────────────────────────────
  const [studioArea, setStudioArea] = useState('');
  const [studioFloor, setStudioFloor] = useState('');
  const [kitchenette, setKitchenette] = useState<string>('Open');
  const [studioBathroom, setStudioBathroom] = useState<string>('Attached');
  const [studioAmenities, setStudioAmenities] = useState<string[]>([]);

  // ── Toggle helpers ───────────────────────────────────────────────────────
  const toggleAmenity = useCallback((a: string, list: string[], set: (v: string[]) => void) => {
    set(list.includes(a) ? list.filter((x) => x !== a) : [...list, a]);
  }, []);

  const handleGoBack = useCallback(() => router.back(), [router]);

  // ── Validate before moving to photos ────────────────────────────────────
  const validate = useCallback((): FieldErrors => {
    const e: FieldErrors = {};

    if (title.trim().length < 5) e.title = 'Add a clear title (at least 5 characters).';

    if (rent.trim() === '' || parseMoney(rent) <= 0) {
      e.rent = 'Enter a monthly rent greater than 0.';
    }
    if (deposit.replace(/[^0-9]/g, '') === '') {
      e.deposit = 'Enter a deposit amount (use 0 if there is none).';
    }

    if (!hasMapPin || locationLabel.trim() === '') {
      e.location = 'Pick the exact address on the map.';
    }

    const parsedDate = parseDateLabel(availableFrom);
    if (availableFrom.trim() === '' || parsedDate === null) {
      e.availableFrom = 'Enter a valid date, e.g. Aug 1, 2026.';
    }

    const requireNum = (v: string, key: keyof FieldErrors, msg: string, min: number) => {
      const n = parseOptionalInt(v);
      if (n === null || n < min) e[key] = msg;
    };

    if (pt === 'Apartment') {
      requireNum(area, 'area', 'Enter the area in sqft.', 1);
      requireNum(totalFloors, 'totalFloors', 'Enter the total number of floors.', 1);
    } else if (pt === 'House') {
      requireNum(builtUpArea, 'area', 'Enter the built-up area in sqft.', 1);
      requireNum(houseFloors, 'totalFloors', 'Enter the number of floors in the house.', 1);
    } else if (pt === 'Studio') {
      requireNum(studioArea, 'area', 'Enter the area in sqft.', 1);
    }

    return e;
  }, [
    title, rent, deposit, hasMapPin, locationLabel, availableFrom, pt,
    area, totalFloors, builtUpArea, houseFloors, studioArea,
  ]);

  // ── Build params for next step ──────────────────────────────────────────
  const handleContinue = useCallback(() => {
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.values(nextErrors).some((m) => m !== undefined)) return;

    const base = {
      propertyType: pt,
      title,
      rent,
      deposit,
      location: locationLabel,
      availableFrom,
      furnishing,
      mapLat: hasMapPin ? String(mapLocation.lat) : undefined,
      mapLng: hasMapPin ? String(mapLocation.lng) : undefined,
    };

    let extra: Record<string, string> = {};

    if (pt === 'Apartment') {
      extra = {
        bedrooms: bedrooms.toString(),
        bathrooms: bathrooms.toString(),
        area,
        floor,
        totalFloors,
        amenities: JSON.stringify(amenities),
      };
    } else if (pt === 'House') {
      extra = {
        bedrooms: houseBedrooms.toString(),
        bathrooms: houseBathrooms.toString(),
        builtUpArea,
        houseFloors,
        parkingSpaces: parkingSpaces.toString(),
        hasGarden: hasGarden.toString(),
        hasGated: hasGated.toString(),
        amenities: JSON.stringify(houseAmenities),
      };
    } else if (pt === 'Room') {
      extra = {
        roomBathroom,
        kitchenAccess,
        tenantPref,
        amenities: JSON.stringify(roomAmenities),
      };
    } else if (pt === 'Studio') {
      extra = {
        studioArea,
        studioFloor,
        kitchenette,
        studioBathroom,
        amenities: JSON.stringify(studioAmenities),
      };
    }

    router.push({
      pathname: '/(landlord)/listing/new/step-3',
      params: { ...base, ...extra },
    } as any);
  }, [
    router, pt, title, rent, deposit, locationLabel, availableFrom, furnishing,
    hasMapPin, mapLocation.lat, mapLocation.lng, validate,
    bedrooms, bathrooms, area, floor, totalFloors, amenities,
    houseBedrooms, houseBathrooms, builtUpArea, houseFloors, parkingSpaces, hasGarden, hasGated, houseAmenities,
    roomBathroom, kitchenAccess, tenantPref, roomAmenities,
    studioArea, studioFloor, kitchenette, studioBathroom, studioAmenities,
  ]);

  // ── Render type-specific fields ─────────────────────────────────────────

  const renderApartmentFields = () => (
    <>
      {/* Bedrooms + Bathrooms */}
      <View style={styles.row2}>
        <StepperField label="Bedrooms" value={bedrooms} onChange={setBedrooms} />
        <StepperField label="Bathrooms" value={bathrooms} onChange={setBathrooms} />
      </View>

      {/* Area + Floor + Total floors */}
      <Text style={styles.fieldLabel}>Area (sqft), Floor, Total floors</Text>
      <View style={styles.row3}>
        <TextInput style={[styles.input, { flex: 1 }, errors.area && styles.inputError]} value={area} onChangeText={(t) => { setArea(t); clearError('area'); }} keyboardType="numeric" placeholderTextColor={color.placeholder} />
        <TextInput style={[styles.input, { flex: 1 }, errors.floor && styles.inputError]} value={floor} onChangeText={(t) => { setFloor(t); clearError('floor'); }} keyboardType="numeric" placeholderTextColor={color.placeholder} />
        <TextInput style={[styles.input, { flex: 1 }, errors.totalFloors && styles.inputError]} value={totalFloors} onChangeText={(t) => { setTotalFloors(t); clearError('totalFloors'); }} keyboardType="numeric" placeholderTextColor={color.placeholder} />
      </View>
      {(errors.area || errors.floor || errors.totalFloors) && (
        <Text style={styles.errorText}>{errors.area ?? errors.floor ?? errors.totalFloors}</Text>
      )}

      {/* Amenities */}
      <Text style={styles.fieldLabel}>Amenities</Text>
      <View style={styles.chipRow}>
        {AMENITIES_APARTMENT.map((a) => {
          const active = amenities.includes(a);
          return (
            <Pressable key={a} onPress={() => toggleAmenity(a, amenities, setAmenities)}
              style={[styles.chip, active && styles.chipActive]}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{a}</Text>
            </Pressable>
          );
        })}
      </View>
    </>
  );

  const renderHouseFields = () => (
    <>
      {/* Bedrooms + Bathrooms + Parking spaces */}
      <View style={styles.row2}>
        <StepperField label="Bedrooms" value={houseBedrooms} onChange={setHouseBedrooms} />
        <StepperField label="Bathrooms" value={houseBathrooms} onChange={setHouseBathrooms} />
      </View>

      {/* Built-up area + Floors */}
      <View style={styles.row2}>
        <View style={styles.halfField}>
          <Text style={styles.fieldLabel}>Built-up area (sqft)</Text>
          <TextInput style={[styles.input, errors.area && styles.inputError]} value={builtUpArea} onChangeText={(t) => { setBuiltUpArea(t); clearError('area'); }} keyboardType="numeric" placeholderTextColor={color.placeholder} />
          {errors.area && <Text style={styles.errorText}>{errors.area}</Text>}
        </View>
        <View style={styles.halfField}>
          <Text style={styles.fieldLabel}>Floors in house</Text>
          <TextInput style={[styles.input, errors.totalFloors && styles.inputError]} value={houseFloors} onChangeText={(t) => { setHouseFloors(t); clearError('totalFloors'); }} keyboardType="numeric" placeholderTextColor={color.placeholder} />
          {errors.totalFloors && <Text style={styles.errorText}>{errors.totalFloors}</Text>}
        </View>
      </View>

      <StepperField label="Parking spaces" value={parkingSpaces} onChange={setParkingSpaces} />

      {/* Feature toggles */}
      <Text style={styles.fieldLabel}>Features</Text>
      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Private garden / yard</Text>
        <Toggle enabled={hasGarden} onToggle={() => setHasGarden((v) => !v)} />
      </View>
      <View style={[styles.toggleRow, { marginTop: 0 }]}>
        <Text style={styles.toggleLabel}>Gated compound</Text>
        <Toggle enabled={hasGated} onToggle={() => setHasGated((v) => !v)} />
      </View>

      {/* Amenities */}
      <Text style={styles.fieldLabel}>Amenities</Text>
      <View style={styles.chipRow}>
        {AMENITIES_HOUSE.map((a) => {
          const active = houseAmenities.includes(a);
          return (
            <Pressable key={a} onPress={() => toggleAmenity(a, houseAmenities, setHouseAmenities)}
              style={[styles.chip, active && styles.chipActive]}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{a}</Text>
            </Pressable>
          );
        })}
      </View>
    </>
  );

  const renderRoomFields = () => (
    <>
      <Text style={styles.fieldLabel}>Bathroom</Text>
      <ChipGroup options={BATHROOM_OPTIONS} selected={roomBathroom} onSelect={setRoomBathroom} />

      <Text style={styles.fieldLabel}>Kitchen access</Text>
      <ChipGroup options={KITCHEN_OPTIONS} selected={kitchenAccess} onSelect={setKitchenAccess} />

      <Text style={styles.fieldLabel}>Tenant preference</Text>
      <ChipGroup options={TENANT_OPTIONS} selected={tenantPref} onSelect={setTenantPref} />

      {/* Amenities */}
      <Text style={styles.fieldLabel}>Amenities</Text>
      <View style={styles.chipRow}>
        {AMENITIES_ROOM.map((a) => {
          const active = roomAmenities.includes(a);
          return (
            <Pressable key={a} onPress={() => toggleAmenity(a, roomAmenities, setRoomAmenities)}
              style={[styles.chip, active && styles.chipActive]}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{a}</Text>
            </Pressable>
          );
        })}
      </View>
    </>
  );

  const renderStudioFields = () => (
    <>
      {/* Area + Floor */}
      <View style={styles.row2}>
        <View style={styles.halfField}>
          <Text style={styles.fieldLabel}>Area (sqft)</Text>
          <TextInput style={[styles.input, errors.area && styles.inputError]} value={studioArea} onChangeText={(t) => { setStudioArea(t); clearError('area'); }} keyboardType="numeric" placeholderTextColor={color.placeholder} />
          {errors.area && <Text style={styles.errorText}>{errors.area}</Text>}
        </View>
        <View style={styles.halfField}>
          <Text style={styles.fieldLabel}>Floor</Text>
          <TextInput style={[styles.input, errors.floor && styles.inputError]} value={studioFloor} onChangeText={(t) => { setStudioFloor(t); clearError('floor'); }} keyboardType="numeric" placeholderTextColor={color.placeholder} />
          {errors.floor && <Text style={styles.errorText}>{errors.floor}</Text>}
        </View>
      </View>

      <Text style={styles.fieldLabel}>Kitchenette</Text>
      <ChipGroup options={KITCHENETTE_OPTIONS} selected={kitchenette} onSelect={setKitchenette} />

      <Text style={styles.fieldLabel}>Bathroom</Text>
      <ChipGroup options={BATHROOM_OPTIONS} selected={studioBathroom} onSelect={setStudioBathroom} />

      {/* Amenities */}
      <Text style={styles.fieldLabel}>Amenities</Text>
      <View style={styles.chipRow}>
        {AMENITIES_STUDIO.map((a) => {
          const active = studioAmenities.includes(a);
          return (
            <Pressable key={a} onPress={() => toggleAmenity(a, studioAmenities, setStudioAmenities)}
              style={[styles.chip, active && styles.chipActive]}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{a}</Text>
            </Pressable>
          );
        })}
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {/* ─── Header ──────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Pressable onPress={handleGoBack} style={styles.backButton} accessibilityLabel="Go back">
          <ArrowLeft size={18} color={color.ink} strokeWidth={2.2} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>New Listing</Text>
        </View>
      </View>

      {/* ─── Progress Bar ────────────────────────────────────────────── */}
      <View style={styles.progressSection}>
        <Text style={styles.stepLabel}>Step 2 of 4</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: '50%' }]} />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {/* ─── Headline ──────────────────────────────────────────────── */}
        <Text style={styles.headline}>About your {pt.toLowerCase()}</Text>
        <Text style={styles.subtext}>Fields tailored to a {pt.toLowerCase()}.</Text>

        {/* ─── Common fields ─────────────────────────────────────────── */}
        <Text style={styles.fieldLabel}>Listing title</Text>
        <TextInput
          style={[styles.input, errors.title && styles.inputError]}
          value={title}
          onChangeText={(t) => {
            setTitle(t);
            clearError('title');
          }}
          placeholder="e.g. 2BHK Apartment in Baluwatar"
          placeholderTextColor={color.placeholder}
        />
        {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}

        <View style={styles.row2}>
          <View style={styles.halfField}>
            <Text style={styles.fieldLabel}>Monthly rent (NPR)</Text>
            <TextInput
              style={[styles.input, errors.rent && styles.inputError]}
              value={rent}
              onChangeText={(t) => {
                setRent(t);
                clearError('rent');
              }}
              keyboardType="numeric"
              placeholder="e.g. 28,000"
              placeholderTextColor={color.placeholder}
            />
            {errors.rent && <Text style={styles.errorText}>{errors.rent}</Text>}
          </View>
          <View style={styles.halfField}>
            <Text style={styles.fieldLabel}>Deposit (NPR)</Text>
            <TextInput
              style={[styles.input, errors.deposit && styles.inputError]}
              value={deposit}
              onChangeText={(t) => {
                setDeposit(t);
                clearError('deposit');
              }}
              keyboardType="numeric"
              placeholder="e.g. 56,000"
              placeholderTextColor={color.placeholder}
            />
            {errors.deposit && <Text style={styles.errorText}>{errors.deposit}</Text>}
          </View>
        </View>

        <Text style={styles.fieldLabel}>Location</Text>
        <View style={styles.locationRow}>
          <TextInput
            style={[styles.input, styles.locationInput, styles.inputReadonly, errors.location && styles.inputError]}
            value={locationLabel}
            onChangeText={() => {}}
            editable={false}
            placeholder={hasMapPin ? 'Address is being fetched from the pin…' : 'Pick the exact address on the map'}
            placeholderTextColor={color.placeholder}
          />
          <Pressable
            onPress={handlePickOnMap}
            style={[styles.mapPickButton, hasMapPin && styles.mapPickButtonActive]}
            accessibilityLabel="Pick location on map"
            accessibilityRole="button">
            {hasMapPin ? (
              <Navigation size={18} color={color.bg} />
            ) : (
              <MapPin size={18} color={color.ink} />
            )}
            <Text style={[styles.mapPickText, hasMapPin && styles.mapPickTextActive]}>
              {hasMapPin ? 'Picked' : 'Map'}
            </Text>
          </Pressable>
        </View>
        {errors.location ? (
          <Text style={styles.errorText}>{errors.location}</Text>
        ) : hasMapPin ? (
          <Text style={styles.mapHint}>
            Pin at {mapLocation.lat?.toFixed(5)}, {mapLocation.lng?.toFixed(5)}. Tap Map to search, move, or refine the address.
          </Text>
        ) : (
          <Text style={styles.mapHint}>Tap Map, search for a place or move the map — the exact address is filled in automatically.</Text>
        )}

        <Text style={styles.fieldLabel}>Available from</Text>
        <TextInput
          style={[styles.input, errors.availableFrom && styles.inputError]}
          value={availableFrom}
          onChangeText={(t) => {
            setAvailableFrom(t);
            clearError('availableFrom');
          }}
          placeholder="e.g. Aug 1, 2026"
          placeholderTextColor={color.placeholder}
        />
        {errors.availableFrom && <Text style={styles.errorText}>{errors.availableFrom}</Text>}

        {/* ─── Type-specific fields ──────────────────────────────────── */}
        {pt === 'Apartment' && renderApartmentFields()}
        {pt === 'House' && renderHouseFields()}
        {pt === 'Room' && renderRoomFields()}
        {pt === 'Studio' && renderStudioFields()}

        {/* ─── Furnishing (common, after type fields) ──────────────────── */}
        <Text style={styles.fieldLabel}>Furnishing</Text>
        <ChipGroup options={FURNISHING} selected={furnishing} onSelect={setFurnishing} />
      </ScrollView>

      {/* ─── Sticky Bottom ────────────────────────────────────────────── */}
      <View style={styles.bottomArea}>
        <Pressable onPress={handleContinue} style={styles.cta} accessibilityLabel="Continue" accessibilityRole="button">
          <Text style={styles.ctaText}>Continue</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// ─── Stepper field sub-component ────────────────────────────────────────────

function StepperField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <View style={styles.halfField}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.stepper}>
        <Pressable onPress={() => onChange(Math.max(0, value - 1))} style={styles.stepperBtn}>
          <Text style={styles.stepperBtnText}>-</Text>
        </Pressable>
        <Text style={styles.stepperValue}>{value}</Text>
        <Pressable onPress={() => onChange(value + 1)} style={styles.stepperBtn}>
          <Text style={styles.stepperBtnText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.bg,
  },
  header: {
    height: space.headerH,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: color.line,
    paddingHorizontal: space.screenH,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: color.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingRight: 40,
  },
  headerTitle: {
    fontFamily: font.semibold,
    fontSize: 17,
    color: color.ink,
  },
  progressSection: {
    paddingHorizontal: space.screenH,
    paddingTop: 12,
    paddingBottom: 4,
  },
  stepLabel: {
    fontFamily: font.sans,
    fontSize: size.caption,
    color: color.ink3,
    marginBottom: 8,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: color.line,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: color.ink,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: space.screenH,
    paddingTop: 28,
    paddingBottom: 24,
  },
  headline: {
    fontFamily: font.display,
    fontSize: 28,
    color: color.ink,
    marginBottom: 6,
  },
  subtext: {
    fontFamily: font.sans,
    fontSize: size.bodySm,
    color: color.ink2,
    marginBottom: 24,
  },
  fieldLabel: {
    fontFamily: font.semibold,
    fontSize: size.bodySm,
    color: color.ink,
    marginBottom: 6,
    marginTop: 16,
  },
  input: {
    height: 52,
    borderRadius: radius.card,
    backgroundColor: color.input,
    paddingHorizontal: 14,
    fontFamily: font.sans,
    fontSize: size.body,
    color: color.ink,
  },
  inputReadonly: {
    color: color.ink2,
    opacity: 0.9,
  },
  inputError: {
    borderWidth: 1,
    borderColor: color.danger,
    backgroundColor: color.dangerBg,
  },
  errorText: {
    fontFamily: font.sans,
    fontSize: size.caption,
    color: color.danger,
    marginTop: 6,
  },
  locationRow: {
    flexDirection: 'row',
    gap: 8,
  },
  locationInput: {
    flex: 1,
  },
  mapPickButton: {
    height: 52,
    paddingHorizontal: 14,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: color.line,
    backgroundColor: color.bg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mapPickButtonActive: {
    backgroundColor: color.ink,
    borderColor: color.ink,
  },
  mapPickText: {
    fontFamily: font.semibold,
    fontSize: size.bodySm,
    color: color.ink,
  },
  mapPickTextActive: {
    color: color.bg,
  },
  mapHint: {
    fontFamily: font.sans,
    fontSize: size.caption,
    color: color.ink3,
    marginTop: 6,
  },
  row2: {
    flexDirection: 'row',
    gap: 10,
  },
  halfField: { flex: 1 },
  row3: { flexDirection: 'row', gap: 8 },
  stepper: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius.card,
    backgroundColor: color.input,
    paddingHorizontal: 6,
  },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: color.bg,
    borderWidth: 1,
    borderColor: color.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: {
    fontFamily: font.semibold,
    fontSize: 17,
    color: color.ink,
  },
  stepperValue: {
    fontFamily: font.bold,
    fontSize: size.h3,
    color: color.ink,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  chip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.line,
    backgroundColor: color.bg,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  chipActive: {
    backgroundColor: color.ink,
    borderColor: color.ink,
  },
  chipText: {
    fontFamily: font.sans,
    fontSize: size.bodySm,
    color: color.ink,
  },
  chipTextActive: {
    fontFamily: font.semibold,
    color: color.bg,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingVertical: 8,
  },
  toggleLabel: {
    fontFamily: font.sans,
    fontSize: size.body,
    color: color.ink,
  },
  toggleTrack: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: color.ink3,
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  toggleTrackActive: {
    backgroundColor: color.ink,
    justifyContent: 'flex-end',
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: color.bg,
  },
  bottomArea: {
    paddingHorizontal: space.screenH,
    paddingBottom: space.safeBottom + 8,
    paddingTop: 8,
  },
  cta: {
    height: space.buttonH,
    borderRadius: radius.pill,
    backgroundColor: color.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontFamily: font.semibold,
    fontSize: size.body,
    color: color.bg,
  },
});
