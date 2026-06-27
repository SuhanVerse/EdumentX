import { ScrollView, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { ScreenHeader } from '../../../src/components/layout/ScreenHeader';

export default function PublicLandlordProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      <ScreenHeader title="Landlord Profile" showBack centerTitle />
      <ScrollView className="px-6" contentContainerStyle={{ paddingTop: 16, paddingBottom: 100 }}>
        <View className="items-center mb-5">
          <View className="h-[80px] w-[80px] rounded-pill bg-canvas items-center justify-center mb-3">
            <Text className="font-sans text-h1 text-ink3">L</Text>
          </View>
          <Text className="font-semibold text-h3 text-ink">Ram Sharma</Text>
          <Text className="font-sans text-body-sm text-ink2">Landlord #{id}</Text>
          <View className="mt-2 rounded-pill bg-brand-light px-3 py-1">
            <Text className="font-medium text-caption text-brand">✓ Verified</Text>
          </View>
        </View>

        <View className="flex-row justify-around rounded-card bg-canvas p-4 mb-5">
          {[['5', 'Properties'], ['4.8', 'Rating'], ['32', 'Reviews']].map(([val, label]) => (
            <View key={label} className="items-center">
              <Text className="font-bold text-body text-ink">{val}</Text>
              <Text className="font-sans text-caption text-ink2">{label}</Text>
            </View>
          ))}
        </View>

        <Text className="font-semibold text-h3 text-ink mb-3">Active Listings</Text>
        <View className="h-[120px] rounded-card bg-canvas items-center justify-center mb-5">
          <Text className="font-sans text-body-sm text-ink3">Listings carousel placeholder</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
