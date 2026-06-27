import { ScrollView, View, Text, TextInput, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../src/components/layout/ScreenHeader';

export default function EditProfileScreen() {
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      <ScreenHeader title="Edit Profile" showBack centerTitle rightText={{ label: 'Save' }} />
      <ScrollView className="px-6" contentContainerStyle={{ paddingTop: 16, paddingBottom: 24 }}>
        {/* Avatar */}
        <View className="items-center mb-6">
          <View className="h-[80px] w-[80px] rounded-pill bg-canvas items-center justify-center">
            <Text className="font-sans text-h1 text-ink3">U</Text>
          </View>
          <Pressable className="mt-2">
            <Text className="font-medium text-body-sm text-brand">Change Photo</Text>
          </Pressable>
        </View>

        {[['Full Name', 'John Doe'], ['Email', 'john@example.com'], ['Phone', '+977 98XXXXXXXX'], ['Bio', 'Tell us about yourself']].map(([label, placeholder]) => (
          <View key={label} className="mb-4">
            <Text className="font-medium text-body-sm text-ink2 mb-1">{label}</Text>
            <TextInput
              placeholder={placeholder}
              className="h-[56px] rounded-lg bg-input px-4 font-sans text-body text-ink"
              placeholderTextColor="#C0C0C0"
            />
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
