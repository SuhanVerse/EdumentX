import { ScrollView, View, Text, Pressable, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ScreenHeader } from '../../../../src/components/layout/ScreenHeader';
import { Image, Upload } from 'lucide-react-native';

export default function NewListingStep3() {
  const router = useRouter();

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      <ScreenHeader title="New Listing" showBack={true} centerTitle={true} />

      {/* Progress Bar */}
      <View className="h-1 w-full bg-line">
        <View className="h-full w-3/4 bg-brand" />
      </View>

      <ScrollView className="px-6" contentContainerStyle={{ paddingTop: 20, paddingBottom: 100 }}>
        <Text className="mb-1 font-semibold text-h2 text-ink">Photos & Details</Text>
        <Text className="mb-6 text-body text-ink2">
          Upload high quality photos and describe the amenities.
        </Text>

        {/* Photos Upload Grid */}
        <View className="mb-6">
          <Text className="mb-2 font-semibold text-body-sm text-ink">Upload Photos (Max 12)</Text>
          <View className="flex-row gap-3">
            <Pressable className="h-24 flex-1 items-center justify-center rounded-card border-2 border-dashed border-line bg-input">
              <Upload size={20} color="#6B6B6B" />
              <Text className="mt-1 text-caption text-ink2">Upload</Text>
            </Pressable>
            <View className="h-24 flex-1 items-center justify-center rounded-card bg-canvas">
              <Image size={20} color="#AAAAAA" />
            </View>
            <View className="h-24 flex-1 items-center justify-center rounded-card bg-canvas">
              <Image size={20} color="#AAAAAA" />
            </View>
          </View>
        </View>

        {/* Description Textarea */}
        <View className="mb-6">
          <Text className="mb-2 font-semibold text-body-sm text-ink">Property Description</Text>
          <TextInput
            placeholder="Write a descriptive overview of the property, surroundings, and rental conditions..."
            placeholderTextColor="#C0C0C0"
            multiline={true}
            numberOfLines={4}
            className="h-[120px] rounded-lg border border-line bg-input p-4 font-sans text-body text-ink"
            style={{ textAlignVertical: 'top' }}
          />
        </View>

        {/* Amenities Selection */}
        <View className="mb-6">
          <Text className="mb-3 font-semibold text-body-sm text-ink">Amenities</Text>
          <View className="flex-row flex-wrap gap-2">
            {['Wifi', 'AC', 'Parking', 'Gym', 'Security', 'Power Backup'].map((amenity) => (
              <Pressable key={amenity} className="rounded-pill border border-line bg-bg px-4 py-2">
                <Text className="font-medium text-body-sm text-ink2">{amenity}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* House Rules */}
        <View className="mb-6">
          <Text className="mb-3 font-semibold text-body-sm text-ink">House Rules</Text>
          <View className="flex-row flex-wrap gap-2">
            {['No Smoking', 'No Pets', 'Family Only', 'Veg Only'].map((rule) => (
              <Pressable key={rule} className="rounded-pill border border-line bg-bg px-4 py-2">
                <Text className="font-medium text-body-sm text-ink2">{rule}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom */}
      <View className="absolute inset-x-6 bottom-6">
        <Pressable
          onPress={() => router.push('/(landlord)/listing/new/step-4' as any)}
          className="h-[56px] items-center justify-center rounded-pill bg-brand">
          <Text className="font-semibold text-body text-white">Continue</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
