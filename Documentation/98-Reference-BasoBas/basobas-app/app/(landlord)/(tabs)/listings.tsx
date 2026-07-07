import { ScrollView, View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { MoreVertical, Star } from 'lucide-react-native';

import { ScreenBody } from '@/src/components/layout/ScreenBody';
import { ScreenHeader } from '@/src/components/layout/ScreenHeader';

export default function ListingsTab() {
  const router = useRouter();

  return (
    <ScreenBody>
      <ScreenHeader
        title="My Listings"
        rightText={{
          label: 'Add',
          onPress: () => router.push('/(landlord)/listing/new/step-1' as any),
        }}
      />

      {/* Toolbar Status Chips */}
      <View className="border-b border-line px-6 py-3">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
          {['All (8)', 'Active (6)', 'Drafts (1)', 'Paused (1)'].map((status, i) => (
            <Pressable
              key={status}
              className={`mr-2 rounded-pill px-4 py-2 ${i === 0 ? 'bg-brand' : 'bg-canvas'}`}>
              <Text className={`font-medium text-body-sm ${i === 0 ? 'text-white' : 'text-ink'}`}>
                {status}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 120 }}>
        {/* 2-column PropertyCard grid */}
        <View className="flex-row flex-wrap justify-between">
          {[
            {
              id: '1',
              title: 'Baluwatar Apartment',
              price: 'NPR 45,000/mo',
              rating: '4.8',
              status: 'Active',
            },
            {
              id: '2',
              title: 'Jhamsikhel Flat',
              price: 'NPR 65,000/mo',
              rating: '4.9',
              status: 'Active',
            },
            {
              id: '3',
              title: 'Lazimpat Studio',
              price: 'NPR 25,000/mo',
              rating: '4.6',
              status: 'Active',
            },
            {
              id: '4',
              title: 'Thamel Room',
              price: 'NPR 15,000/mo',
              rating: '4.2',
              status: 'Paused',
            },
          ].map((item) => (
            <Pressable
              key={item.id}
              onPress={() =>
                router.push({
                  pathname: '/(landlord)/listing/[id]',
                  params: { id: item.id },
                } as any)
              }
              className="mb-4 w-[48%] overflow-hidden rounded-card border border-line bg-bg">
              {/* Photo Area placeholder */}
              <View className="relative h-28 items-center justify-center bg-canvas">
                <View className="absolute left-2 top-2 rounded bg-brand px-1.5 py-0.5">
                  <Text className="font-semibold text-[10px] text-white">{item.status}</Text>
                </View>
                <Pressable className="absolute right-2 top-2 h-7 w-7 items-center justify-center rounded-full bg-white/85">
                  <MoreVertical size={14} color="#0A0A0A" />
                </Pressable>
                <Text className="text-[10px] text-ink3">Property Image</Text>
              </View>

              <View className="p-3">
                <Text numberOfLines={1} className="font-semibold text-body-sm text-ink">
                  {item.title}
                </Text>
                <Text className="mt-0.5 text-caption text-ink2">{item.price}</Text>
                <View className="mt-2 flex-row items-center gap-1">
                  <Star size={12} color="#F5A623" fill="#F5A623" />
                  <Text className="font-medium text-caption text-ink">{item.rating}</Text>
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </ScreenBody>
  );
}
