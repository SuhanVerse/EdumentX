import { ScrollView, View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { ScreenHeader } from '../../../src/components/layout/ScreenHeader';

export default function ScheduleVisitScreen() {
  const { propertyId } = useLocalSearchParams<{ propertyId: string }>();

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      <ScreenHeader title="Schedule Visit" showBack centerTitle />
      <ScrollView className="px-6" contentContainerStyle={{ paddingTop: 16, paddingBottom: 100 }}>
        {/* Property summary card */}
        <View className="rounded-card border border-line p-4 mb-5">
          <Text className="font-semibold text-body text-ink">Modern 2BHK in Thamel</Text>
          <Text className="font-sans text-body-sm text-ink2">Property {propertyId}</Text>
        </View>

        {/* Date strip */}
        <Text className="font-semibold text-h3 text-ink mb-3">Select Date</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-5">
          {Array.from({ length: 14 }).map((_, i) => (
            <Pressable
              key={i}
              className={`mr-2 h-[72px] w-[56px] items-center justify-center rounded-lg ${i === 2 ? 'bg-ink' : 'bg-canvas'}`}
            >
              <Text className={`font-medium text-caption ${i === 2 ? 'text-white' : 'text-ink2'}`}>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i % 7]}
              </Text>
              <Text className={`font-bold text-body ${i === 2 ? 'text-white' : 'text-ink'}`}>
                {15 + i}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Time grid */}
        <Text className="font-semibold text-h3 text-ink mb-3">Select Time</Text>
        <View className="flex-row flex-wrap mb-5">
          {['9:00 AM', '10:00 AM', '11:00 AM', '1:00 PM', '2:00 PM', '3:00 PM'].map((time, i) => (
            <Pressable
              key={time}
              className={`mr-2 mb-2 rounded-lg px-4 py-3 ${i === 1 ? 'bg-ink' : 'bg-canvas'}`}
            >
              <Text className={`font-medium text-body-sm ${i === 1 ? 'text-white' : 'text-ink'}`}>{time}</Text>
            </Pressable>
          ))}
        </View>

        {/* Visit type */}
        <Text className="font-semibold text-h3 text-ink mb-3">Visit Type</Text>
        <View className="flex-row mb-5">
          <Pressable className="flex-1 mr-2 items-center rounded-lg bg-ink py-3">
            <Text className="font-medium text-body-sm text-white">In-person</Text>
          </Pressable>
          <Pressable className="flex-1 items-center rounded-lg bg-canvas py-3">
            <Text className="font-medium text-body-sm text-ink">Video</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Sticky CTA */}
      <View className="absolute bottom-0 left-0 right-0 border-t border-line bg-bg px-6 py-4">
        <Pressable className="h-[56px] items-center justify-center rounded-pill bg-ink">
          <Text className="font-semibold text-body text-white">Request Visit</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
