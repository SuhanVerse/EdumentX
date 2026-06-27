import { ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../src/components/layout/ScreenHeader';

export default function AIPreferencesScreen() {
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      <ScreenHeader title="AI Preferences" showBack centerTitle />
      <ScrollView className="px-6" contentContainerStyle={{ paddingTop: 16, paddingBottom: 24 }}>
        <Text className="font-sans text-body text-ink2">
          Customize how our AI matches potential tenants to your listings. Fine-tune tenant filters, preferences, and automated replies.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
