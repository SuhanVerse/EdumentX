import { ScrollView, View, Text, Pressable } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { Bell } from 'lucide-react-native';

import { ScreenBody } from '@/src/components/layout/ScreenBody';

export default function HomeTab() {
  const router = useRouter();

  return (
    <ScreenBody>
      <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingTop: 16 }}>
        {/* Header */}
        <View className="h-[56px] flex-row items-center justify-between">
          <Text className="font-display text-h2 text-ink">BasoBas</Text>
          <Link href={'/(tenant)/notifications' as any} asChild>
            <Pressable className="h-10 w-10 items-center justify-center rounded-pill bg-input">
              <Bell size={18} color="#0A0A0A" />
            </Pressable>
          </Link>
        </View>

        {/* City pill */}
        <Pressable className="mb-4 mt-4 self-start rounded-pill bg-canvas px-4 py-2">
          <Text className="font-medium text-body-sm text-ink">Kathmandu ▾</Text>
        </Pressable>

        {/* Search bar */}
        <Pressable
          onPress={() => router.push('/(tenant)/(tabs)/search' as any)}
          className="mb-6 h-[48px] flex-row items-center rounded-lg bg-input px-4">
          <Text className="font-sans text-body text-placeholder">Search properties...</Text>
        </Pressable>

        {/* Greeting */}
        <Text className="mb-1 font-display text-h2 text-ink">Good afternoon 👋</Text>
        <Text className="mb-5 font-sans text-body text-ink2">Find your next home.</Text>

        {/* Quick filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-5">
          {['All', '1 BHK', '2 BHK', '3 BHK', 'Studio', 'Flat'].map((chip) => (
            <Pressable key={chip} className="mr-2 rounded-pill bg-canvas px-4 py-2">
              <Text className="font-medium text-body-sm text-ink">{chip}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* AI Picks section */}
        <Text className="mb-3 font-semibold text-h3 text-ink">AI Picks for you</Text>
        <View className="mb-5 h-[180px] items-center justify-center rounded-card bg-canvas">
          <Text className="font-sans text-body-sm text-ink3">Property carousel placeholder</Text>
        </View>

        {/* Newly verified */}
        <Text className="mb-3 font-semibold text-h3 text-ink">Newly verified</Text>
        <View className="mb-5 h-[180px] items-center justify-center rounded-card bg-canvas">
          <Text className="font-sans text-body-sm text-ink3">Property carousel placeholder</Text>
        </View>

        {/* Browse by area */}
        <Text className="mb-3 font-semibold text-h3 text-ink">Browse by area</Text>
        <View className="flex-row flex-wrap">
          {['Thamel', 'Lazimpat', 'Baluwatar', 'Jhamsikhel'].map((area) => (
            <View
              key={area}
              className="mb-3 mr-3 h-[80px] w-[48%] items-center justify-center rounded-card bg-canvas">
              <Text className="font-medium text-body-sm text-ink">{area}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </ScreenBody>
  );
}
