import { useState, useCallback, useEffect } from 'react';
import { ScrollView, View, Text, Pressable, Dimensions, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MapPin, Star, Heart, Bed, Bath, Wifi, Car, ChevronRight, Building2, TreePine, Shield, CookingPot, Users, Info } from 'lucide-react-native';
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
import { createVisitRequest } from '@/src/services/visits.service';
import { usePropertyStore } from '@/src/store/propertyStore';
import { toTimeSlot, type PropertyPublic } from '@/src/types/property.types';
import { tokens } from '@/src/theme/tokens';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const HERO_HEIGHT = SCREEN_HEIGHT * 0.42;

// ─── Amenity / Extra-Detail helpers ─────────────────────────────────────────

const AMENITY_ICONS: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  bed: Bed,
  bath: Bath,
  wifi: Wifi,
  car: Car,
};

const AMENITY_LABELS: Record<string, string> = {
  bed:     'Bed',
  bath:    'Bath',
  wifi:    'Wi-Fi',
  car:     'Parking',
  kitchen: 'Kitchen',
  ac:      'AC',
  heater:  'Heater',
  tv:      'TV',
  laundry: 'Laundry',
  gym:     'Gym',
  security: 'Security',
  garden:  'Garden',
  lift:    'Lift',
  power:   'Power Backup',
  water:   'Water Supply',
};

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
  for (const raw of rawAmenities) {
    const key = raw.toLowerCase();
    if (key === 'bed' || key === 'bath' || key === 'bedroom' || key === 'bathroom') continue;
    rows.push({ key, label: AMENITY_LABELS[key] ?? raw, icon: AMENITY_ICONS[key] ?? null });
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

  const savedPropertyIds = usePropertyStore((s) => s.savedPropertyIds);
  const toggleSaved = usePropertyStore((s) => s.toggleSaved);
  const saved = property != null && savedPropertyIds.includes(property.id);

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
    setShowScheduleDrawer(true);
  }, []);

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

  const amenityRows = toAmenityRows(property.amenities, property.bedrooms, property.bathrooms).slice(0, 4);
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

          {/* Location + Rating row */}
          <View className="mt-2 flex-row items-center justify-between">
            <View className="flex-row items-center">
              <MapPin size={14} color="#6B6B6B" />
              <Text className="ml-1 font-sans text-body-sm text-ink2">{property.locationArea}</Text>
            </View>
            <View className="flex-row items-center">
              <Star size={14} color="#F5A623" fill="#F5A623" />
              <Text className="ml-1 font-medium text-body-sm text-ink">
                {property.bedrooms != null
                  ? `${property.bedrooms} bed${property.bedrooms > 1 ? 's' : ''}`
                  : '—'}
              </Text>
            </View>
          </View>

          {/* Price row */}
          <Text className="mt-3 font-bold text-h2 text-brand">
            {fmtNpr(property.price)}
            <Text className="font-sans text-body text-ink2"> / month</Text>
          </Text>

          {/* ═══ Amenities Card ═══ */}
          {amenityRows.length > 0 && (
            <View className="mt-5 flex-row items-center rounded-card bg-canvas px-4 py-4">
              {amenityRows.map((amenity, i) => {
                const IconComponent = amenity.icon;
                return (
                  <View key={amenity.key} className="flex-1 flex-row items-center">
                    <View className="flex-1 items-center">
                      {IconComponent && <IconComponent size={20} color="#6B6B6B" />}
                      <Text className="mt-1.5 font-sans text-caption text-ink2">{amenity.label}</Text>
                    </View>
                    {i < amenityRows.length - 1 && <View className="h-8 w-[1px] bg-line" />}
                  </View>
                );
              })}
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

        {/* Schedule a Visit */}
        <Pressable
          onPress={handleScheduleVisit}
          className="h-[48px] flex-1 items-center justify-center rounded-pill bg-ink"
          accessibilityRole="button"
          accessibilityLabel="Schedule a Visit">
          <Text className="font-semibold text-body text-white">Schedule a Visit</Text>
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
