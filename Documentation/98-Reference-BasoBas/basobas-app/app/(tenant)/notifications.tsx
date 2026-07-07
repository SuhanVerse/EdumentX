import { ScrollView, View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../src/components/layout/ScreenHeader';

export default function NotificationsScreen() {
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      <ScreenHeader
        title="Notifications"
        showBack
        centerTitle
        rightText={{ label: 'Mark all read' }}
      />
      <ScrollView className="px-6" contentContainerStyle={{ paddingTop: 16, paddingBottom: 24 }}>
        {/* Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-5">
          {['All', 'Visits', 'Property', 'System'].map((tab, i) => (
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
        {[1, 2].map((i) => (
          <View key={i} className="mb-4 flex-row items-start border-b border-row-divider pb-4">
            <View className="mr-3 h-10 w-10 items-center justify-center rounded-pill bg-brand-light">
              <Text className="font-bold text-caption text-brand">V</Text>
            </View>
            <View className="flex-1">
              <Text className="font-semibold text-body text-ink">Visit Confirmed</Text>
              <Text className="font-sans text-body-sm text-ink2">
                Your visit to Modern 2BHK has been confirmed.
              </Text>
              <Text className="mt-1 font-sans text-caption text-ink3">2h ago</Text>
            </View>
            <View className="mt-2 h-2 w-2 rounded-pill bg-brand" />
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
