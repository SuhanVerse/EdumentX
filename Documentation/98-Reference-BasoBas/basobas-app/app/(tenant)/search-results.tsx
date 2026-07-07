import { ScrollView, View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { SlidersHorizontal } from 'lucide-react-native';

export default function SearchResultsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      <View className="h-[56px] flex-row items-center justify-between border-b border-line px-6">
        <Pressable
          onPress={() => router.back()}
          className="h-11 w-11 items-center justify-center rounded-pill bg-input">
          <Text className="font-semibold text-body text-ink">←</Text>
        </Pressable>
        <View className="mx-3 h-[40px] flex-1 justify-center rounded-lg bg-input px-3">
          <Text className="font-sans text-body-sm text-ink">Kathmandu apartments</Text>
        </View>
        <Pressable
          onPress={() => router.push('/(tenant)/_modal/filter' as any)}
          className="h-10 w-10 items-center justify-center rounded-pill bg-input">
          <SlidersHorizontal size={18} color="#0A0A0A" />
        </Pressable>
      </View>

      {/* Toolbar */}
      <View className="flex-row items-center justify-between px-6 py-3">
        <Text className="font-sans text-body-sm text-ink2">240 properties</Text>
        <View className="flex-row">
          <Pressable className="mr-2 rounded-pill bg-canvas px-3 py-1">
            <Text className="font-medium text-caption text-ink">Sort ▾</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/(tenant)/map' as any)}
            className="rounded-pill bg-canvas px-3 py-1">
            <Text className="font-medium text-caption text-ink">Map</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView className="px-6" contentContainerStyle={{ paddingBottom: 120 }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Pressable
            key={i}
            onPress={() => router.push(`/(tenant)/property/${i}` as any)}
            className="mb-4 overflow-hidden rounded-card border border-line bg-bg">
            <View className="h-[160px] items-center justify-center bg-canvas">
              <Text className="font-sans text-body-sm text-ink3">Photo</Text>
            </View>
            <View className="p-4">
              <Text className="mb-1 font-semibold text-body text-ink">
                Beautiful Apartment in Thamel
              </Text>
              <Text className="mb-1 font-sans text-body-sm text-ink2">Thamel, Kathmandu</Text>
              <Text className="font-bold text-body text-brand">NPR 25,000/mo</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
