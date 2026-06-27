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
        <View className="rounded-card border border-line p-4 mb-5">
          <Text className="font-semibold text-body text-ink">Modern 2BHK in Thamel</Text>
          <Text className="font-sans text-body-sm text-ink2">Visit #{visitId}</Text>
        </View>

        {/* Star rating */}
        <Text className="font-semibold text-h3 text-ink mb-3">Your Rating</Text>
        <View className="flex-row mb-5">
          {[1, 2, 3, 4, 5].map((star) => (
            <Pressable key={star} className="mr-2">
              <Star size={32} color="#F5A623" fill={star <= 3 ? '#F5A623' : 'transparent'} />
            </Pressable>
          ))}
        </View>

        {/* Quick tags */}
        <Text className="font-semibold text-h3 text-ink mb-3">Quick Tags</Text>
        <View className="flex-row flex-wrap mb-5">
          {['Clean', 'Spacious', 'Good location', 'Responsive landlord', 'Value for money'].map((tag) => (
            <Pressable key={tag} className="mr-2 mb-2 rounded-pill bg-canvas px-3 py-1.5">
              <Text className="font-sans text-body-sm text-ink">{tag}</Text>
            </Pressable>
          ))}
        </View>

        {/* Textarea */}
        <Text className="font-semibold text-h3 text-ink mb-2">Your Review</Text>
        <TextInput
          placeholder="Share your experience..."
          multiline
          numberOfLines={6}
          maxLength={500}
          className="h-[140px] rounded-lg bg-input p-4 font-sans text-body text-ink"
          placeholderTextColor="#C0C0C0"
          textAlignVertical="top"
        />
        <Text className="font-sans text-caption text-ink3 mt-1">0/500</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
