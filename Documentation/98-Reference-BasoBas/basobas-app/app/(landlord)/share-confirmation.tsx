import { useState } from 'react';
import { Alert, ScrollView, View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, CheckCircle2, MapPin, Phone, Calendar, ShieldX } from 'lucide-react-native';

export default function ShareConfirmationScreen() {
  const router = useRouter();
  const [locationShared] = useState(true);
  const [contactShared] = useState(true);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-white">
      {/* ── Header Bar ──────────────────────────────────── */}
      <View className="mb-4 flex-row items-center justify-between border-b border-gray-100 bg-white py-3">
        <Pressable onPress={() => router.back()} className="ml-4 h-8 w-8 items-center justify-center">
          <ChevronLeft size={22} color="#000000" />
        </Pressable>
        <Text className="self-center text-base font-bold text-gray-900">Details Sent</Text>
        <View className="mr-4 w-6" />
      </View>

      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 120 }}>
        {/* ── Success Header ──────────────────────────────── */}
        <View className="mb-6 items-center pt-4">
          <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-[#E6F4EA]">
            <CheckCircle2 size={32} color="#137333" />
          </View>
          <Text className="mb-1 text-2xl font-extrabold tracking-tight text-gray-900">
            Sent to Sandeep
          </Text>
          <Text className="text-sm font-medium leading-snug text-gray-500">
            Details will be available for the visit window.
          </Text>
        </View>

        {/* ── Visit Summary Card ─────────────────────────── */}
        <View className="mb-6 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <Text className="mb-4 text-base font-bold text-gray-900">Visit Summary</Text>

          {/* Visit Time */}
          <View className="mb-4 flex-row items-center gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-[#F3F4F6]">
              <Calendar size={18} color="#6B7280" />
            </View>
            <View className="flex-1">
              <Text className="text-xs font-medium text-gray-500">Visit time</Text>
              <Text className="mt-0.5 text-sm font-bold text-gray-900">
                Tomorrow, June 16 · 4:00 PM - 5:00 PM
              </Text>
            </View>
          </View>

          <View className="mb-4 ml-1 h-px bg-gray-100" />

          {/* Location Shared */}
          <View className="mb-4 flex-row items-center gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-[#E6F4EA]">
              <MapPin size={18} color="#137333" />
            </View>
            <View className="flex-1">
              <Text className="text-xs font-medium text-gray-500">Location</Text>
              <Text className="mt-0.5 text-sm font-bold text-gray-900">
                Baluwatar Heights, Block B
              </Text>
            </View>
            {locationShared && (
              <View className="rounded-full bg-[#E6F4EA] px-3 py-1">
                <Text className="text-xs font-semibold text-[#137333]">Shared</Text>
              </View>
            )}
          </View>

          <View className="mb-4 ml-1 h-px bg-gray-100" />

          {/* Contact Shared */}
          <View className="flex-row items-center gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-[#E6F4EA]">
              <Phone size={18} color="#137333" />
            </View>
            <View className="flex-1">
              <Text className="text-xs font-medium text-gray-500">Contact</Text>
              <Text className="mt-0.5 text-sm font-bold text-gray-900">
                +977 98XX-XX1234
              </Text>
            </View>
            {contactShared && (
              <View className="rounded-full bg-[#E6F4EA] px-3 py-1">
                <Text className="text-xs font-semibold text-[#137333]">Shared</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Recipient Reminder ─────────────────────────── */}
        <View className="mb-6 flex-row items-center gap-3 rounded-2xl border border-gray-100/60 bg-[#F9FAFB] p-3.5">
          <View className="h-9 w-9 items-center justify-center rounded-full bg-gray-200/70">
            <Text className="text-xs font-bold text-gray-500">SK</Text>
          </View>
          <Text className="text-sm font-semibold text-gray-700">
            Shared with <Text className="font-bold text-gray-900">Sandeep Khatri</Text>
          </Text>
        </View>

        {/* ── Revoke Button ──────────────────────────────── */}
        <Pressable
          onPress={() =>
            Alert.alert(
              'Revoke shared details?',
              'Sandeep will lose access to the location and contact info immediately.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Revoke',
                  style: 'destructive',
                  onPress: () => router.back(),
                },
              ],
            )
          }
          className="flex-row items-center justify-center gap-2 rounded-pill border border-red-200 bg-red-50 py-3.5">
          <ShieldX size={16} color="#DC2626" />
          <Text className="text-sm font-semibold text-red-600">Revoke shared details</Text>
        </Pressable>
      </ScrollView>

      {/* ── Sticky Done Button ───────────────────────────── */}
      <View className="absolute inset-x-4 bottom-8">
        <Pressable
          onPress={() => router.back()}
          className="h-14 items-center justify-center rounded-pill bg-black">
          <Text className="text-base font-bold text-white">Done</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
