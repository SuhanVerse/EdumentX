import { ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../../src/components/layout/ScreenHeader';

export default function MyReviewsScreen() {
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      <ScreenHeader title="My Reviews" showBack centerTitle />
      <ScrollView className="px-6" contentContainerStyle={{ paddingTop: 16, paddingBottom: 24 }}>
        <Text className="mt-20 text-center font-sans text-body text-ink2">
          No reviews written yet.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
