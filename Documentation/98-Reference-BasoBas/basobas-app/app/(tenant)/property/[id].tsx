import { ScrollView, View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Share2, Heart } from 'lucide-react-native';

export default function PropertyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Hero */}
        <View className="h-[280px] bg-canvas relative">
          <View className="absolute top-4 left-6 right-6 flex-row justify-between z-10">
            <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-pill bg-white/80">
              <ArrowLeft size={18} color="#0A0A0A" />
            </Pressable>
            <View className="flex-row">
              <Pressable className="mr-2 h-10 w-10 items-center justify-center rounded-pill bg-white/80">
                <Share2 size={18} color="#0A0A0A" />
              </Pressable>
              <Pressable className="h-10 w-10 items-center justify-center rounded-pill bg-white/80">
                <Heart size={18} color="#0A0A0A" />
              </Pressable>
            </View>
          </View>
          <View className="flex-1 items-center justify-center">
            <Text className="font-sans text-body-sm text-ink3">Photo carousel · Property {id}</Text>
          </View>
          <Pressable
            onPress={() => router.push(`/(tenant)/property/${id}/gallery` as any)}
            className="absolute bottom-3 right-6 rounded-pill bg-white/80 px-3 py-1"
          >
            <Text className="font-medium text-caption text-ink">View all</Text>
          </Pressable>
        </View>

        <View className="px-6 pt-4">
          {/* Title block */}
          <Text className="font-semibold text-h2 text-ink mb-1">Modern 2BHK in Thamel</Text>
          <Text className="font-sans text-body text-ink2 mb-1">Thamel, Kathmandu</Text>
          <Text className="font-bold text-h3 text-brand mb-4">NPR 25,000/mo</Text>

          {/* Verified pill */}
          <View className="self-start rounded-pill bg-brand-light px-3 py-1 mb-4">
            <Text className="font-medium text-caption text-brand">✓ Verified</Text>
          </View>

          {/* Quick stats */}
          <View className="flex-row justify-between mb-5 rounded-card bg-canvas p-4">
            {[['2', 'Beds'], ['1', 'Bath'], ['850', 'sqft'], ['3', 'Floor']].map(([val, label]) => (
              <View key={label} className="items-center">
                <Text className="font-bold text-body text-ink">{val}</Text>
                <Text className="font-sans text-caption text-ink2">{label}</Text>
              </View>
            ))}
          </View>

          {/* Description */}
          <Text className="font-semibold text-h3 text-ink mb-2">Description</Text>
          <Text className="font-sans text-body text-ink2 mb-5">
            A beautiful, well-maintained apartment in the heart of Thamel. Walking distance to restaurants, shops, and public transport. The apartment features modern amenities and natural lighting.
          </Text>

          {/* Amenities */}
          <Text className="font-semibold text-h3 text-ink mb-2">Amenities</Text>
          <View className="flex-row flex-wrap mb-5">
            {['WiFi', 'Parking', 'Water 24/7', 'Balcony', 'Kitchen', 'Laundry'].map((a) => (
              <View key={a} className="mr-2 mb-2 rounded-pill bg-canvas px-3 py-1.5">
                <Text className="font-sans text-body-sm text-ink">{a}</Text>
              </View>
            ))}
          </View>

          {/* Landlord card */}
          <Text className="font-semibold text-h3 text-ink mb-2">Landlord</Text>
          <Pressable
            onPress={() => router.push('/(tenant)/landlord/1' as any)}
            className="flex-row items-center rounded-card border border-line p-4 mb-5"
          >
            <View className="h-12 w-12 rounded-pill bg-canvas items-center justify-center mr-3">
              <Text className="font-sans text-body text-ink3">L</Text>
            </View>
            <View>
              <Text className="font-semibold text-body text-ink">Ram Sharma</Text>
              <Text className="font-sans text-body-sm text-ink2">5 properties · Verified</Text>
            </View>
          </Pressable>

          {/* Reviews preview */}
          <View className="flex-row items-center justify-between mb-3">
            <Text className="font-semibold text-h3 text-ink">Reviews</Text>
            <Pressable onPress={() => router.push(`/(tenant)/reviews/property/${id}` as any)}>
              <Text className="font-medium text-body-sm text-brand">See all</Text>
            </Pressable>
          </View>
          <View className="rounded-card bg-canvas p-4 mb-5">
            <Text className="font-sans text-body-sm text-ink2">
              {'"Great location and well-maintained property. Landlord is very responsive."'}
            </Text>
            <Text className="font-sans text-caption text-ink3 mt-1">— Tenant, 2 weeks ago</Text>
          </View>
        </View>
      </ScrollView>

      {/* Sticky bottom CTA */}
      <View className="absolute bottom-0 left-0 right-0 flex-row items-center border-t border-line bg-bg px-6 py-4">
        <Pressable className="mr-3 h-[48px] w-[48px] items-center justify-center rounded-pill border border-line">
          <Heart size={20} color="#0A0A0A" />
        </Pressable>
        <Pressable
          onPress={() => router.push(`/(tenant)/schedule-visit/${id}` as any)}
          className="flex-1 h-[48px] items-center justify-center rounded-pill bg-ink"
        >
          <Text className="font-semibold text-body text-white">Schedule Visit</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
