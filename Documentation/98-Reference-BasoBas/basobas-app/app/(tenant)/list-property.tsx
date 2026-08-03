import { ScrollView, View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../src/components/layout/ScreenHeader';

export default function ListPropertyScreen() {
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      <ScreenHeader title="Become a Landlord" showBack centerTitle />
      <ScrollView className="px-6" contentContainerStyle={{ paddingTop: 16, paddingBottom: 100 }}>
        <View className="mt-10 items-center">
          <Text className="mb-2 text-center font-display text-h1 text-ink">List your property</Text>
          <Text className="mb-8 text-center font-sans text-body text-ink2">
            Start earning by listing your property on BasoBas. Reach thousands of verified tenants.
          </Text>
          <View className="w-full">
            {[
              'Create your listing',
              'Get verified tenants',
              'Manage visits easily',
              'Track performance',
            ].map((item, i) => (
              <View key={item} className="mb-4 flex-row items-center">
                <View className="mr-3 h-8 w-8 items-center justify-center rounded-pill bg-brand-light">
                  <Text className="font-bold text-caption text-brand">{i + 1}</Text>
                </View>
                <Text className="font-medium text-body text-ink">{item}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
      <View className="absolute bottom-0 left-0 right-0 border-t border-line bg-bg px-6 py-4">
        <Pressable className="h-[56px] items-center justify-center rounded-pill bg-ink">
          <Text className="font-semibold text-body text-white">Get Started</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
