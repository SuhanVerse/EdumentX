import { useState, useCallback, useEffect } from 'react';
import {
  ScrollView,
  View,
  Text,
  Pressable,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, MapPin, Phone, Copy, User, Info, Send } from 'lucide-react-native';

import { useClerkSupabase } from '@/src/hooks/useClerkSupabase';
import { useAuthStore } from '@/src/store/authStore';
import { getVisitRequest, acceptVisit } from '@/src/services/visits.service';
import { getPropertyWithUnlockedLocation } from '@/src/services/properties.service';
import type { LandlordVisitRequest, PropertyUnlocked } from '@/src/types/property.types';

export default function ShareDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const supabase = useClerkSupabase();
  const profile = useAuthStore((st) => st.profile);

  const [locationEnabled, setLocationEnabled] = useState(true);
  const [contactEnabled, setContactEnabled] = useState(true);

  const [request, setRequest] = useState<LandlordVisitRequest | null>(null);
  const [property, setProperty] = useState<PropertyUnlocked | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      const visit = await getVisitRequest(id, supabase);
      if (cancelled) return;
      if (!visit.success || !visit.data) {
        setLoading(false);
        Alert.alert(
          'Could not load request',
          visit.success ? 'This request no longer exists.' : visit.error,
        );
        return;
      }
      setRequest(visit.data);

      // The landlord owns this property, so the private location tier is
      // theirs to see and choose to share.
      const detail = await getPropertyWithUnlockedLocation(
        visit.data.propertyId,
        supabase,
      );
      if (cancelled) return;
      if (detail.success) setProperty(detail.data);
      setLoading(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [id, supabase]);

  const tenantName = request?.tenantName ?? 'this tenant';
  const tenantFirstName = tenantName.split(' ')[0];

  const handleSend = useCallback(async () => {
    if (!id) {
      Alert.alert('Missing request', 'Could not tell which request to approve.');
      return;
    }
    if (sending) return;

    setSending(true);
    try {
      // Approving is what unlocks the address for the tenant — the toggles
      // above choose what the notification carries.
      const result = await acceptVisit(id, supabase);
      if (!result.success) {
        Alert.alert('Could not approve', result.error);
        return;
      }

      router.replace('/(landlord)/share-confirmation' as any);
    } finally {
      setSending(false);
    }
  }, [id, sending, supabase, router]);

  if (loading) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#137333" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-white">
      {/* ── Header Bar ──────────────────────────────────── */}
      <View className="mb-4 flex-row items-center justify-between border-b border-gray-100 bg-white py-3">
        <Pressable onPress={() => router.back()} className="ml-4 h-8 w-8 items-center justify-center">
          <ChevronLeft size={22} color="#000000" />
        </Pressable>
        <Text className="self-center text-base font-bold text-gray-900">Share Details</Text>
        <View className="mr-4 w-6" />
      </View>

      <ScrollView className="flex-1 px-4 pt-2" contentContainerStyle={{ paddingBottom: 120 }}>

        {/* ── Section Heading ────────────────────────────── */}
        <Text className="mb-1.5 text-2xl font-extrabold tracking-tight text-gray-900">
          Share with {tenantFirstName}
        </Text>
        <Text className="mb-6 text-sm font-medium leading-snug text-gray-500">
          Pick what to send so they can find the place and reach you.
        </Text>

        {/* ── Card 1: Pin Location Switcher ──────────────── */}
        <View className="mb-4 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          {/* Header Row */}
          <View className="flex-row items-center">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-[#E6F4EA]">
              <MapPin size={18} color="#137333" />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-base font-bold text-gray-900">Pin location</Text>
              <Text className="mt-0.5 text-xs font-medium text-gray-500">
                Exact GPS pin to the building entrance.
              </Text>
            </View>
            <Switch
              value={locationEnabled}
              onValueChange={setLocationEnabled}
              trackColor={{ false: '#E5E7EB', true: '#137333' }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Conditional Map Placeholder */}
          {locationEnabled && (
            <>
              {/* Map area */}
              <View className="relative my-3 h-32 w-full overflow-hidden rounded-2xl border border-gray-100 bg-[#E3E8E3]">
                {/* Grid overlay lines */}
                <View className="absolute inset-0">
                  {/* Horizontal grid lines */}
                  <View className="absolute left-0 right-0 top-1/4 h-[0.5px] bg-white/40" />
                  <View className="absolute left-0 right-0 top-2/4 h-[0.5px] bg-white/40" />
                  <View className="absolute left-0 right-0 top-3/4 h-[0.5px] bg-white/40" />
                  {/* Vertical grid lines */}
                  <View className="absolute bottom-0 left-1/4 top-0 w-[0.5px] bg-white/40" />
                  <View className="absolute bottom-0 left-3/4 top-0 w-[0.5px] bg-white/40" />
                </View>

                {/* Centered pin */}
                <View className="absolute left-1/2 top-1/2 z-10 h-8 w-8 -ml-4 -mt-4 items-center justify-center rounded-full bg-black shadow-md">
                  <MapPin size={14} color="#FFFFFF" fill="#FFFFFF" />
                </View>
              </View>

              {/* Location address details — the private tier, if it's been set */}
              <Text className="mt-2 text-sm font-bold text-gray-900">
                {property?.locationAddress ?? property?.title ?? 'Address not set'}
              </Text>
              <Text className="mt-0.5 text-xs font-medium text-gray-500">
                {property?.locationAddress
                  ? property.locationArea
                  : 'Add an exact address to your listing to share a precise pin.'}
              </Text>
            </>
          )}
        </View>

        {/* ── Card 2: Contact Number Switcher ────────────── */}
        <View className="mb-4 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          {/* Header Row */}
          <View className="flex-row items-center">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-[#E6F4EA]">
              <Phone size={18} color="#137333" />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-base font-bold text-gray-900">Contact number</Text>
              <Text className="mt-0.5 text-xs font-medium text-gray-500">
                Tenant can call you to coordinate.
              </Text>
            </View>
            <Switch
              value={contactEnabled}
              onValueChange={setContactEnabled}
              trackColor={{ false: '#E5E7EB', true: '#137333' }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Conditional Phone Display */}
          {contactEnabled && (
            <>
              <View className="my-3 flex-row items-center justify-between rounded-2xl border border-gray-100 bg-[#F9FAFB] p-3.5">
                <View>
                  <Text className="text-xs font-semibold text-gray-400">Primary number</Text>
                  <Text className="mt-1 text-base font-bold tracking-wide text-gray-900">
                    {profile?.phone ?? 'No number on file'}
                  </Text>
                </View>
                <Pressable className="h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white shadow-xs">
                  <Copy size={14} color="#374151" />
                </Pressable>
              </View>

              {/* Use different number */}
              <Pressable className="mt-2">
                <Text className="text-xs font-bold text-gray-900 underline">
                  Use a different number
                </Text>
              </Pressable>
            </>
          )}
        </View>

        {/* ── Summary Footer & Privacy Note ──────────────── */}
        {/* Recipient Pill Box */}
        <View className="mb-3 flex-row items-center gap-3 rounded-2xl border border-gray-100/60 bg-[#F9FAFB] p-3.5">
          <View className="h-9 w-9 items-center justify-center rounded-full bg-gray-200/70">
            <User size={16} color="#6B7280" />
          </View>
          <Text className="text-sm font-semibold text-gray-700">
            Sharing with <Text className="font-bold text-gray-900">{tenantName}</Text>
          </Text>
        </View>

        {/* Privacy Warning Note */}
        <View className="flex-row items-start">
          <Info size={14} color="#9CA3AF" />
          <Text className="ml-1.5 flex-1 text-xs font-medium leading-relaxed text-gray-400">
            Details stay private to this tenant for the visit window. You can revoke anytime.
          </Text>
        </View>

      </ScrollView>

      {/* ── Sticky Send Button ──────────────────────────── */}
      <View className="absolute inset-x-4 bottom-8">
        <Pressable
          onPress={handleSend}
          disabled={sending}
          className={`h-14 flex-row items-center justify-center gap-2 rounded-pill bg-black ${
            sending ? 'opacity-60' : ''
          }`}
          accessibilityRole="button"
          accessibilityState={{ disabled: sending, busy: sending }}>
          {sending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Send size={18} color="#FFFFFF" />
              <Text className="text-base font-bold text-white">
                Send to {tenantFirstName}
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
