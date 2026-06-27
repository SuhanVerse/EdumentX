import { ScrollView, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../src/components/layout/ScreenHeader';

export default function PreferencesScreen() {
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      <ScreenHeader title="Rental Preferences" showBack centerTitle />
      <ScrollView className="px-6" contentContainerStyle={{ paddingTop: 16, paddingBottom: 24 }}>
        <Text className="font-sans text-body text-ink2 mb-5">
          Set your preferences to help us find the best properties for you.
        </Text>

        {['Budget Range', 'Property Type', 'Bedrooms', 'Location', 'Move-in Date'].map((pref) => (
          <Pressable key={pref} className="flex-row items-center justify-between py-4 border-b border-row-divider">
            <Text className="font-medium text-body text-ink">{pref}</Text>
            <Text className="font-sans text-body-sm text-ink3">Set →</Text>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
