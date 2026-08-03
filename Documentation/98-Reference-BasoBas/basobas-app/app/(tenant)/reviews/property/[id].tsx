import { ScrollView, View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { ScreenHeader } from '../../../../src/components/layout/ScreenHeader';

export default function PropertyReviewsScreen() {
  const { id: _id } = useLocalSearchParams<{ id: string }>();

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      <ScreenHeader title="62 Reviews" showBack centerTitle />
      <ScrollView className="px-6" contentContainerStyle={{ paddingTop: 16, paddingBottom: 24 }}>
        {/* Rating summary */}
        <View className="mb-5 items-center rounded-card bg-canvas p-4">
          <Text className="font-bold text-[40px] text-ink">4.5</Text>
          <Text className="font-sans text-body-sm text-ink2">out of 5 · 62 reviews</Text>
        </View>

        {/* Filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-5">
          {['All', '5★', '4★', '3★', 'With photos'].map((chip, i) => (
            <Pressable
              key={chip}
              className={`mr-2 rounded-pill px-4 py-2 ${i === 0 ? 'bg-ink' : 'bg-canvas'}`}>
              <Text className={`font-medium text-body-sm ${i === 0 ? 'text-white' : 'text-ink'}`}>
                {chip}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Reviews list */}
        {[1, 2, 3].map((i) => (
          <View key={i} className="mb-4 rounded-card border border-line p-4">
            <View className="mb-2 flex-row items-center">
              <View className="mr-3 h-10 w-10 items-center justify-center rounded-pill bg-canvas">
                <Text className="font-sans text-body-sm text-ink3">T</Text>
              </View>
              <View>
                <Text className="font-semibold text-body text-ink">Tenant {i}</Text>
                <Text className="font-sans text-caption text-ink3">2 weeks ago</Text>
              </View>
            </View>
            <Text className="font-sans text-body text-ink2">
              Great property in a prime location. The landlord is very responsive and the apartment
              is well maintained.
            </Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
