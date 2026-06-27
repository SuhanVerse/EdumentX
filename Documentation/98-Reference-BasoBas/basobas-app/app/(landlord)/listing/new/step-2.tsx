import { ScrollView, View, Text, Pressable, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ScreenHeader } from '../../../../src/components/layout/ScreenHeader';
import { MapPin } from 'lucide-react-native';

export default function NewListingStep2() {
  const router = useRouter();

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      <ScreenHeader title="New Listing" showBack={true} centerTitle={true} />

      {/* Progress Bar */}
      <View className="h-1 w-full bg-line">
        <View className="h-full w-2/4 bg-brand" />
      </View>

      <ScrollView className="px-6" contentContainerStyle={{ paddingTop: 20, paddingBottom: 100 }}>
        <Text className="mb-1 font-semibold text-h2 text-ink">Property Location</Text>
        <Text className="mb-6 text-body text-ink2">
          Enter details and pin the exact location on the map.
        </Text>

        {/* Address Input */}
        <View className="mb-5">
          <Text className="mb-2 font-semibold text-body-sm text-ink">Street Address</Text>
          <TextInput
            placeholder="e.g. House 42, Gairidhara Marg"
            placeholderTextColor="#C0C0C0"
            className="h-[56px] rounded-lg border border-line bg-input px-4 font-sans text-body text-ink"
          />
        </View>

        {/* Area / Neighborhood */}
        <View className="mb-5">
          <Text className="mb-2 font-semibold text-body-sm text-ink">Area / City</Text>
          <TextInput
            placeholder="e.g. Baluwatar, Kathmandu"
            placeholderTextColor="#C0C0C0"
            className="h-[56px] rounded-lg border border-line bg-input px-4 font-sans text-body text-ink"
          />
        </View>

        {/* Map View Area */}
        <View className="mb-5">
          <Text className="mb-2 font-semibold text-body-sm text-ink">Drag Map to Pin Location</Text>
          <View className="relative h-[220px] items-center justify-center overflow-hidden rounded-card border border-line bg-canvas">
            {/* Mock map items */}
            <MapPin size={32} color="#1A6B4A" />
            <Text className="mt-2 font-medium text-caption text-ink2">Baluwatar Map View</Text>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom */}
      <View className="absolute inset-x-6 bottom-6">
        <Pressable
          onPress={() => router.push('/(landlord)/listing/new/step-3' as any)}
          className="h-[56px] items-center justify-center rounded-pill bg-brand">
          <Text className="font-semibold text-body text-white">Continue</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
