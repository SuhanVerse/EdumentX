import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  ScrollView,
  View,
  Text,
  Pressable,
  Dimensions,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useUser } from '@clerk/expo';
import {
  MapPin,
  Star,
  Bed,
  Bath,
  Wifi,
  Car,
  Eye,
  Heart,
  Pause,
  Play,
  Users,
  CheckCircle,
  Building2,
  TreePine,
  Shield,
  CookingPot,
  Info,
} from 'lucide-react-native';

import { PropertyHero } from '@/src/components/property/PropertyHero';
import { Avatar } from '@/src/components/user/Avatar';
import { useClerkSupabase } from '@/src/hooks/useClerkSupabase';
import {
  getPropertyPublic,
  getPropertyStats,
  getLandlordOwnerProfile,
  setListingPaused,
  type LandlordOwnerProfile,
} from '@/src/services/properties.service';
import {
  PROPERTY_TYPE_LABELS,
  formatMonthlyPrice,
  type PropertyPublic,
  type PropertyStatus,
} from '@/src/types/property.types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const HERO_HEIGHT = SCREEN_HEIGHT * 0.42;

const FORMATTER = new Intl.NumberFormat('en-IN');

// ─── Icon map (DB amenity strings → Lucide components) ───────────────────────

const AMENITY_ICONS: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  bed: Bed,
  bath: Bath,
  wifi: Wifi,
  car: Car,
};

/**
 * Translate the DB's free-text amenity array into iconified rows. The DB
 * doesn't constrain amenity strings, so anything we don't recognise falls
 * back to a text-only chip rather than crashing.
 */
const AMENITY_LABELS: Record<string, string> = {
  bed:    'Bed',
  bath:   'Bath',
  wifi:   'Wi-Fi',
  car:    'Parking',
  kitchen:'Kitchen',
  ac:     'AC',
  heater: 'Heater',
  tv:     'TV',
  laundry:'Laundry',
  gym:    'Gym',
  security:'Security',
  garden: 'Garden',
  lift:   'Lift',
  power:  'Power Backup',
  water:  'Water Supply',
};

interface AmenityRow {
  key: string;
  label: string;
  icon: React.ComponentType<{ size?: number; color?: string }> | null;
}

function toAmenityRows(rawAmenities: string[], bedrooms: number | null, bathrooms: number | null): AmenityRow[] {
  const rows: AmenityRow[] = [];
  // Surface bedroom/bathroom from dedicated columns when present — they're
  // the most common "amenities" but live in their own columns, not the
  // amenities jsonb array.
  if (bedrooms != null) {
    rows.push({ key: 'bed', label: `${bedrooms} Bed`, icon: Bed });
  }
  if (bathrooms != null) {
    rows.push({ key: 'bath', label: `${bathrooms} Bath`, icon: Bath });
  }
  for (const raw of rawAmenities) {
    const key = raw.toLowerCase();
    if (key === 'bed' || key === 'bath' || key === 'bedroom' || key === 'bathroom') continue;
    rows.push({
      key,
      label: AMENITY_LABELS[key] ?? raw,
      icon: AMENITY_ICONS[key] ?? null,
    });
  }
  return rows;
}

// ─── Extra Details (property-type-specific fields from jsonb) ──────────────────

const EXTRA_DETAIL_ICONS: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  parkingSpaces:  Car,
  houseFloors:    Building2,
  hasGarden:      TreePine,
  hasGated:       Shield,
  roomBathroom:   Bath,
  kitchenAccess:  CookingPot,
  tenantPref:     Users,
  kitchenette:    CookingPot,
  studioBathroom: Bath,
};

const EXTRA_DETAIL_LABELS: Record<string, string> = {
  parkingSpaces:  'Parking Spaces',
  houseFloors:    'Floors',
  hasGarden:      'Garden',
  hasGated:       'Gated Community',
  roomBathroom:   'Bathroom Type',
  kitchenAccess:  'Kitchen Access',
  tenantPref:     'Tenant Preference',
  kitchenette:    'Kitchenette',
  studioBathroom: 'Bathroom Type',
};

interface ExtraDetailRow {
  key:   string;
  label: string;
  value: string;
  icon:  React.ComponentType<{ size?: number; color?: string }>;
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
  const fallbackIcon = Info;
  return Object.entries(extraDetails)
    .filter(([k]) => k !== 'originalType')
    .map(([k, v]) => {
      const formatted = formatExtraValue(v);
      return {
        key: k,
        label: EXTRA_DETAIL_LABELS[k] ?? camelToTitle(k),
        value: formatted,
        icon: EXTRA_DETAIL_ICONS[k] ?? fallbackIcon,
      };
    })
    .filter((r) => r.value !== '');
}

// ─── Status pill ─────────────────────────────────────────────────────────────

const STATUS_PILL: Record<PropertyStatus, { label: string; container: string; text: string } | null> = {
  AVAILABLE:        { label: 'Active',          container: 'bg-emerald-100/90', text: 'text-emerald-800' },
  HIGH_DEMAND:      { label: 'High Demand',     container: 'bg-amber-100/90',   text: 'text-amber-800' },
  UNDER_DISCUSSION: { label: 'Under Discussion', container: 'bg-blue-100/90',    text: 'text-blue-800' },
  OCCUPIED:         { label: 'Rented Out',      container: 'bg-gray-100',       text: 'text-gray-500' },
};

// ─── Screen ──────────────────────────────────────────────────────────────────

interface ListingDetailScreenProps {
  onBack?: () => void;
  /** Override the in-screen "View Applicants" navigation (used in previews). */
  onViewApplicants?: () => void;
  /** Override the in-screen "Pause Listing" handler (used in previews). */
  onPauseListing?: () => void;
}

export default function ListingDetailScreen({
  onBack,
  onViewApplicants,
  onPauseListing,
}: ListingDetailScreenProps) {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useUser();
  const supabase = useClerkSupabase();
  const clerkId = user?.id;

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [property, setProperty] = useState<PropertyPublic | null>(null);
  const [owner, setOwner] = useState<LandlordOwnerProfile | null>(null);
  const [stats, setStats] = useState<{ views: number; savedCount: number; requestCount: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState(false);

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (!id) return;
      if (mode === 'refresh') setRefreshing(true);
      else setLoading(true);

      const result = await getPropertyPublic(id, supabase);
      if (!result.success) {
        setErrorMessage(result.error);
        setProperty(null);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (!result.data) {
        setErrorMessage('This listing no longer exists.');
        setProperty(null);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const prop = result.data;
      setProperty(prop);
      setErrorMessage(null);

      // Owner profile + per-listing stats run in parallel. Failures are
      // non-fatal: the property card renders, owner/stats degrade to "—".
      const [ownerResult, statsResult] = await Promise.all([
        getLandlordOwnerProfile(prop.landlordId, supabase),
        getPropertyStats(prop.id, supabase),
      ]);
      if (ownerResult.success) setOwner(ownerResult.data);
      else console.warn('[listing detail] owner load failed:', ownerResult.error);
      if (statsResult.success) {
        setStats({ ...statsResult.data, views: prop.views });
      } else {
        console.warn('[listing detail] stats load failed:', statsResult.error);
        setStats({ views: prop.views, savedCount: 0, requestCount: 0 });
      }

      setLoading(false);
      setRefreshing(false);
    },
    [id, supabase],
  );

  useEffect(() => {
    load('initial');
  }, [load]);

  // Returning from edit / pause / request flows can change property state.
  useFocusEffect(
    useCallback(() => {
      load('refresh');
    }, [load]),
  );

  const ownerName = owner?.name ?? 'You';
  const ownerInitials = useMemo(() => {
    const parts = ownerName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'L';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [ownerName]);

  const amenityRows = useMemo(
    () => (property ? toAmenityRows(property.amenities, property.bedrooms, property.bathrooms) : []),
    [property],
  );

  const extraDetailRows = useMemo(
    () => (property ? toExtraDetailRows(property.extraDetails) : []),
    [property],
  );

  const statusPill = property ? (STATUS_PILL[property.status] ?? null) : null;
  const isPaused = property?.isPaused ?? false;
  const isListed = !isPaused && property && property.status !== 'OCCUPIED';

  const handleBack = useCallback(() => {
    if (onBack) onBack();
    else router.back();
  }, [onBack, router]);

  const handleShare = useCallback(async () => {
    if (!property) return;
    const shareText = `${property.title} — ${formatMonthlyPrice(property.price)}`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: property.title,
          text:  shareText,
          url:   typeof window !== 'undefined' ? window.location.href : undefined,
        });
      } catch {
        // user cancelled
      }
    } else {
      console.log('Share:', shareText);
    }
  }, [property]);

  const handleViewApplicants = useCallback(() => {
    if (onViewApplicants) {
      onViewApplicants();
      return;
    }
    if (!property) return;
    router.push({
      pathname: '/(landlord)/(tabs)/requests',
      params: { propertyId: property.id },
    } as any);
  }, [onViewApplicants, router, property]);

  const handleTogglePause = useCallback(async () => {
    if (!property) return;
    if (onPauseListing) {
      onPauseListing();
      return;
    }

    const willPause = !isPaused;
    Alert.alert(
      willPause ? 'Pause listing?' : 'Resume listing?',
      willPause
        ? `"${property.title}" will be hidden from tenants until you resume it.`
        : `"${property.title}" will become visible to tenants again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: willPause ? 'Pause' : 'Resume',
          onPress: async () => {
            setActionPending(true);
            const result = await setListingPaused(property.id, willPause, supabase);
            setActionPending(false);
            if (!result.success) {
              Alert.alert(willPause ? 'Could not pause' : 'Could not resume', result.error);
              return;
            }
            // Reload so the status pill + button label reflect the new state.
            load('refresh');
          },
        },
      ],
    );
  }, [property, isPaused, onPauseListing, supabase, load]);

  // ── Loading state ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator color="#1A6B4A" />
      </View>
    );
  }

  // ── Error / not-found state ──────────────────────────────────────────────
  if (!property) {
    return (
      <View className="flex-1 items-center justify-center bg-bg px-6">
        <Text className="mb-1.5 font-semibold text-body text-ink">
          Could not load this listing
        </Text>
        <Text className="mb-5 text-center text-body-sm text-ink2">
          {errorMessage ?? 'Please try again.'}
        </Text>
        <Pressable
          onPress={() => load('initial')}
          className="h-[48px] items-center justify-center rounded-pill bg-black px-8">
          <Text className="font-semibold text-body text-white">Try again</Text>
        </Pressable>
      </View>
    );
  }

  // `clerkId` is the signed-in landlord. If it doesn't match the row, the
  // landlord is looking at someone else's property — let RLS keep it hidden
  // (the row will already be null above) but also surface a friendlier note
  // if a different error path lands us here.
  if (clerkId && property.landlordId !== clerkId) {
    return (
      <View className="flex-1 items-center justify-center bg-bg px-6">
        <Text className="mb-1.5 font-semibold text-body text-ink">
          You don't own this listing
        </Text>
        <Text className="mb-5 text-center text-body-sm text-ink2">
          This listing belongs to another account.
        </Text>
        <Pressable
          onPress={handleBack}
          className="h-[48px] items-center justify-center rounded-pill bg-black px-8">
          <Text className="font-semibold text-body text-white">Go back</Text>
        </Pressable>
      </View>
    );
  }

  const propertyTypeLabel = PROPERTY_TYPE_LABELS[property.propertyType];
  const showRating = (owner?.totalReviews ?? 0) > 0;

  return (
    <View className="flex-1 bg-bg">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 160 }}
        showsVerticalScrollIndicator={false}>
        {/* ═══ Hero Image Area ═══ */}
        <PropertyHero
          height={HERO_HEIGHT}
          images={property.photoUrls}
          onBack={handleBack}
          onShare={handleShare}
          currentIndex={currentImageIndex}
          onIndexChange={setCurrentImageIndex}
        />

        {/* ═══ Content ═══ */}
        <View className="px-6 pt-4">
          {/* Title — serif */}
          <Text className="font-display text-h1 leading-tight text-ink">
            {property.title}
          </Text>

          {/* Location + Rating row */}
          <View className="mt-2 flex-row items-center justify-between">
            <View className="flex-1 flex-row items-center">
              <MapPin size={14} color="#6B6B6B" />
              <Text className="ml-1 flex-1 font-sans text-body-sm text-ink2" numberOfLines={1}>
                {property.locationArea}
              </Text>
            </View>
            {showRating ? (
              <View className="ml-2 flex-row items-center">
                <Star size={14} color="#F5A623" fill="#F5A623" />
                <Text className="ml-1 font-medium text-body-sm text-ink">
                  {(owner?.avgRating ?? 0).toFixed(1)}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Price row */}
          <Text className="mt-3 font-bold text-h2 text-brand">
            {formatMonthlyPrice(property.price)}
          </Text>

          {/* Property type + available-from */}
          <View className="mt-2 flex-row flex-wrap items-center gap-x-3 gap-y-1">
            <Text className="font-sans text-body-sm text-ink2">{propertyTypeLabel}</Text>
            {property.areaSqft != null ? (
              <>
                <View className="h-1 w-1 rounded-full bg-ink3" />
                <Text className="font-sans text-body-sm text-ink2">
                  {property.areaSqft} sqft
                </Text>
              </>
            ) : null}
            {property.furnishing ? (
              <>
                <View className="h-1 w-1 rounded-full bg-ink3" />
                <Text className="font-sans text-body-sm text-ink2">{property.furnishing}</Text>
              </>
            ) : null}
          </View>

          {/* Status pills: DB status + pause flag */}
          <View className="mt-3 flex-row flex-wrap items-center gap-2">
            {isPaused ? (
              <View className="rounded-pill bg-gray-100 px-3 py-1">
                <Text className="text-xs font-semibold text-gray-500">Paused</Text>
              </View>
            ) : statusPill ? (
              <View className={`rounded-pill px-3 py-1 ${statusPill.container}`}>
                <Text className={`text-xs font-semibold ${statusPill.text}`}>
                  {statusPill.label}
                </Text>
              </View>
            ) : null}
          </View>

          {/* ═══ Amenities Card ═══ */}
          {amenityRows.length > 0 ? (
            <View className="mt-5 rounded-card bg-canvas px-4 py-4">
              <Text className="mb-3 font-semibold text-body text-ink">Amenities</Text>
              <View className="flex-row flex-wrap gap-2">
                {amenityRows.map((amenity, i) => {
                  const Icon = amenity.icon;
                  return (
                    <View
                      key={`${amenity.key}-${i}`}
                      className="flex-row items-center rounded-pill bg-bg px-3 py-2">
                      {Icon ? <Icon size={15} color="#1A6B4A" /> : null}
                      <Text className="ml-1.5 font-sans text-caption text-ink">
                        {amenity.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : null}

          {/* ═══ Extra Details Card (property-type-specific fields) ═══ */}
          {extraDetailRows.length > 0 ? (
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
          ) : null}

          {/* ═══ About Section ═══ */}
          {property.description ? (
            <>
              <Text className="mt-6 font-semibold text-h3 text-ink">About</Text>
              <Text className="mt-2 font-sans text-body leading-relaxed text-ink2">
                {property.description}
              </Text>
            </>
          ) : null}

          {/* ═══ Owner Card ═══ */}
          <View className="mt-5 flex-row items-center rounded-card bg-canvas p-4">
            {owner?.avatarUrl ? (
              <Image
                source={{ uri: owner.avatarUrl }}
                style={{ width: 48, height: 48, borderRadius: 24 }}
              />
            ) : (
              <Avatar size={48} initials={ownerInitials} />
            )}
            <View className="ml-3 flex-1">
              <View className="flex-row items-center gap-1">
                <Text className="font-semibold text-body text-ink" numberOfLines={1}>
                  {ownerName}
                </Text>
                <CheckCircle size={14} color="#1A6B4A" strokeWidth={2} />
              </View>
              <Text className="mt-0.5 font-sans text-body-sm text-ink2">
                Verified owner
                {showRating
                  ? ` · ${(owner?.avgRating ?? 0).toFixed(1)} ★ (${owner?.totalReviews} reviews)`
                  : ''}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* ═══ Sticky Bottom Action Bar ═══ */}
      <View className="border-t border-line bg-bg px-6 pb-6 pt-4">
        {/* Stats row */}
        <View className="mb-4 flex-row items-center justify-center gap-6">
          <View className="flex-row items-center gap-1.5">
            <Eye size={16} color="#6B6B6B" />
            <Text className="font-bold text-body text-ink">
              {FORMATTER.format(stats?.views ?? property.views)}
            </Text>
            <Text className="font-sans text-body-sm text-ink2">views</Text>
          </View>
          <View className="h-4 w-[1px] bg-line" />
          <View className="flex-row items-center gap-1.5">
            <Heart size={16} color="#6B6B6B" />
            <Text className="font-bold text-body text-ink">
              {FORMATTER.format(stats?.savedCount ?? 0)}
            </Text>
            <Text className="font-sans text-body-sm text-ink2">saved</Text>
          </View>
          <View className="h-4 w-[1px] bg-line" />
          <View className="flex-row items-center gap-1.5">
            <Users size={16} color="#6B6B6B" />
            <Text className="font-bold text-body text-ink">
              {FORMATTER.format(stats?.requestCount ?? 0)}
            </Text>
            <Text className="font-sans text-body-sm text-ink2">requests</Text>
          </View>
        </View>

        {/* Action buttons */}
        <View className="flex-row gap-3">
          <Pressable
            onPress={handleTogglePause}
            disabled={actionPending}
            className={`h-[48px] flex-1 flex-row items-center justify-center gap-2 rounded-pill border border-line ${
              actionPending ? 'opacity-60' : ''
            }`}
            accessibilityRole="button"
            accessibilityLabel={isPaused ? 'Resume listing' : 'Pause listing'}>
            {isPaused ? (
              <Play size={16} color="#0A0A0A" />
            ) : (
              <Pause size={16} color="#0A0A0A" />
            )}
            <Text className="font-semibold text-body text-ink">
              {isPaused ? 'Resume Listing' : 'Pause Listing'}
            </Text>
          </Pressable>

          <Pressable
            onPress={handleViewApplicants}
            disabled={!isListed}
            className={`h-[48px] flex-1 flex-row items-center justify-center gap-2 rounded-pill bg-ink ${
              !isListed ? 'opacity-50' : ''
            }`}
            accessibilityRole="button"
            accessibilityLabel="View applicants">
            <Users size={16} color="#FFFFFF" />
            <Text className="font-semibold text-body text-white">View Applicants</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
