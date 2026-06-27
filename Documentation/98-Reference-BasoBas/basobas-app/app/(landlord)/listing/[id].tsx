import { ScrollView, View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ScreenHeader } from '../../../src/components/layout/ScreenHeader';
import { Eye, Calendar, Star, MessageSquare } from 'lucide-react-native';

export default function ListingDetailScreen() {
  const router = useRouter();

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      <ScreenHeader
        title="Listing Detail"
        showBack={true}
        centerTitle={true}
        rightText={{ label: 'Edit', onPress: () => {} }}
      />
      <ScrollView className="px-6" contentContainerStyle={{ paddingTop: 16, paddingBottom: 24 }}>
        {/* Photo Carousel Area */}
        <View className="mb-5 h-48 items-center justify-center rounded-card bg-canvas">
          <Text className="text-body-sm text-ink3">Property Photos Carousel</Text>
        </View>

        {/* Title and Status */}
        <View className="mb-4 flex-row items-start justify-between">
          <View className="mr-4 flex-1">
            <Text className="font-semibold text-h2 text-ink">Baluwatar Luxury Apartment</Text>
            <Text className="mt-1 text-body text-ink2">NPR 45,000 / month</Text>
          </View>
          <View className="rounded-pill bg-brand-light px-3 py-1">
            <Text className="font-semibold text-caption text-brand">Active</Text>
          </View>
        </View>

        {/* Performance Stats */}
        <Text className="mb-3 font-semibold text-h3 text-ink">Inquiry Performance</Text>
        <View className="mb-6 flex-row gap-3">
          {[
            { label: 'Views', value: '412', icon: Eye },
            { label: 'Visits', value: '18', icon: Calendar },
            { label: 'Chats', value: '29', icon: MessageSquare },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <View
                key={stat.label}
                className="flex-1 items-center rounded-card border border-line bg-bg p-4">
                <Icon size={18} color="#1A6B4A" />
                <Text className="mt-2 font-bold text-h3 text-ink">{stat.value}</Text>
                <Text className="mt-0.5 text-caption text-ink2">{stat.label}</Text>
              </View>
            );
          })}
        </View>

        {/* Active Visit Requests */}
        <Text className="mb-3 font-semibold text-h3 text-ink">Pending Requests</Text>
        <View className="mb-6 rounded-card border border-line bg-bg p-4">
          <Pressable
            onPress={() =>
              router.push({ pathname: '/(landlord)/request/[id]', params: { id: '1' } } as any)
            }
            className="flex-row items-center justify-between">
            <View>
              <Text className="font-medium text-body text-ink">Aayush Shrestha</Text>
              <Text className="mt-0.5 text-caption text-ink2">Tomorrow · 2:30 PM</Text>
            </View>
            <Text className="font-semibold text-body-sm text-brand">View Details ➔</Text>
          </Pressable>
        </View>

        {/* Reviews */}
        <Text className="mb-3 font-semibold text-h3 text-ink">Reviews</Text>
        <View className="rounded-card border border-line bg-bg p-4">
          <View className="mb-2 flex-row items-center gap-1">
            <Star size={16} color="#F5A623" fill="#F5A623" />
            <Text className="font-semibold text-body text-ink">4.8</Text>
            <Text className="text-caption text-ink2">(6 reviews)</Text>
          </View>
          <Text className="text-body-sm italic text-ink2">
            {'"Highly responsive landlord and a very neat apartment." - Priya'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
