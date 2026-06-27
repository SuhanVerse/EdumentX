import { View, Text, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { X } from 'lucide-react-native';

export default function GalleryModal() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  return (
    <View className="flex-1 bg-black">
      <View className="flex-row items-center justify-between px-6 pt-14 pb-4">
        <Pressable onPress={() => router.back()}>
          <X size={24} color="#FFFFFF" />
        </Pressable>
        <Text className="font-semibold text-body text-white">1 / 12</Text>
        <View className="w-6" />
      </View>
      <View className="flex-1 items-center justify-center">
        <Text className="font-sans text-body text-white/50">Zoomable photo pager · Property {id}</Text>
      </View>
      {/* Thumbnail strip */}
      <View className="h-[80px] flex-row items-center px-6 pb-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <View key={i} className="mr-2 h-[56px] w-[56px] rounded-md bg-white/10" />
        ))}
      </View>
    </View>
  );
}
