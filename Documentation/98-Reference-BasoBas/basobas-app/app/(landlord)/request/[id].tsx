import { ScrollView, View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ScreenHeader } from '../../../src/components/layout/ScreenHeader';
import { Calendar, Clock, MapPin, User, ChevronRight } from 'lucide-react-native';

export default function RequestDetailScreen() {
  const router = useRouter();

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      <ScreenHeader title="Request Detail" showBack={true} centerTitle={true} />

      <ScrollView className="px-6" contentContainerStyle={{ paddingTop: 16, paddingBottom: 120 }}>
        {/* Tenant Profile Preview Card */}
        <Text className="mb-2 font-semibold text-body-sm text-ink">Requesting Tenant</Text>
        <Pressable
          onPress={() =>
            router.push({ pathname: '/(landlord)/tenant/[id]', params: { id: '1' } } as any)
          }
          className="mb-5 flex-row items-center justify-between rounded-card border border-line bg-bg p-4">
          <View className="flex-row items-center gap-3">
            <View className="h-12 w-12 items-center justify-center rounded-pill bg-canvas">
              <User size={20} color="#AAAAAA" />
            </View>
            <View>
              <Text className="font-semibold text-body text-ink">Aayush Shrestha</Text>
              <Text className="text-caption text-ink2">Completed 4 past visits</Text>
            </View>
          </View>
          <ChevronRight size={18} color="#0A0A0A" />
        </Pressable>

        {/* Requested Date & Time */}
        <Text className="mb-2 font-semibold text-body-sm text-ink">Requested Time Slot</Text>
        <View className="mb-5 rounded-card border border-line bg-bg p-4">
          <View className="mb-2 flex-row items-center gap-2">
            <Calendar size={16} color="#1A6B4A" />
            <Text className="font-medium text-body text-ink">Monday, June 15, 2026</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <Clock size={16} color="#1A6B4A" />
            <Text className="font-medium text-body text-ink">2:30 PM - 3:30 PM</Text>
          </View>
        </View>

        {/* Property Summary */}
        <Text className="mb-2 font-semibold text-body-sm text-ink">Property</Text>
        <View className="mb-5 rounded-card border border-line bg-bg p-4">
          <Text className="font-semibold text-body text-ink">Baluwatar Luxury Apartment</Text>
          <View className="mt-1 flex-row items-center gap-1">
            <MapPin size={12} color="#6B6B6B" />
            <Text className="text-caption text-ink2">Gairidhara Marg, Baluwatar</Text>
          </View>
        </View>

        {/* Note */}
        <Text className="mb-2 font-semibold text-body-sm text-ink">{"Tenant's Note"}</Text>
        <View className="mb-5 rounded-card border border-line bg-canvas p-4">
          <Text className="text-body-sm leading-relaxed text-ink2">
            {
              '"I\'m looking to move in by next month and would love to check out the natural lighting and safety features of the building."'
            }
          </Text>
        </View>

        {/* Suggest Time */}
        <Pressable className="items-center py-2">
          <Text className="font-semibold text-body-sm text-brand">Suggest a different time</Text>
        </Pressable>
      </ScrollView>

      {/* Sticky Bottom Actions */}
      <View className="absolute inset-x-6 bottom-6 flex-row gap-3">
        <Pressable
          onPress={() => router.back()}
          className="h-[56px] flex-1 items-center justify-center rounded-pill border border-line bg-bg">
          <Text className="font-semibold text-body text-ink2">Decline</Text>
        </Pressable>
        <Pressable
          onPress={() => router.back()}
          className="h-[56px] flex-[2] items-center justify-center rounded-pill bg-brand">
          <Text className="font-semibold text-body text-white">Approve Request</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
