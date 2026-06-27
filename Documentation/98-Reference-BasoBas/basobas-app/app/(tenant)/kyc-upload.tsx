import { ScrollView, View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../src/components/layout/ScreenHeader';

export default function KYCUploadScreen() {
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      <ScreenHeader title="KYC Upload" showBack centerTitle />
      <ScrollView className="px-6" contentContainerStyle={{ paddingTop: 16, paddingBottom: 100 }}>
        <Text className="font-semibold text-h3 text-ink mb-2">Verify your identity</Text>
        <Text className="font-sans text-body-sm text-ink2 mb-6">
          Upload your documents to complete verification.
        </Text>
        <View className="h-[120px] items-center justify-center rounded-card border-2 border-dashed border-line bg-canvas mb-4">
          <Text className="font-medium text-body-sm text-ink2">Upload ID Document</Text>
        </View>
      </ScrollView>
      <View className="absolute bottom-0 left-0 right-0 border-t border-line bg-bg px-6 py-4">
        <Pressable className="h-[56px] items-center justify-center rounded-pill bg-ink">
          <Text className="font-semibold text-body text-white">Submit</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
