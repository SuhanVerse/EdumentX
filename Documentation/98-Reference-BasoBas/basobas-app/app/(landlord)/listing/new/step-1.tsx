import { ScrollView, View, Text, Pressable, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ScreenHeader } from '../../../../src/components/layout/ScreenHeader';

export default function NewListingStep1() {
  const router = useRouter();

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      <ScreenHeader title="New Listing" showBack={true} centerTitle={true} />

      {/* Progress Bar */}
      <View className="h-1 w-full bg-line">
        <View className="h-full w-1/4 bg-brand" />
      </View>

      <ScrollView className="px-6" contentContainerStyle={{ paddingTop: 20, paddingBottom: 100 }}>
        <Text className="mb-1 font-semibold text-h2 text-ink">Property Basics</Text>
        <Text className="mb-6 text-body text-ink2">
          {"Let's start with the basic details of your property."}
        </Text>

        {/* Title Input */}
        <View className="mb-5">
          <Text className="mb-2 font-semibold text-body-sm text-ink">Listing Title</Text>
          <TextInput
            placeholder="e.g. Spacious 2 BHK Apartment in Baluwatar"
            placeholderTextColor="#C0C0C0"
            className="h-[56px] rounded-lg border border-line bg-input px-4 font-sans text-body text-ink"
          />
        </View>

        {/* Property Type */}
        <View className="mb-5">
          <Text className="mb-2 font-semibold text-body-sm text-ink">Property Type</Text>
          <View className="flex-row gap-2">
            {['Apartment', 'House', 'Flat', 'Room'].map((type, i) => (
              <Pressable
                key={type}
                className={`h-11 flex-1 items-center justify-center rounded-pill border ${i === 0 ? 'border-brand bg-brand-light' : 'border-line bg-bg'}`}>
                <Text
                  className={`font-semibold text-body-sm ${i === 0 ? 'text-brand' : 'text-ink2'}`}>
                  {type}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Counters */}
        <View className="mb-5 flex-row gap-4">
          <View className="flex-1">
            <Text className="mb-2 font-semibold text-body-sm text-ink">Bedrooms</Text>
            <View className="h-12 flex-row items-center justify-between rounded-lg border border-line bg-input px-3">
              <Pressable className="h-8 w-8 items-center justify-center rounded-full border border-line bg-bg">
                <Text className="font-bold text-body text-ink">-</Text>
              </Pressable>
              <Text className="font-semibold text-body text-ink">2</Text>
              <Pressable className="h-8 w-8 items-center justify-center rounded-full border border-line bg-bg">
                <Text className="font-bold text-body text-ink">+</Text>
              </Pressable>
            </View>
          </View>

          <View className="flex-1">
            <Text className="mb-2 font-semibold text-body-sm text-ink">Bathrooms</Text>
            <View className="h-12 flex-row items-center justify-between rounded-lg border border-line bg-input px-3">
              <Pressable className="h-8 w-8 items-center justify-center rounded-full border border-line bg-bg">
                <Text className="font-bold text-body text-ink">-</Text>
              </Pressable>
              <Text className="font-semibold text-body text-ink">1</Text>
              <Pressable className="h-8 w-8 items-center justify-center rounded-full border border-line bg-bg">
                <Text className="font-bold text-body text-ink">+</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Size (sqft) */}
        <View className="mb-5">
          <Text className="mb-2 font-semibold text-body-sm text-ink">Area Size (sq. ft.)</Text>
          <TextInput
            placeholder="e.g. 1200"
            placeholderTextColor="#C0C0C0"
            keyboardType="numeric"
            className="h-[56px] rounded-lg border border-line bg-input px-4 font-sans text-body text-ink"
          />
        </View>
      </ScrollView>

      {/* Sticky Bottom */}
      <View className="absolute inset-x-6 bottom-6">
        <Pressable
          onPress={() => router.push('/(landlord)/listing/new/step-2' as any)}
          className="h-[56px] items-center justify-center rounded-pill bg-brand">
          <Text className="font-semibold text-body text-white">Continue</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
