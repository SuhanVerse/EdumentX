import { ScrollView, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { ScreenHeader } from '../../../src/components/layout/ScreenHeader';

export default function VisitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      <ScreenHeader title="Visit Detail" showBack centerTitle />
      <ScrollView className="px-6" contentContainerStyle={{ paddingTop: 16, paddingBottom: 24 }}>
        {/* Status banner */}
        <View className="rounded-lg bg-brand-light px-4 py-3 mb-4">
          <Text className="font-semibold text-body text-brand">Confirmed</Text>
        </View>

        {/* Property card */}
        <View className="rounded-card border border-line p-4 mb-4">
          <Text className="font-semibold text-body text-ink">Modern 2BHK in Thamel</Text>
          <Text className="font-sans text-body-sm text-ink2">Visit #{id}</Text>
        </View>

        {/* Date/time */}
        <View className="rounded-card bg-canvas p-4 mb-4">
          <Text className="font-semibold text-body text-ink mb-1">Wednesday, June 18</Text>
          <Text className="font-sans text-body-sm text-ink2">10:00 AM · In-person</Text>
        </View>

        {/* Landlord */}
        <View className="flex-row items-center rounded-card border border-line p-4">
          <View className="h-12 w-12 rounded-pill bg-canvas items-center justify-center mr-3">
            <Text className="font-sans text-body text-ink3">L</Text>
          </View>
          <View>
            <Text className="font-semibold text-body text-ink">Ram Sharma</Text>
            <Text className="font-sans text-body-sm text-ink2">Landlord</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
