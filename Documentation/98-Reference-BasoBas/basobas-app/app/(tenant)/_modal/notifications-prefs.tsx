import { ScrollView, View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenHeader } from '../../../src/components/layout/ScreenHeader';

export default function NotificationPrefsModal() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-bg">
      <View className="h-1.5 w-12 self-center rounded-full bg-line mt-3 mb-1" />
      <ScreenHeader title="Notifications" showBack={true} centerTitle={true} />
      <ScrollView className="px-6" contentContainerStyle={{ paddingTop: 16, paddingBottom: 24 }}>
        <Text className="text-body text-ink2 mb-6">
          Choose how you want to be notified about visits, chats, and recommendations.
        </Text>

        <View className="rounded-card border border-line bg-bg overflow-hidden mb-6">
          {[
            { title: 'Push Notifications', desc: 'Realtime updates for new visits & chats', value: true },
            { title: 'Email Notifications', desc: 'Weekly digests, summary & activity log', value: false },
            { title: 'SMS Notifications', desc: 'Urgent updates about scheduled visits', value: true },
          ].map((item, i, arr) => (
            <View key={item.title} className={`p-4 flex-row items-center justify-between ${i < arr.length - 1 ? 'border-b border-row-divider' : ''}`}>
              <View className="flex-1 pr-4">
                <Text className="font-semibold text-body text-ink">{item.title}</Text>
                <Text className="text-caption text-ink2 mt-0.5">{item.desc}</Text>
              </View>
              <Pressable className={`h-7 w-12 rounded-pill p-0.5 justify-center ${item.value ? 'bg-brand items-end' : 'bg-line items-start'}`}>
                <View className="h-6 w-6 rounded-pill bg-white" />
              </Pressable>
            </View>
          ))}
        </View>

        <Pressable onPress={() => router.back()} className="h-[56px] items-center justify-center rounded-pill bg-brand">
          <Text className="font-semibold text-body text-white">Save Changes</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
