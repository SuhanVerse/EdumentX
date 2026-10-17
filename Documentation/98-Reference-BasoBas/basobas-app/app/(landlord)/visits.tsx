import { useState, useCallback, useEffect } from 'react';
import { ScrollView, View, Text, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useUser } from '@clerk/expo';
import { Clock } from 'lucide-react-native';

import { ScreenHeader } from '../../src/components/layout/ScreenHeader';
import { VisitStatusChip } from '@/src/components/visits/VisitStatusChip';
import { useClerkSupabase } from '@/src/hooks/useClerkSupabase';
import { getVisitRequestsForLandlord } from '@/src/services/visits.service';
import {
  TIME_SLOT_LABELS,
  type LandlordVisitRequest,
  type TenantVisitStatusUi,
  type VisitStatusLabel,
} from '@/src/types/property.types';

// History pills use the same chip grammar as the tenant visit chips.
const LABEL_TO_CHIP: Record<VisitStatusLabel, TenantVisitStatusUi> = {
  'Pending Approval': 'pending',
  Scheduled: 'accepted',
  'New Time Proposed': 'rescheduled',
  Completed: 'completed',
  Cancelled: 'cancelled',
  'Still Deciding': 'discussion',
  'Rental Finalized': 'finalized',
  Declined: 'rejected',
  'Not Interested': 'cancelled',
  'Need Another Visit': 'cancelled',
};

/** Day tile parts: "JUN" + 16, and a "Mon · 4:00 PM" meta line. */
const visitDay = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  return {
    month: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
    day: d.getDate(),
    weekday: d.toLocaleDateString('en-US', { weekday: 'short' }),
  };
};

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
    [clerkId, supabase]
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
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load('refresh')}
            tintColor="#1A6B4A"
            colors={['#1A6B4A']}
          />
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
              className="h-[48px] items-center justify-center rounded-pill bg-ink px-8">
              <Text className="font-semibold text-body text-white">Try again</Text>
            </Pressable>
          </View>
        ) : visits.length === 0 ? (
          <View className="items-center py-20">
            <Text className="text-body-sm text-ink3">No visits yet</Text>
          </View>
        ) : (
          visits.map((visit) => {
            const day = visitDay(visit.requestedDate);
            return (
              <Pressable
                key={visit.id}
                onPress={() =>
                  router.push({
                    pathname: '/(landlord)/request/[id]',
                    params: { id: visit.id },
                  } as any)
                }
                className="mb-3 rounded-card border border-line bg-bg p-card-pad">
                <View className="flex-row items-center">
                  {/* Date tile — the visual anchor */}
                  <View className="h-[52px] w-[46px] items-center justify-center rounded-lg bg-canvas">
                    <Text className="font-semibold text-micro uppercase tracking-wide text-ink3">
                      {day.month}
                    </Text>
                    <Text className="mt-0.5 font-bold text-[17px] text-ink">{day.day}</Text>
                  </View>

                  {/* Property + status */}
                  <View className="ml-3 flex-1 flex-row items-start justify-between gap-2">
                    <View className="flex-1">
                      <Text numberOfLines={1} className="font-semibold text-body text-ink">
                        {visit.propertyTitle ?? 'Your listing'}
                      </Text>
                      <Text numberOfLines={1} className="mt-0.5 font-sans text-caption text-ink2">
                        {visit.tenantName ?? 'Tenant'}
                      </Text>
                    </View>
                    <VisitStatusChip
                      status={LABEL_TO_CHIP[visit.statusLabel]}
                      label={visit.statusLabel}
                    />
                  </View>
                </View>

                {/* Meta line: weekday + slot */}
                <View className="mt-3 flex-row items-center gap-1.5">
                  <Clock size={13} color="#AAAAAA" />
                  <Text className="font-sans text-caption text-ink3">
                    {day.weekday} · {TIME_SLOT_LABELS[visit.timeSlot]}
                  </Text>
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
