import { ScrollView, View, Text, TextInput, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { ScreenHeader } from '../../../../src/components/layout/ScreenHeader';
import { Star } from 'lucide-react-native';

export default function WriteReviewScreen() {
  const { visitId } = useLocalSearchParams<{ visitId: string }>();

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      <ScreenHeader title="Write a Review" showBack centerTitle rightText={{ label: 'Submit' }} />
      <ScrollView className="px-6" contentContainerStyle={{ paddingTop: 16, paddingBottom: 100 }}>
        {/* Property card */}
        <View className="mb-5 rounded-card border border-line p-4">
          <Text className="font-semibold text-body text-ink">Modern 2BHK in Thamel</Text>
          <Text className="font-sans text-body-sm text-ink2">Visit #{visitId}</Text>
        </View>

        {/* Star rating */}
        <Text className="mb-3 font-semibold text-h3 text-ink">Your Rating</Text>
        <View className="mb-5 flex-row">
          {[1, 2, 3, 4, 5].map((star) => (
            <Pressable key={star} className="mr-2">
              <Star size={32} color="#F5A623" fill={star <= 3 ? '#F5A623' : 'transparent'} />
            </Pressable>
          ))}
        </View>

        {/* Quick tags */}
        <Text className="mb-3 font-semibold text-h3 text-ink">Quick Tags</Text>
        <View className="mb-5 flex-row flex-wrap">
          {['Clean', 'Spacious', 'Good location', 'Responsive landlord', 'Value for money'].map(
            (tag) => (
              <Pressable key={tag} className="mb-2 mr-2 rounded-pill bg-canvas px-3 py-1.5">
                <Text className="font-sans text-body-sm text-ink">{tag}</Text>
              </Pressable>
            )
          )}
        </View>

        {/* Textarea */}
        <Text className="mb-2 font-semibold text-h3 text-ink">Your Review</Text>
        <TextInput
          placeholder="Share your experience..."
          multiline
          numberOfLines={6}
          maxLength={500}
          className="h-[140px] rounded-lg bg-input p-4 font-sans text-body text-ink"
          placeholderTextColor="#C0C0C0"
          textAlignVertical="top"
        />
        <Text className="mt-1 font-sans text-caption text-ink3">0/500</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
