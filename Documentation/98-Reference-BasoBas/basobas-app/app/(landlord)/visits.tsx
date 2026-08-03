import { useState, useCallback, useEffect } from 'react';
import {
  ScrollView,
  View,
  Text,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useUser } from '@clerk/expo';
import { Calendar, User } from 'lucide-react-native';

import { ScreenHeader } from '../../src/components/layout/ScreenHeader';
import { useClerkSupabase } from '@/src/hooks/useClerkSupabase';
import { getVisitRequestsForLandlord } from '@/src/services/visits.service';
import {
  formatVisitDate,
  TIME_SLOT_LABELS,
  type LandlordVisitRequest,
} from '@/src/types/property.types';

export default function LandlordVisitsScreen() {
  const router = useRouter();
  const { user } = useUser();
  const supabase = useClerkSupabase();
  const clerkId = user?.id;

  const [visits, setVisits] = useState<LandlordVisitRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (!clerkId) return;
      if (mode === 'refresh') setRefreshing(true);
      else setLoading(true);

      const result = await getVisitRequestsForLandlord(clerkId, supabase);

      if (result.success) {
        setVisits(result.data);
        setErrorMessage(null);
      } else {
        setErrorMessage(result.error);
      }

      setLoading(false);
      setRefreshing(false);
    },
    [clerkId, supabase],
  );

  useEffect(() => {
    load('initial');
  }, [load]);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      <ScreenHeader title="Visit History" showBack={true} centerTitle={true} />
      <ScrollView
        className="px-6"
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 24 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load('refresh')} />
        }>
        {loading ? (
          <View className="items-center py-20">
            <ActivityIndicator color="#1A6B4A" />
          </View>
        ) : errorMessage ? (
          <View className="items-center px-2 py-20">
            <Text className="mb-1.5 font-semibold text-body text-ink">
              Could not load visit history
            </Text>
            <Text className="mb-5 text-center text-body-sm text-ink2">{errorMessage}</Text>
            <Pressable
              onPress={() => load('initial')}
              className="h-[48px] items-center justify-center rounded-pill bg-black px-8">
              <Text className="font-semibold text-body text-white">Try again</Text>
            </Pressable>
          </View>
        ) : visits.length === 0 ? (
          <View className="items-center py-20">
            <Text className="text-body-sm text-ink3">No visits yet</Text>
          </View>
        ) : (
          visits.map((visit) => (
          <Pressable
            key={visit.id}
            onPress={() =>
              router.push({
                pathname: '/(landlord)/request/[id]',
                params: { id: visit.id },
              } as any)
            }
            className="mb-4 rounded-card border border-line bg-bg p-4">
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="font-semibold text-body text-ink">
                {visit.propertyTitle ?? 'Your listing'}
              </Text>
              <View
                className={`rounded-pill px-2.5 py-0.5 ${
                  visit.statusLabel === 'Completed'
                    ? 'bg-green-100'
                    : visit.statusLabel === 'Scheduled'
                      ? 'bg-blue-100'
                      : visit.statusLabel === 'Cancelled'
                        ? 'bg-red-100'
                        : 'bg-amber-100'
                }`}>
                <Text
                  className={`font-semibold text-[11px] ${
                    visit.statusLabel === 'Completed'
                      ? 'text-green-800'
                      : visit.statusLabel === 'Scheduled'
                        ? 'text-blue-800'
                        : visit.statusLabel === 'Cancelled'
                          ? 'text-red-800'
                          : 'text-amber-800'
                  }`}>
                  {visit.statusLabel}
                </Text>
              </View>
            </View>

            <View className="mb-1.5 flex-row items-center gap-1.5">
              <User size={14} color="#6B6B6B" />
              <Text className="text-body-sm text-ink2">
                {visit.tenantName ?? 'Tenant'}
              </Text>
            </View>

            <View className="flex-row items-center gap-1.5">
              <Calendar size={14} color="#6B6B6B" />
              <Text className="text-body-sm text-ink2">
                {formatVisitDate(visit.requestedDate)} · {TIME_SLOT_LABELS[visit.timeSlot]}
              </Text>
            </View>
          </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
