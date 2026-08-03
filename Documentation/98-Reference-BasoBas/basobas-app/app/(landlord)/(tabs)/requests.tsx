import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useUser } from '@clerk/expo';
import { User, Calendar, ArrowRight } from 'lucide-react-native';

import { ScreenBody } from '@/src/components/layout/ScreenBody';
import { useClerkSupabase } from '@/src/hooks/useClerkSupabase';
import { getVisitRequestsForLandlord } from '@/src/services/visits.service';
import {
  formatVisitDate,
  TIME_SLOT_LABELS,
  type LandlordVisitRequest,
  type RequestStatusUi,
} from '@/src/types/property.types';

// ─── Types ──────────────────────────────────────────────────────────────────

type TabKey = 'all' | RequestStatusUi;

const TAB_LABELS: { key: TabKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'accepted', label: 'Accepted' },
];

// ─── Component ──────────────────────────────────────────────────────────────

export default function VisitRequestsScreen() {
  const router = useRouter();
  const { user } = useUser();
  const supabase = useClerkSupabase();
  const clerkId = user?.id;

  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [requests, setRequests] = useState<LandlordVisitRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(
    async (mode: 'initial' | 'refresh' | 'poll' = 'initial') => {
      if (!clerkId) return;
      if (mode === 'refresh') setRefreshing(true);
      else if (mode === 'initial') setLoading(true);

      const result = await getVisitRequestsForLandlord(clerkId, supabase);

      if (result.success) {
        setRequests(result.data);
        setErrorMessage(null);
      } else if (mode !== 'poll') {
        // A failed realtime-triggered refetch keeps the current list rather
        // than replacing it with an error state.
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

  // Live-update the tab counts when a tenant files or edits a request.
  useEffect(() => {
    if (!clerkId) return;

    const channel = supabase
      .channel(`visit_requests:landlord:${clerkId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'visit_requests',
          filter: `landlord_id=eq.${clerkId}`,
        },
        () => load('poll'),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clerkId, supabase, load]);

  const filteredRequests = useMemo(
    () =>
      activeTab === 'all'
        ? requests
        : requests.filter((r) => r.statusUi === activeTab),
    [requests, activeTab],
  );

  const countFor = useCallback(
    (key: TabKey) =>
      key === 'all'
        ? requests.length
        : requests.filter((r) => r.statusUi === key).length,
    [requests],
  );

  return (
    <ScreenBody className="flex-1 bg-[#fafafa]">
      {/* ── Header ────────────────────────────────────────── */}
      <View className="border-b border-gray-200 px-4 pt-3 pb-3">
        <Text className="text-xl font-bold text-gray-900">Visit Requests</Text>
      </View>

      {/* ── Filter Tabs ──────────────────────────────────── */}
      <View className="flex-row items-center gap-2 px-4 py-3">
        {TAB_LABELS.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              className={`flex-row items-center gap-1 rounded-full px-4 py-2 ${
                isActive ? 'bg-black' : 'bg-gray-100'
              }`}>
              <Text
                className={`text-xs font-semibold ${
                  isActive ? 'text-white' : 'text-gray-600'
                }`}>
                {tab.label} ({countFor(tab.key)})
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* ── Request Cards ────────────────────────────────── */}
      <FlatList
        data={filteredRequests}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
        className="flex-1"
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View className="h-3" />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load('refresh')} />
        }
        ListEmptyComponent={() =>
          loading ? (
            <View className="items-center py-20">
              <ActivityIndicator color="#1A6B4A" />
            </View>
          ) : errorMessage ? (
            <View className="items-center px-8 py-20">
              <Text className="mb-1.5 font-semibold text-body text-ink">
                Could not load requests
              </Text>
              <Text className="mb-4 text-center font-sans text-body-sm text-ink3">
                {errorMessage}
              </Text>
              <Pressable
                onPress={() => load('initial')}
                className="h-[42px] items-center justify-center rounded-pill bg-black px-6">
                <Text className="font-semibold text-body-sm text-white">Try again</Text>
              </Pressable>
            </View>
          ) : (
            <View className="items-center py-20">
              <Text className="font-sans text-body-sm text-ink3">No requests found</Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/(landlord)/request/[id]',
                params: { id: item.id },
              } as any)
            }
            className="rounded-2xl border border-gray-200/50 bg-white p-5 shadow-sm">
            {/* User Info Row */}
            <View className="flex-row items-center">
              {/* Avatar */}
              <View className="h-11 w-11 items-center justify-center rounded-full bg-gray-100">
                <User size={18} color="#6B6B6B" />
              </View>
              {/* Name + Property */}
              <View className="ml-3 flex-1">
                <Text className="text-base font-bold text-gray-900">
                  {item.tenantName ?? 'Tenant'}
                </Text>
                <Text className="text-xs font-medium text-gray-400">
                  {item.propertyTitle ?? 'Your listing'}
                </Text>
              </View>
              {/* Status Pill */}
              <View
                className={`rounded-full px-3 py-1 ${
                  item.statusUi === 'pending' ? 'bg-amber-100/80' : 'bg-emerald-100/80'
                }`}>
                <Text
                  className={`text-xs font-semibold ${
                    item.statusUi === 'pending' ? 'text-amber-800' : 'text-emerald-800'
                  }`}>
                  {item.statusLabel}
                </Text>
              </View>
            </View>

            {/* Date Row */}
            <View className="mt-3 flex-row items-center gap-1.5">
              <Calendar size={14} color="#9CA3AF" />
              <Text className="text-xs font-medium text-gray-500">
                {formatVisitDate(item.requestedDate)} · {TIME_SLOT_LABELS[item.timeSlot]}
              </Text>
            </View>

            {/* Conditional Action Link (Pending only) */}
            {item.statusUi === 'pending' && (
              <View className="mt-3 flex-row items-center gap-1">
                <Text className="text-xs font-bold text-gray-900">Tap to review</Text>
                <ArrowRight size={14} color="#111827" strokeWidth={2.5} />
              </View>
            )}
          </Pressable>
        )}
      />
    </ScreenBody>
  );
}
