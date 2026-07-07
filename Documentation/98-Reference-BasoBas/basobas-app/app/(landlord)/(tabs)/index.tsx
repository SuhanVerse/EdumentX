import { ScrollView, View, Text, Pressable } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { Bell, Plus, Check, X } from 'lucide-react-native';

import { ScreenBody } from '@/src/components/layout/ScreenBody';

export default function LandlordDashboard() {
  const router = useRouter();

  return (
    <ScreenBody>
      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 120 }}>
        {/* Header */}
        <View className="h-[56px] flex-row items-center justify-between">
          <Text className="font-display text-h2 text-ink">BasoBas</Text>
          <Link href={'/(landlord)/notifications' as any} asChild>
            <Pressable className="h-10 w-10 items-center justify-center rounded-pill bg-input">
              <Bell size={18} color="#0A0A0A" />
            </Pressable>
          </Link>
        </View>

        {/* Greeting */}
        <Text className="mb-1 mt-4 font-display text-h2 text-ink">Welcome back 👋</Text>
        <Text className="mb-6 font-sans text-body text-ink2">
          Manage your properties and requests.
        </Text>

        {/* Stats Row */}
        <View className="mb-6 flex-row gap-3">
          {[
            { label: 'Active Listings', value: '8' },
            { label: 'Pending Visits', value: '4' },
            { label: 'Total Earned', value: 'NPR 180K' },
          ].map((stat) => (
            <View key={stat.label} className="flex-1 rounded-card border border-line bg-bg p-4">
              <Text className="font-bold text-h2 text-brand">{stat.value}</Text>
              <Text className="mt-1 text-caption text-ink2">{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Add New Listing button */}
        <Pressable
          onPress={() => router.push('/(landlord)/listing/new/step-1' as any)}
          className="mb-6 h-[56px] flex-row items-center justify-center rounded-pill bg-brand">
          <Plus size={20} color="#FFFFFF" />
          <Text className="ml-2 font-semibold text-body text-white">Add New Listing</Text>
        </Pressable>

        {/* Today's Visits Section */}
        <Text className="mb-3 font-semibold text-h3 text-ink">{"Today's Visits"}</Text>
        <View className="mb-6 rounded-card border border-line bg-bg p-4">
          <View className="flex-row items-center justify-between border-b border-row-divider pb-3">
            <View>
              <Text className="font-semibold text-body text-ink">Aayush Shrestha</Text>
              <Text className="text-caption text-ink2">Baluwatar Apartment · 2:30 PM</Text>
            </View>
            <View className="flex-row gap-2">
              <Pressable className="h-8 w-8 items-center justify-center rounded-full bg-brand-light">
                <Check size={16} color="#1A6B4A" />
              </Pressable>
              <Pressable className="h-8 w-8 items-center justify-center rounded-full bg-danger-bg">
                <X size={16} color="#E53E3E" />
              </Pressable>
            </View>
          </View>
          <View className="flex-row items-center justify-between pt-3">
            <View>
              <Text className="font-semibold text-body text-ink">Priya Adhikari</Text>
              <Text className="text-caption text-ink2">Jhamsikhel Flat · 4:00 PM</Text>
            </View>
            <View className="flex-row gap-2">
              <Pressable className="h-8 w-8 items-center justify-center rounded-full bg-brand-light">
                <Check size={16} color="#1A6B4A" />
              </Pressable>
              <Pressable className="h-8 w-8 items-center justify-center rounded-full bg-danger-bg">
                <X size={16} color="#E53E3E" />
              </Pressable>
            </View>
          </View>
        </View>

        {/* Performance Bar Charts placeholder */}
        <Text className="mb-3 font-semibold text-h3 text-ink">Listing Performance</Text>
        <View className="rounded-card border border-line bg-bg p-4">
          <View className="mb-3">
            <View className="mb-1 flex-row justify-between">
              <Text className="font-medium text-body-sm text-ink">Baluwatar Apartment</Text>
              <Text className="text-body-sm text-ink2">142 views</Text>
            </View>
            <View className="h-2 w-full rounded bg-line">
              <View className="h-2 w-4/5 rounded bg-brand" />
            </View>
          </View>
          <View>
            <View className="mb-1 flex-row justify-between">
              <Text className="font-medium text-body-sm text-ink">Jhamsikhel Flat</Text>
              <Text className="text-body-sm text-ink2">98 views</Text>
            </View>
            <View className="h-2 w-full rounded bg-line">
              <View className="h-2 w-3/5 rounded bg-brand" />
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenBody>
  );
}
