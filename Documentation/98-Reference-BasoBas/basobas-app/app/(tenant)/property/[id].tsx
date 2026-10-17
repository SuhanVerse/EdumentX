import { useState, useCallback, useEffect, useRef } from 'react';
import { ScrollView, View, Text, Pressable, Dimensions, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import {
  MapPin,
  Heart,
  Bed,
  BedDouble,
  Bath,
  Wifi,
  Car,
  ChevronRight,
  Building2,
  TreePine,
  Shield,
  CookingPot,
  Users,
  Info,
  Check,
  Droplets,
  Zap,
  Globe,
  ArrowUpDown,
  Sun,
  WashingMachine,
  Flame,
  Thermometer,
  Wind,
  Tv,
  Dumbbell,
  Sparkles,
  LampDesk,
} from 'lucide-react-native';
import { useUser } from '@clerk/expo';

import { PropertyHero } from '@/src/components/property/PropertyHero';
import { Avatar } from '@/src/components/user/Avatar';
import { ScheduleVisitDrawer } from '@/src/components/property/ScheduleVisitDrawer';
import { useClerkSupabase } from '@/src/hooks/useClerkSupabase';
import {
  getPropertyPublic,
  getPublishedPropertiesByLandlord,
  getLandlordOwnerProfile,
  getLandlordVerificationStatus,
} from '@/src/services/properties.service';
import { createVisitRequest, getTenantVisitForProperty } from '@/src/services/visits.service';
import { usePropertyStore } from '@/src/store/propertyStore';
import {
  toTimeSlot,
  type PropertyPublic,
  type TenantVisitRequest,
  type TenantVisitStatusUi,
} from '@/src/types/property.types';
import { tokens } from '@/src/theme/tokens';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const HERO_HEIGHT = SCREEN_HEIGHT * 0.42;

// ─── Amenity / Extra-Detail helpers ─────────────────────────────────────────

/**
 * Amenity strings are free text from the listing wizard (step-2), so the map
 * is keyed on a normalized form (lowercase, collapsed whitespace) of every
 * value the wizard can save — plus legacy short keys. Anything unknown falls
 * back to its raw label with no icon rather than disappearing.
 */
const AMENITY_ICONS: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  bed: Bed,
  bath: Bath,
  wifi: Wifi,
  'wi-fi': Wifi,
  internet: Globe,
  'internet ready': Globe,
  car: Car,
  parking: Car,
  kitchen: CookingPot,
  ac: Wind,
  heater: Thermometer,
  tv: Tv,
  laundry: WashingMachine,
  gym: Dumbbell,
  security: Shield,
  garden: TreePine,
  lift: ArrowUpDown,
  elevator: ArrowUpDown,
  power: Zap,
  'power backup': Zap,
  'backup power': Zap,
  water: Droplets,
  'water supply': Droplets,
  'water tank': Droplets,
  solar: Sun,
  balcony: Sun,
  rooftop: Building2,
  'hot water': Flame,
  cleaning: Sparkles,
  'study desk': LampDesk,
  'murphy bed': BedDouble,
  'servant room': BedDouble,
};

/** Normalize an amenity string into a stable lookup/render key. */
const normalizeAmenityKey = (raw: string): string =>
  raw.trim().toLowerCase().replace(/\s+/g, ' ');

const AMENITY_LABELS: Record<string, string> = {
  bed: 'Bed',
  bath: 'Bath',
  wifi: 'Wi-Fi',
  'wi-fi': 'Wi-Fi',
  internet: 'Internet',
  'internet ready': 'Internet Ready',
  car: 'Parking',
  parking: 'Parking',
  kitchen: 'Kitchen',
  ac: 'AC',
  heater: 'Heater',
  tv: 'TV',
  laundry: 'Laundry',
  gym: 'Gym',
  security: 'Security',
  garden: 'Garden',
  lift: 'Lift',
  elevator: 'Elevator',
  power: 'Power Backup',
  'power backup': 'Power Backup',
  'backup power': 'Backup Power',
  water: 'Water Supply',
  'water supply': 'Water Supply',
  'water tank': 'Water Tank',
  solar: 'Solar',
  balcony: 'Balcony',
  rooftop: 'Rooftop',
  'hot water': 'Hot Water',
  cleaning: 'Cleaning',
  'study desk': 'Study Desk',
  'murphy bed': 'Murphy Bed',
  'servant room': 'Servant Room',
};

const EXTRA_DETAIL_ICONS: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  parkingSpaces: Car,
  houseFloors: Building2,
  hasGarden: TreePine,
  hasGated: Shield,
  roomBathroom: Bath,
  kitchenAccess: CookingPot,
  tenantPref: Users,
  kitchenette: CookingPot,
  studioBathroom: Bath,
};

const EXTRA_DETAIL_LABELS: Record<string, string> = {
  parkingSpaces: 'Parking Spaces',
  houseFloors: 'Floors',
  hasGarden: 'Garden',
  hasGated: 'Gated Community',
  roomBathroom: 'Bathroom Type',
  kitchenAccess: 'Kitchen Access',
  tenantPref: 'Tenant Preference',
  kitchenette: 'Kitchenette',
  studioBathroom: 'Bathroom Type',
};

interface AmenityRow {
  key: string;
  label: string;
  icon: React.ComponentType<{ size?: number; color?: string }> | null;
}

function toAmenityRows(
  rawAmenities: string[],
  bedrooms: number | null,
  bathrooms: number | null
): AmenityRow[] {
  const rows: AmenityRow[] = [];
  if (bedrooms != null) rows.push({ key: 'bed', label: `${bedrooms} Bed`, icon: Bed });
  if (bathrooms != null) rows.push({ key: 'bath', label: `${bathrooms} Bath`, icon: Bath });
  const seen = new Set(rows.map((r) => r.key));
  for (const raw of rawAmenities) {
    if (typeof raw !== 'string' || raw.trim() === '') continue;
    const key = normalizeAmenityKey(raw);
    // Skip duplicates and bedroom/bathroom counts already shown from columns.
    if (
      seen.has(key) ||
      key === 'bed' ||
      key === 'bath' ||
      key === 'bedroom' ||
      key === 'bedrooms' ||
      key === 'bathroom' ||
      key === 'bathrooms'
    ) {
      continue;
    }
    seen.add(key);
    rows.push({ key, label: AMENITY_LABELS[key] ?? raw.trim(), icon: AMENITY_ICONS[key] ?? null });
  }
  return rows;
}

interface ExtraDetailRow {
  key: string;
  label: string;
  value: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
}

function camelToTitle(s: string): string {
  return s
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

function formatExtraValue(value: unknown): string {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value == null) return '';
  return String(value);
}

function toExtraDetailRows(extraDetails: Record<string, unknown> | null): ExtraDetailRow[] {
  if (!extraDetails) return [];
  return Object.entries(extraDetails)
    .filter(([k]) => k !== 'originalType')
    .map(([k, v]) => ({
      key: k,
      label: EXTRA_DETAIL_LABELS[k] ?? camelToTitle(k),
      value: formatExtraValue(v),
      icon: EXTRA_DETAIL_ICONS[k] ?? Info,
    }))
    .filter((r) => r.value !== '');
}

const fmtNpr = (n: number) => `NPR ${n.toLocaleString('en-US')}`;

/** CTA label while the tenant already has an open request for this property. */
const VISIT_REQUEST_BUTTON_LABEL: Record<TenantVisitStatusUi, string> = {
  pending: 'Visit Requested',
  accepted: 'Visit Scheduled',
  rescheduled: 'New Time Proposed',
  discussion: 'Visit Under Discussion',
  completed: 'Visit Completed',
  rejected: 'Visit Declined',
  cancelled: 'Visit Cancelled',
  finalized: 'Rental Finalized',
};

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function PropertyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const supabase = useClerkSupabase();
  const { user: clerkUser } = useUser();

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showScheduleDrawer, setShowScheduleDrawer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [property, setProperty] = useState<PropertyPublic | null>(null);
  const [ownerName, setOwnerName] = useState<string | null>(null);
  const [ownerAvatarUrl, setOwnerAvatarUrl] = useState<string | null>(null);
  const [ownerVerified, setOwnerVerified] = useState(false);
  const [ownerListingsCount, setOwnerListingsCount] = useState(0);

  /** The tenant's open visit request for this property, if any. */
  const [existingVisit, setExistingVisit] = useState<TenantVisitRequest | null>(null);

  const savedPropertyIds = usePropertyStore((s) => s.savedPropertyIds);
  const toggleSaved = usePropertyStore((s) => s.toggleSaved);
  const saved = property != null && savedPropertyIds.includes(property.id);

  /** One view per property per mount — guards StrictMode double-effects. */
  const viewRecordedRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);

    const result = await getPropertyPublic(id, supabase);
    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }
    if (!result.data) {
      setError('This property is no longer available.');
      setLoading(false);
      return;
    }

    // Fire-and-forget view count — the landlord dashboard reads it.
    if (viewRecordedRef.current !== id) {
      viewRecordedRef.current = id;
      supabase
        .rpc('record_property_view', { p_property_id: id })
        .then(null, () => {});
    }

    const p = result.data;
    setProperty(p);

    const [ownerRes, listingsRes, verifyRes] = await Promise.all([
      getLandlordOwnerProfile(p.landlordId, supabase),
      getPublishedPropertiesByLandlord(p.landlordId, supabase),
      getLandlordVerificationStatus(p.landlordId, supabase),
    ]);

    if (ownerRes.success) {
      setOwnerName(ownerRes.data.name);
      setOwnerAvatarUrl(ownerRes.data.avatarUrl);
    }
    if (listingsRes.success) setOwnerListingsCount(listingsRes.data.length);
    if (verifyRes.success) setOwnerVerified(verifyRes.data === 'VERIFIED');

    setLoading(false);
  }, [id, supabase]);

  useEffect(() => {
    load();
  }, [load]);

  // Duplicate-request guard: whenever this screen regains focus, check whether
  // the tenant already has an open (non-terminal, date-not-passed) request for
  // the property. If so, the CTA routes back to it instead of re-scheduling.
  useFocusEffect(
    useCallback(() => {
      if (!property || !clerkUser?.id) return;
      let cancelled = false;
      (async () => {
        const result = await getTenantVisitForProperty(property.id, clerkUser.id, supabase);
        if (cancelled || !result.success) return;
        // A request whose date has passed reads as `completed` — the visit
        // happened, so allow booking a fresh one.
        const active = result.data && result.data.statusUi !== 'completed' ? result.data : null;
        setExistingVisit(active);
      })();
      return () => {
        cancelled = true;
      };
    }, [property, clerkUser?.id, supabase])
  );

  const handleViewLandlord = useCallback(() => {
    if (!property) return;
    router.push({
      pathname: '/(tenant)/landlord/[id]',
      params: { id: property.landlordId },
    } as any);
  }, [router, property]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleShare = useCallback(async () => {
    if (!property) return;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: property.title,
          text: `${property.title} — ${fmtNpr(property.price)}/mo`,
          url: typeof window !== 'undefined' ? window.location.href : undefined,
        });
      } catch {
        // user cancelled or API not available
      }
    } else {
      // TODO: wire up copy-link toast/snackbar when the app has one
      console.log('Share:', property.title);
    }
  }, [property]);

  const handleToggleSave = useCallback(() => {
    if (property && clerkUser?.id) toggleSaved(property.id, supabase, clerkUser.id);
  }, [property, clerkUser?.id, supabase, toggleSaved]);

  const handleScheduleVisit = useCallback(() => {
    if (existingVisit) {
      // Already have an open request — go track it, never open the sheet.
      router.push({
        pathname: '/(tenant)/visit/[id]',
        params: { id: existingVisit.id },
      } as any);
      return;
    }
    setShowScheduleDrawer(true);
  }, [existingVisit, router]);

  const handleScheduleClose = useCallback(() => {
    setShowScheduleDrawer(false);
  }, []);

  const handleScheduleConfirm = useCallback(
    async (selection: { date: Date; time: string; note?: string }) => {
      if (!property || !clerkUser?.id) throw new Error('Missing property or user');

      const result = await createVisitRequest(
        {
          propertyId: property.id,
          tenantId: clerkUser.id,
          landlordId: property.landlordId,
          date: selection.date.toISOString().slice(0, 10),
          timeSlot: toTimeSlot(selection.time),
          note: selection.note,
        },
        supabase
      );

      if (!result.success) throw new Error(result.error);

      // Flip the CTA to "Visit Requested" immediately — re-fetch the open
      // request so the button reflects it without waiting for next focus.
      const open = await getTenantVisitForProperty(property.id, clerkUser.id, supabase);
      if (open.success && open.data) setExistingVisit(open.data);

      // Take the tenant to their request so they can track it.
      setTimeout(() => {
        router.push({ pathname: '/(tenant)/visit/[id]', params: { id: result.data.id } } as any);
      }, 1200);
    },
    [property, clerkUser?.id, supabase, router]
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator size="small" color={tokens.color.brand} />
      </View>
    );
  }

  if (error || !property) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-bg px-8">
        <Text className="text-center font-semibold text-h3 text-ink">
          {error ?? 'Property not found'}
        </Text>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          className="h-[48px] items-center justify-center rounded-pill bg-ink px-8">
          <Text className="font-semibold text-body text-white">Go back</Text>
        </Pressable>
      </View>
    );
  }

  const ownerInitials = (ownerName ?? '?')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const amenityRows = toAmenityRows(property.amenities, property.bedrooms, property.bathrooms);
  const extraDetailRows = toExtraDetailRows(property.extraDetails);

  return (
    <View className="flex-1 bg-bg">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingBottom: 100 + insets.bottom,
        }}
        showsVerticalScrollIndicator={false}>
        {/* ═══ Hero Image Area ═══ */}
        <PropertyHero
          height={HERO_HEIGHT}
          images={property.photoUrls}
          onBack={handleBack}
          onShare={handleShare}
          onSave={handleToggleSave}
          saved={saved}
          currentIndex={currentImageIndex}
          onIndexChange={setCurrentImageIndex}
        />

        {/* ═══ Content ═══ */}
        <View className="px-6 pt-4">
          {/* Title — serif */}
          <Text className="font-display text-h1 leading-tight text-ink">{property.title}</Text>

          {/* Location row */}
          <View className="mt-2 flex-row items-center">
            <MapPin size={14} color="#6B6B6B" />
            <Text className="ml-1 font-sans text-body-sm text-ink2">{property.locationArea}</Text>
          </View>

          {/* Price row */}
          <Text className="mt-3 font-bold text-h2 text-brand">
            {fmtNpr(property.price)}
            <Text className="font-sans text-body text-ink2"> / month</Text>
          </Text>

          {/* ═══ Amenities Card ═══ */}
          {amenityRows.length > 0 && (
            <View className="mt-5 rounded-card bg-canvas px-4 py-4">
              <Text className="mb-3 font-semibold text-body text-ink">Amenities</Text>
              <View className="flex-row flex-wrap gap-2">
                {amenityRows.map((amenity, i) => {
                  const IconComponent = amenity.icon;
                  return (
                    <View
                      key={`${amenity.key}-${i}`}
                      className="min-h-[32px] flex-row items-center rounded-pill bg-bg px-3 py-1.5">
                      {IconComponent && <IconComponent size={15} color="#1A6B4A" />}
                      <Text
                        className={`font-sans text-caption text-ink ${
                          IconComponent ? 'ml-1.5' : ''
                        }`}>
                        {amenity.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* ═══ Extra Details Card (property-type-specific fields) ═══ */}
          {extraDetailRows.length > 0 && (
            <View className="mt-5 rounded-card bg-canvas px-4 py-4">
              <Text className="mb-3 font-semibold text-body text-ink">Property Details</Text>
              <View className="gap-y-3">
                {extraDetailRows.map((detail) => {
                  const Icon = detail.icon;
                  return (
                    <View key={detail.key} className="flex-row items-center">
                      <View className="h-9 w-9 items-center justify-center rounded-lg bg-bg">
                        <Icon size={18} color="#1A6B4A" />
                      </View>
                      <View className="ml-3 flex-1 flex-row items-center justify-between">
                        <Text className="font-sans text-body-sm text-ink2">{detail.label}</Text>
                        <Text className="font-medium text-body-sm text-ink">{detail.value}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* ═══ About Section ═══ */}
          {property.description?.trim() ? (
            <>
              <Text className="mt-6 font-semibold text-h3 text-ink">About</Text>
              <Text className="mt-2 font-sans text-body leading-relaxed text-ink2">
                {property.description}
              </Text>
            </>
          ) : null}

          {/* ═══ Owner Card ═══ */}
          <Pressable
            onPress={handleViewLandlord}
            className="mt-5 flex-row items-center rounded-card bg-canvas p-4"
            accessibilityLabel={`View ${ownerName ?? 'landlord'}'s profile`}
            accessibilityRole="button">
            <Avatar size={48} initials={ownerInitials} uri={ownerAvatarUrl ?? undefined} />
            <View className="ml-3 flex-1">
              <Text className="font-semibold text-body text-ink">{ownerName ?? 'Landlord'}</Text>
              <Text className="mt-0.5 font-sans text-body-sm text-ink2">
                {ownerVerified ? 'Verified owner' : 'Owner'} · {ownerListingsCount} listings
              </Text>
            </View>
            <ChevronRight size={18} color="#AAAAAA" strokeWidth={1.8} />
          </Pressable>
        </View>
      </ScrollView>

      {/* ═══ Sticky Bottom Action Bar ═══ */}
      <View
        className="flex-row items-center border-t border-line bg-bg px-6 pb-2 pt-4"
        style={{ paddingBottom: Math.max(insets.bottom + 8, 12) }}>
        {/* Heart / Save toggle */}
        <Pressable
          onPress={handleToggleSave}
          className="mr-3 h-[48px] w-[48px] items-center justify-center rounded-pill border border-line"
          accessibilityRole="button"
          accessibilityLabel={saved ? 'Remove from saved' : 'Save property'}>
          <Heart
            size={20}
            color={saved ? '#E53E3E' : '#0A0A0A'}
            fill={saved ? '#E53E3E' : 'transparent'}
          />
        </Pressable>

        {/* Schedule a Visit — or view the existing open request */}
        <Pressable
          onPress={handleScheduleVisit}
          className="h-[48px] flex-1 items-center justify-center rounded-pill bg-ink"
          accessibilityRole="button"
          accessibilityLabel={existingVisit ? 'View your visit request' : 'Schedule a Visit'}>
          {existingVisit ? (
            <View className="flex-row items-center">
              <Check size={18} color="#FFFFFF" strokeWidth={2.5} />
              <Text className="ml-2 font-semibold text-body text-white">
                {VISIT_REQUEST_BUTTON_LABEL[existingVisit.statusUi]}
              </Text>
            </View>
          ) : (
            <Text className="font-semibold text-body text-white">Schedule a Visit</Text>
          )}
        </Pressable>
      </View>

      {/* ═══ Schedule Visit Drawer ═══ */}
      {showScheduleDrawer && (
        <ScheduleVisitDrawer
          propertyTitle={property.title}
          propertyLocation={property.locationArea.split(',')[0]}
          isOpen
          onClose={handleScheduleClose}
          onConfirm={handleScheduleConfirm}
        />
      )}
    </View>
  );
}
