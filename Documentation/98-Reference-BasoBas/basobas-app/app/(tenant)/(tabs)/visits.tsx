import { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  View,
  Text,
  ActivityIndicator,
  type ListRenderItem,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { CalendarClock, CalendarCheck, CalendarX, Compass } from 'lucide-react-native';

import { ScreenBody } from '@/src/components/layout/ScreenBody';
import { VisitListCard } from '@/src/components/visits/VisitListCard';
import { useClerkSupabase } from '@/src/hooks/useClerkSupabase';
import { useUser } from '@clerk/expo';
import { useVisitsStore } from '@/src/store/visitsStore';
import type { TenantVisitRequest, TenantVisitStatusUi } from '@/src/types/property.types';

// ─── Types ───────────────────────────────────────────────────────────────────

type TabKey = 'upcoming' | 'past' | 'cancelled';

const OPEN_UI: TenantVisitStatusUi[] = ['pending', 'accepted', 'rescheduled'];

// ─── Tab Definitions ─────────────────────────────────────────────────────────

const TABS: { key: TabKey; label: string }[] = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past', label: 'Past' },
  { key: 'cancelled', label: 'Cancelled' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const parseVisitDate = (iso: string) => new Date(`${iso}T00:00:00`);

/** Singular/plural subtitle copy for the active tab. */
const subtitleFor = (tab: TabKey, count: number): string => {
  const noun = `${count} ${tab === 'past' ? 'past' : tab === 'cancelled' ? 'cancelled' : 'scheduled'} visit${
    count === 1 ? '' : 's'
  }`;
  return noun;
};

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function VisitsTab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const supabase = useClerkSupabase();
  const { user: clerkUser } = useUser();
  const { initialTab } = useLocalSearchParams<{ initialTab?: string }>();

  const visits = useVisitsStore((s) => s.visits);
  const isLoading = useVisitsStore((s) => s.isLoading);
  const fetchVisits = useVisitsStore((s) => s.fetchVisits);
  const statusChangedAt = useVisitsStore((s) => s.statusChangedAt);

  const validInitialTab: TabKey = (TABS.find((t) => t.key === initialTab)?.key ??
    'upcoming') as TabKey;
  const [activeTab, setActiveTab] = useState<TabKey>(validInitialTab);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!clerkUser?.id) return;
    await fetchVisits(supabase, clerkUser.id);
  }, [clerkUser?.id, supabase, fetchVisits]);

  // Realtime gives immediacy; focus re-fetch is the correctness fallback.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const filtered = useMemo(() => {
    const rows = [...visits];
    switch (activeTab) {
      case 'upcoming':
        return rows
          .filter((v) => OPEN_UI.includes(v.statusUi) && parseVisitDate(v.requestedDate) >= today)
          .sort((a, b) => a.requestedDate.localeCompare(b.requestedDate));
      case 'past':
        return rows
          .filter(
            (v) =>
              v.statusUi === 'completed' ||
              (OPEN_UI.includes(v.statusUi) && parseVisitDate(v.requestedDate) < today)
          )
          .sort((a, b) => b.requestedDate.localeCompare(a.requestedDate));
      case 'cancelled':
        return rows
          .filter((v) => v.statusUi === 'rejected' || v.statusUi === 'cancelled')
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
  }, [activeTab, visits, today]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  // ── Render helpers ───────────────────────────────────────────────────────

  const renderCard: ListRenderItem<TenantVisitRequest> = ({ item }) => (
    <VisitListCard
      visit={item}
      flashAt={statusChangedAt[item.id]}
      showFollowUpBadge={activeTab === 'past'}
      onPress={() =>
        router.push({ pathname: '/(tenant)/visit/[id]', params: { id: item.id } } as any)
      }
    />
  );

  // ── Screen ───────────────────────────────────────────────────────────────

  return (
    <ScreenBody>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderCard}
        ListHeaderComponent={
          <View>
            {/* Title */}
            <View className="px-6 pb-2 pt-2">
              <Text className="font-display text-h1 leading-tight text-ink">My Visits</Text>
              <Text className="mt-1 font-sans text-body-sm text-ink2">
                {subtitleFor(activeTab, filtered.length)}
              </Text>
            </View>

            {/* Segmented tab row */}
            <View className="mt-2 flex-row px-6">
              {TABS.map((tab) => {
                const isActive = tab.key === activeTab;
                return (
                  <Pressable
                    key={tab.key}
                    onPress={() => setActiveTab(tab.key)}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: isActive }}
                    accessibilityLabel={`${tab.label} visits`}
                    className="mr-6 pb-3 pt-1">
                    <Text
                      className={`font-sans ${
                        isActive ? 'font-bold text-body text-ink' : 'text-body text-ink2'
                      }`}>
                      {tab.label}
                    </Text>
                    {isActive && <View className="mt-1.5 h-[2px] w-full rounded-pill bg-ink" />}
                  </Pressable>
                );
              })}
            </View>

            {/* Full-width separator under tab row */}
            <View className="h-px w-full bg-line" />
          </View>
        }
        ListEmptyComponent={
          isLoading && visits.length === 0 ? (
            <View className="items-center justify-center py-20">
              <ActivityIndicator size="small" color="#1A6B4A" />
            </View>
          ) : (
            <EmptyState tab={activeTab} />
          )
        }
        ItemSeparatorComponent={() => <View className="h-3" />}
        contentContainerStyle={{
          paddingTop: insets.top > 0 ? 0 : 8,
          paddingBottom: 120,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#1A6B4A"
            colors={['#1A6B4A']}
          />
        }
      />
    </ScreenBody>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

const EMPTY_COPY: Record<
  TabKey,
  { icon: 'upcoming' | 'past' | 'cancelled'; title: string; body: string; cta?: string }
> = {
  upcoming: {
    icon: 'upcoming',
    title: 'No upcoming visits',
    body: 'No upcoming visits — browse listings to schedule one.',
    cta: 'Browse Listings',
  },
  past: {
    icon: 'past',
    title: 'No past visits',
    body: 'Visits you’ve completed will appear here.',
  },
  cancelled: {
    icon: 'cancelled',
    title: 'No cancelled visits',
    body: 'Cancelled visits will appear here.',
  },
};

const EmptyState = ({ tab }: { tab: TabKey }) => {
  const router = useRouter();
  const { icon, title, body, cta } = EMPTY_COPY[tab];
  const Icon = icon === 'upcoming' ? CalendarClock : icon === 'past' ? CalendarCheck : CalendarX;

  return (
    <View className="mt-16 items-center px-6">
      <View className="mb-4 h-[72px] w-[72px] items-center justify-center rounded-pill bg-canvas">
        <Icon size={28} color="#6B6B6B" />
      </View>
      <Text className="font-semibold text-h3 text-ink">{title}</Text>
      <Text className="mt-1 text-center font-sans text-body-sm text-ink2">{body}</Text>
      {cta && (
        <Pressable
          onPress={() => router.push('/(tenant)/(tabs)/' as any)}
          accessibilityRole="button"
          className="mt-6 flex-row items-center rounded-pill bg-ink px-6 py-3">
          <Compass size={16} color="#FFFFFF" />
          <Text className="ml-2 font-semibold text-body text-white">{cta}</Text>
        </Pressable>
      )}
    </View>
  );
};
