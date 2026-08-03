import { ScrollView, View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LandlordNotificationsTab() {
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      {/* ── Header ────────────────────────────────────────── */}
      <View className="flex-row items-center justify-between border-b border-gray-200 px-4 pt-3 pb-3">
        <Text className="text-xl font-bold text-gray-900">Notifications</Text>
        <Pressable>
          <Text className="text-sm font-semibold text-brand">Mark all read</Text>
        </Pressable>
      </View>
      <ScrollView className="px-6" contentContainerStyle={{ paddingTop: 16, paddingBottom: 24 }}>
        {/* Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-5">
          {['All', 'Visits', 'Listings', 'System'].map((tab, i) => (
            <Pressable
              key={tab}
              className={`mr-2 rounded-pill px-4 py-2 ${i === 0 ? 'bg-ink' : 'bg-canvas'}`}>
              <Text className={`font-medium text-body-sm ${i === 0 ? 'text-white' : 'text-ink'}`}>
                {tab}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Today */}
        <Text className="mb-3 font-semibold text-body-sm text-ink3">Today</Text>
        {[
          {
            title: 'New Visit Request',
            desc: 'Aayush Shrestha requested a visit for Baluwatar Apartment.',
            time: '2h ago',
          },
          {
            title: 'Listing Approved',
            desc: 'Your listing "Jhamsikhel Flat" has been verified and published.',
            time: '5h ago',
          },
        ].map((item, i) => (
          <View key={i} className="mb-4 flex-row items-start border-b border-row-divider pb-4">
            <View className="mr-3 h-10 w-10 items-center justify-center rounded-pill bg-brand-light">
              <Text className="font-bold text-caption text-brand">L</Text>
            </View>
            <View className="flex-1">
              <Text className="font-semibold text-body text-ink">{item.title}</Text>
              <Text className="font-sans text-body-sm text-ink2">{item.desc}</Text>
              <Text className="mt-1 font-sans text-caption text-ink3">{item.time}</Text>
            </View>
            <View className="mt-2 h-2 w-2 rounded-pill bg-brand" />
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
