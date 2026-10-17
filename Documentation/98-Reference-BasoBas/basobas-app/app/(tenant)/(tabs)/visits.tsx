import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useUser } from '@clerk/expo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenBody } from '@/src/components/layout/ScreenBody';
import { PageHeader } from '@/src/components/visit/PageHeader';
import { UnderlineTabs } from '@/src/components/visit/UnderlineTabs';
import { VisitCard } from '@/src/components/visit/VisitCard';
import { VisitEmptyState } from '@/src/components/visit/EmptyState';
import { Skeleton, SkeletonBlock } from '@/src/components/visit/Skeleton';
import { useVisitsStore } from '@/src/store/visitsStore';
import { markPastVisitsCompleted } from '@/src/services/visits.service';
import { DEMO_MODE } from '@/src/lib/demoMode';
import { useClerkSupabase } from '@/src/hooks/useClerkSupabase';
import { c, radius, sp } from '@/src/theme/visitTokens';
import type { TenantVisitRequest, TimeSlot } from '@/src/types/property.types';

// ─── Tabs ────────────────────────────────────────────────────────────────────

type TabKey = 'upcoming' | 'past' | 'cancelled';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past', label: 'Past' },
  { key: 'cancelled', label: 'Cancelled' },
];

const OPEN_UI = new Set<TenantVisitRequest['statusUi']>(['pending', 'accepted', 'rescheduled']);

const EMPTY_COPY: Record<TabKey, { title: string; body: string }> = {
  upcoming: { title: 'No upcoming visits', body: 'Visits will appear here once scheduled.' },
  past: { title: 'No past visits', body: 'Visits will appear here once scheduled.' },
  cancelled: { title: 'No cancelled visits', body: 'Visits will appear here once scheduled.' },
};

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function VisitsTab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const supabase = useClerkSupabase();
  const clerkId = user?.id;
  const visits = useVisitsStore((s) => s.tenantVisits);
  const isLoading = useVisitsStore((s) => s.isLoading);
  const fetchTenantVisits = useVisitsStore((s) => s.fetchTenantVisits);

  // Fetch the real joined rows (property + landlord details) on focus — the
  // store is otherwise only fed by realtime, which carries no joins.
  useFocusEffect(
    useCallback(() => {
      if (!clerkId) return;
      fetchTenantVisits(supabase, clerkId);
    }, [clerkId, supabase, fetchTenantVisits])
  );

  // DEMO ONLY — long-press an accepted card to fast-forward its window so
  // the follow-up drawer can be demoed without waiting for real time.
  const handleForceTimePassed = useCallback(
    (visitId: string, title: string | null) => {
      Alert.alert(
        'Demo · Fast-forward visit',
        `Treat the visit to ${title ?? 'this property'} as completed and open the follow-up?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Fast-forward',
            onPress: async () => {
              const result = await markPastVisitsCompleted(supabase, { forceVisitId: visitId });
              if (result.success && clerkId) await fetchTenantVisits(supabase, clerkId);
            },
          },
        ]
      );
    },
    [supabase, clerkId, fetchTenantVisits]
  );

  const [activeTab, setActiveTab] = useState<TabKey>('upcoming');

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
          .filter(
            (v) => OPEN_UI.has(v.statusUi) && new Date(`${v.requestedDate}T00:00:00`) >= today
          )
          .sort((a, b) => a.requestedDate.localeCompare(b.requestedDate));
      case 'past':
        return rows
          .filter(
            (v) =>
              v.statusUi === 'completed' ||
              v.statusUi === 'discussion' ||
              v.statusUi === 'finalized' ||
              (OPEN_UI.has(v.statusUi) && new Date(`${v.requestedDate}T00:00:00`) < today)
          )
          .sort((a, b) => b.requestedDate.localeCompare(a.requestedDate));
      case 'cancelled':
        return rows
          .filter((v) => v.statusUi === 'rejected' || v.statusUi === 'cancelled')
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
  }, [activeTab, visits, today]);

  const counts = useMemo(() => {
    const result: Record<TabKey, number> = { upcoming: 0, past: 0, cancelled: 0 };
    for (const v of visits) {
      const isOpen = OPEN_UI.has(v.statusUi);
      const past = new Date(`${v.requestedDate}T00:00:00`) < today;
      if (v.statusUi === 'rejected' || v.statusUi === 'cancelled') result.cancelled += 1;
      else if (
        v.statusUi === 'completed' ||
        v.statusUi === 'discussion' ||
        v.statusUi === 'finalized' ||
        (isOpen && past)
      )
        result.past += 1;
      else if (isOpen) result.upcoming += 1;
    }
    return result;
  }, [visits, today]);

  const tabs = TABS.map((t) => ({ ...t, count: counts[t.key] }));
  const empty = EMPTY_COPY[activeTab];

  return (
    <ScreenBody>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: sp.lg }}>
            <VisitCard
              variant="tenant"
              status={item.statusUi}
              date={item.requestedDate}
              timeSlot={item.timeSlot as TimeSlot}
              propertyTitle={item.propertyTitle ?? 'Property'}
              propertyArea={item.propertyArea}
              propertyPrice={item.propertyPrice}
              propertyPhotoUrl={item.propertyPhotoUrl}
              onPress={() =>
                router.push({ pathname: '/(tenant)/visit/[id]', params: { id: item.id } } as any)
              }
              onLongPress={
                DEMO_MODE && item.statusUi === 'accepted'
                  ? () => void handleForceTimePassed(item.id, item.propertyTitle)
                  : undefined
              }
            />
          </View>
        )}
        ListHeaderComponent={
          <View>
            <PageHeader
              title="My Visits"
              subtitle={`${counts.upcoming} scheduled visit${counts.upcoming === 1 ? '' : 's'}`}
            />
            <View style={{ height: 8 }} />
            <UnderlineTabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
            <View style={{ height: sp.base }} />
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: sp.base }} />}
        ListEmptyComponent={
          isLoading && visits.length === 0 ? (
            <Skeleton style={{ paddingHorizontal: sp.lg }}>
              <VisitCardSkeleton />
              <VisitCardSkeleton />
            </Skeleton>
          ) : (
            <VisitEmptyState title={empty.title} body={empty.body} />
          )
        }
        contentContainerStyle={{
          paddingTop: 8,
          paddingBottom: 120 + insets.bottom,
        }}
        showsVerticalScrollIndicator={false}
      />
    </ScreenBody>
  );
}

// ─── Loading skeleton ────────────────────────────────────────────────────────

/** Mimics the VisitCard layout: thumbnail + title/meta + date/time row. */
const VisitCardSkeleton = () => (
  <View style={{ backgroundColor: c.cardBg, borderRadius: radius.card, padding: sp.base }}>
    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
      <SkeletonBlock width={46} height={46} radius={radius.thumb} />
      <View style={{ flex: 1, marginLeft: sp.base }}>
        <SkeletonBlock width="60%" height={16} />
        <SkeletonBlock width="40%" height={12} style={{ marginTop: 8 }} />
        <SkeletonBlock width="30%" height={12} style={{ marginTop: 8 }} />
      </View>
    </View>
    <SkeletonBlock height={1} style={{ marginTop: sp.base }} />
    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: sp.base }}>
      <SkeletonBlock width={90} height={12} />
      <SkeletonBlock width={70} height={12} style={{ marginLeft: sp.base }} />
      <SkeletonBlock width={64} height={20} radius={radius.chip} style={{ marginLeft: 'auto' }} />
    </View>
  </View>
);
