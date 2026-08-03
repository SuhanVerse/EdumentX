import { ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../src/components/layout/ScreenHeader';

export default function SavedScreen() {
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      <ScreenHeader title="Saved Properties" showBack centerTitle />
      <ScrollView className="px-6" contentContainerStyle={{ paddingTop: 16, paddingBottom: 120 }}>
        <Text className="mt-20 text-center font-sans text-body text-ink2">
          No saved properties yet. Tap the heart icon on any property to save it.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
