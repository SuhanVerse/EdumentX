import { ScrollView, View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ScreenHeader } from '../../src/components/layout/ScreenHeader';
import { Calendar, User } from 'lucide-react-native';

export default function LandlordVisitsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      <ScreenHeader title="Visit History" showBack={true} centerTitle={true} />
      <ScrollView className="px-6" contentContainerStyle={{ paddingTop: 16, paddingBottom: 24 }}>
        {[
          {
            id: '1',
            tenant: 'Aayush Shrestha',
            property: 'Baluwatar Apartment',
            date: 'June 15, 2026',
            time: '2:30 PM',
            status: 'Pending Approval',
          },
          {
            id: '2',
            tenant: 'Priya Adhikari',
            property: 'Jhamsikhel Flat',
            date: 'June 15, 2026',
            time: '4:00 PM',
            status: 'Scheduled',
          },
          {
            id: '3',
            tenant: 'Rohan Thapa',
            property: 'Lazimpat Studio',
            date: 'June 10, 2026',
            time: '11:00 AM',
            status: 'Completed',
          },
          {
            id: '4',
            tenant: 'Binod Karki',
            property: 'Baluwatar Apartment',
            date: 'June 05, 2026',
            time: '1:00 PM',
            status: 'Cancelled',
          },
        ].map((visit) => (
          <Pressable
            key={visit.id}
            onPress={() => {
              if (visit.status === 'Pending Approval') {
                router.push({
                  pathname: '/(landlord)/request/[id]',
                  params: { id: visit.id },
                } as any);
              }
            }}
            className="mb-4 rounded-card border border-line bg-bg p-4">
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="font-semibold text-body text-ink">{visit.property}</Text>
              <View
                className={`rounded-pill px-2.5 py-0.5 ${
                  visit.status === 'Completed'
                    ? 'bg-green-100'
                    : visit.status === 'Scheduled'
                      ? 'bg-blue-100'
                      : visit.status === 'Cancelled'
                        ? 'bg-red-100'
                        : 'bg-amber-100'
                }`}>
                <Text
                  className={`font-semibold text-[11px] ${
                    visit.status === 'Completed'
                      ? 'text-green-800'
                      : visit.status === 'Scheduled'
                        ? 'text-blue-800'
                        : visit.status === 'Cancelled'
                          ? 'text-red-800'
                          : 'text-amber-800'
                  }`}>
                  {visit.status}
                </Text>
              </View>
            </View>

            <View className="mb-1.5 flex-row items-center gap-1.5">
              <User size={14} color="#6B6B6B" />
              <Text className="text-body-sm text-ink2">{visit.tenant}</Text>
            </View>

            <View className="flex-row items-center gap-1.5">
              <Calendar size={14} color="#6B6B6B" />
              <Text className="text-body-sm text-ink2">
                {visit.date} at {visit.time}
              </Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
