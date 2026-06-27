import { ScrollView, View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../src/components/layout/ScreenHeader';
import { useAuth } from '../../src/store/authStore';

export default function SettingsScreen() {
  const { signOut } = useAuth();

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      <ScreenHeader title="Settings" showBack centerTitle />
      <ScrollView className="px-6" contentContainerStyle={{ paddingTop: 16, paddingBottom: 24 }}>
        <View className="rounded-card border border-line bg-bg">
          {['Notifications', 'Privacy', 'Language', 'Help & Support', 'Terms of Service', 'About'].map((item, i, arr) => (
            <Pressable key={item} className={`px-4 py-4 ${i < arr.length - 1 ? 'border-b border-row-divider' : ''}`}>
              <Text className="font-medium text-body text-ink">{item}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable onPress={signOut} className="mt-6 h-[56px] items-center justify-center rounded-pill border border-danger">
          <Text className="font-semibold text-body text-danger">Log Out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
