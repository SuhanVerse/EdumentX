import { ScrollView, View, Text, Pressable, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ScreenHeader } from '../../../../src/components/layout/ScreenHeader';

export default function NewListingStep4() {
  const router = useRouter();

  const handleSubmit = () => {
    router.replace('/(landlord)/(tabs)/listings' as any);
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      <ScreenHeader title="New Listing" showBack={true} centerTitle={true} />

      {/* Progress Bar */}
      <View className="h-1 w-full bg-line">
        <View className="h-full w-full bg-brand" />
      </View>

      <ScrollView className="px-6" contentContainerStyle={{ paddingTop: 20, paddingBottom: 100 }}>
        <Text className="mb-1 font-semibold text-h2 text-ink">Pricing & Review</Text>
        <Text className="mb-6 text-body text-ink2">
          Specify financial requirements and review details.
        </Text>

        {/* Monthly Rent */}
        <View className="mb-5">
          <Text className="mb-2 font-semibold text-body-sm text-ink">Monthly Rent (NPR)</Text>
          <TextInput
            placeholder="e.g. 35000"
            placeholderTextColor="#C0C0C0"
            keyboardType="numeric"
            className="h-[56px] rounded-lg border border-line bg-input px-4 font-sans text-body text-ink"
          />
        </View>

        {/* Security Deposit */}
        <View className="mb-5">
          <Text className="mb-2 font-semibold text-body-sm text-ink">Security Deposit (NPR)</Text>
          <TextInput
            placeholder="e.g. 70000"
            placeholderTextColor="#C0C0C0"
            keyboardType="numeric"
            className="h-[56px] rounded-lg border border-line bg-input px-4 font-sans text-body text-ink"
          />
        </View>

        {/* Availability */}
        <View className="mb-6">
          <Text className="mb-2 font-semibold text-body-sm text-ink">Available From</Text>
          <View className="rounded-card border border-line bg-input px-4 py-4">
            <Text className="text-body text-ink">Immediately</Text>
          </View>
        </View>

        {/* Preview Summary */}
        <Text className="mb-2 font-semibold text-body-sm text-ink">Review Listing Summary</Text>
        <View className="mb-6 rounded-card border border-line bg-bg p-4">
          <Text className="font-semibold text-body text-ink">Baluwatar Apartment</Text>
          <Text className="mt-1 text-caption text-ink2">2 BHK · 1 Bath · 1200 sq. ft.</Text>
          <Text className="mt-1 text-caption text-ink2">NPR 35,000/mo · Deposit NPR 70,000</Text>
        </View>
      </ScrollView>

      {/* Sticky Bottom */}
      <View className="absolute inset-x-6 bottom-6">
        <Pressable
          onPress={handleSubmit}
          className="h-[56px] items-center justify-center rounded-pill bg-brand">
          <Text className="font-semibold text-body text-white">Publish Listing</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
