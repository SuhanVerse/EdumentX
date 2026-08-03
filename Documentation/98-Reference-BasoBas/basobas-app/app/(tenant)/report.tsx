import { ScrollView, View, Text, TextInput, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../src/components/layout/ScreenHeader';

export default function ReportScreen() {
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      <ScreenHeader title="Report" showBack centerTitle />
      <ScrollView className="px-6" contentContainerStyle={{ paddingTop: 16, paddingBottom: 100 }}>
        <Text className="mb-3 font-semibold text-h3 text-ink">Select a reason</Text>
        {['Inaccurate listing', 'Suspicious activity', 'Harassment', 'Scam', 'Other'].map(
          (reason, i) => (
            <Pressable
              key={reason}
              className={`flex-row items-center py-4 ${i < 4 ? 'border-b border-row-divider' : ''}`}>
              <View className="mr-3 h-5 w-5 rounded-pill border-2 border-line" />
              <Text className="font-sans text-body text-ink">{reason}</Text>
            </Pressable>
          )
        )}

        <Text className="mb-2 mt-5 font-semibold text-h3 text-ink">Details</Text>
        <TextInput
          placeholder="Describe the issue..."
          multiline
          numberOfLines={4}
          className="mb-4 h-[100px] rounded-lg bg-input p-4 font-sans text-body text-ink"
          placeholderTextColor="#C0C0C0"
          textAlignVertical="top"
        />

        <Text className="mb-2 font-semibold text-h3 text-ink">Evidence</Text>
        <View className="h-[80px] items-center justify-center rounded-card border-2 border-dashed border-line bg-canvas">
          <Text className="font-medium text-body-sm text-ink2">Upload photos</Text>
        </View>
      </ScrollView>
      <View className="absolute bottom-0 left-0 right-0 border-t border-line bg-bg px-6 py-4">
        <Pressable className="h-[56px] items-center justify-center rounded-pill bg-ink">
          <Text className="font-semibold text-body text-white">Submit Report</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
