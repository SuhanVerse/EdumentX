import { ScrollView, View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenHeader } from '../../../src/components/layout/ScreenHeader';

export default function NotificationPrefsModal() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-bg">
      <View className="mb-1 mt-3 h-1.5 w-12 self-center rounded-full bg-line" />
      <ScreenHeader title="Notifications" showBack={true} centerTitle={true} />
      <ScrollView className="px-6" contentContainerStyle={{ paddingTop: 16, paddingBottom: 24 }}>
        <Text className="mb-6 text-body text-ink2">
          Choose how you want to be notified about visits, chats, and recommendations.
        </Text>

        <View className="mb-6 overflow-hidden rounded-card border border-line bg-bg">
          {[
            {
              title: 'Push Notifications',
              desc: 'Realtime updates for new visits & chats',
              value: true,
            },
            {
              title: 'Email Notifications',
              desc: 'Weekly digests, summary & activity log',
              value: false,
            },
            {
              title: 'SMS Notifications',
              desc: 'Urgent updates about scheduled visits',
              value: true,
            },
          ].map((item, i, arr) => (
            <View
              key={item.title}
              className={`flex-row items-center justify-between p-4 ${i < arr.length - 1 ? 'border-b border-row-divider' : ''}`}>
              <View className="flex-1 pr-4">
                <Text className="font-semibold text-body text-ink">{item.title}</Text>
                <Text className="mt-0.5 text-caption text-ink2">{item.desc}</Text>
              </View>
              <Pressable
                className={`h-7 w-12 justify-center rounded-pill p-0.5 ${item.value ? 'items-end bg-brand' : 'items-start bg-line'}`}>
                <View className="h-6 w-6 rounded-pill bg-white" />
              </Pressable>
            </View>
          ))}
        </View>

        <Pressable
          onPress={() => router.back()}
          className="h-[56px] items-center justify-center rounded-pill bg-brand">
          <Text className="font-semibold text-body text-white">Save Changes</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
