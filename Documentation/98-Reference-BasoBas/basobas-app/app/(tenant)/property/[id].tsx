import { useState, useCallback } from 'react';
import { ScrollView, View, Text, Pressable, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  MapPin,
  Star,
  Heart,
  Bed,
  Bath,
  Wifi,
  Car,
} from 'lucide-react-native';

import { PropertyHero } from '@/src/components/property/PropertyHero';
import { Avatar } from '@/src/components/user/Avatar';
import { ScheduleVisitDrawer } from '@/src/components/property/ScheduleVisitDrawer';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const HERO_HEIGHT = SCREEN_HEIGHT * 0.42;

// ─── Types ───────────────────────────────────────────────────────────────────

interface Amenity {
  icon: string;
  label: string;
}

interface Owner {
  name: string;
  avatarUrl?: string;
  verified: boolean;
  listingsCount: number;
}

interface PropertyDetail {
  id: string;
  title: string;
  location: string;
  rating: number;
  priceMonthly: number;
  currency: string;
  images: string[];
  amenities: Amenity[];
  about: string;
  owner: Owner;
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

const MOCK_PROPERTY: PropertyDetail = {
  id: '1',
  title: '2BHK Apartment in Kupondole',
  location: 'Lalitpur, Nepal',
  rating: 4.8,
  priceMonthly: 32000,
  currency: 'Rs.',
  images: Array.from({ length: 12 }, (_, i) => `photo-${i + 1}`),
  amenities: [
    { icon: 'bed', label: '2 Bed' },
    { icon: 'bath', label: '1 Bath' },
    { icon: 'wifi', label: 'Wi-Fi' },
    { icon: 'car', label: 'Parking' },
  ],
  about:
    'Sunlit 2BHK with balcony, walking distance to UN Park. Newly renovated with modern fittings.',
  owner: {
    name: 'Sita Sharma',
    verified: true,
    listingsCount: 12,
  },
};

// ─── Amenity Icon Map ────────────────────────────────────────────────────────

const AMENITY_ICONS: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  bed: Bed,
  bath: Bath,
  wifi: Wifi,
  car: Car,
};

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function PropertyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [saved, setSaved] = useState(false);
  const [showScheduleDrawer, setShowScheduleDrawer] = useState(false);

  const property = MOCK_PROPERTY;
  const ownerInitials = property.owner.name
    .split(' ')
    .map((n) => n[0])
    .join('');

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleShare = useCallback(async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: property.title,
          text: `${property.title} — ${property.currency} ${property.priceMonthly.toLocaleString()}/mo`,
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
    setSaved((prev) => !prev);
  }, []);

  const handleScheduleVisit = useCallback(() => {
    setShowScheduleDrawer(true);
  }, []);

  const handleScheduleClose = useCallback(() => {
    setShowScheduleDrawer(false);
  }, []);

  const handleScheduleConfirm = useCallback(
    async (selection: { date: Date; time: string }) => {
      // TODO: send visit request to API
      console.log('Visit confirmed:', { selection, propertyId: id });
    },
    [id],
  );

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
          images={property.images}
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
            <View className="flex-row items-center">
              <MapPin size={14} color="#6B6B6B" />
              <Text className="ml-1 font-sans text-body-sm text-ink2">
                {property.location}
              </Text>
            </View>
            <View className="flex-row items-center">
              <Star size={14} color="#F5A623" fill="#F5A623" />
              <Text className="ml-1 font-medium text-body-sm text-ink">
                {property.rating}
              </Text>
            </View>
          </View>

          {/* Price row */}
          <Text className="mt-3 font-bold text-h2 text-brand">
            {property.currency} {property.priceMonthly.toLocaleString()}
            <Text className="font-sans text-body text-ink2">
              {' '}/ month
            </Text>
          </Text>

          {/* ═══ Amenities Card ═══ */}
          <View className="mt-5 flex-row items-center rounded-card bg-canvas px-4 py-4">
            {property.amenities.map((amenity, i) => {
              const IconComponent = AMENITY_ICONS[amenity.icon];
              return (
                <View key={amenity.label} className="flex-1 flex-row items-center">
                  <View className="flex-1 items-center">
                    {IconComponent && <IconComponent size={20} color="#6B6B6B" />}
                    <Text className="mt-1.5 font-sans text-caption text-ink2">
                      {amenity.label}
                    </Text>
                  </View>
                  {i < property.amenities.length - 1 && (
                    <View className="h-8 w-[1px] bg-line" />
                  )}
                </View>
              );
            })}
          </View>

          {/* ═══ About Section ═══ */}
          <Text className="mt-6 font-semibold text-h3 text-ink">About</Text>
          <Text className="mt-2 font-sans text-body leading-relaxed text-ink2">
            {property.about}
          </Text>

          {/* ═══ Owner Card ═══ */}
          <View className="mt-5 flex-row items-center rounded-card bg-canvas p-4">
            <Avatar size={48} initials={ownerInitials} />
            <View className="ml-3 flex-1">
              <Text className="font-semibold text-body text-ink">
                {property.owner.name}
              </Text>
              <Text className="mt-0.5 font-sans text-body-sm text-ink2">
                Verified owner · {property.owner.listingsCount} listings
              </Text>
            </View>
          </View>
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
      <ScheduleVisitDrawer
        propertyTitle={property.title}
        propertyLocation={property.location.split(',')[0]}
        isOpen={showScheduleDrawer}
        onClose={handleScheduleClose}
        onConfirm={handleScheduleConfirm}
      />
    </View>
  );
}
