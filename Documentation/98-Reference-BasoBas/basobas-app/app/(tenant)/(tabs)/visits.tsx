import { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  View,
  Text,
  type ListRenderItem,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  CalendarDays,
  Clock,
  CalendarCheck,
  CalendarClock,
  CalendarX,
} from 'lucide-react-native';

import { ScreenBody } from '@/src/components/layout/ScreenBody';
import { VisitStatusBadge } from '@/src/components/user/VisitStatusBadge';
import type { VisitStatus } from '@/src/components/user/VisitStatusBadge';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Visit {
  id: string;
  propertyId: string;
  propertyTitle: string;
  propertyImageUrl?: string;
  priceMonthly: number;
  currency: string;
  locationLabel: string;
  visitDate: Date;
  visitTime: string;
  status: VisitStatus;
}

type TabKey = 'upcoming' | 'past' | 'cancelled';

// ─── Mock Data ───────────────────────────────────────────────────────────────
// In a real build this would come from a store / API. Mocked here so the
// screen renders with believable content for each tab.

const VISITS: Visit[] = [
  {
    id: 'v1',
    propertyId: '1',
    propertyTitle: '2BHK in Kupondole',
    priceMonthly: 32000,
    currency: 'Rs.',
    locationLabel: 'Lalitpur · Verified',
    visitDate: new Date(2026, 5, 3), // Jun 3, 2026
    visitTime: '11:30 AM',
    status: 'confirmed',
  },
  {
    id: 'v2',
    propertyId: 'thamel',
    propertyTitle: 'Studio near Thamel',
    priceMonthly: 18000,
    currency: 'Rs.',
    locationLabel: 'Kathmandu',
    visitDate: new Date(2026, 5, 5), // Jun 5, 2026
    visitTime: '4:00 PM',
    status: 'pending',
  },
  {
    id: 'v3',
    propertyId: 'patan',
    propertyTitle: '1BHK in Patan',
    priceMonthly: 22000,
    currency: 'Rs.',
    locationLabel: 'Lalitpur',
    visitDate: new Date(2026, 5, 10), // Jun 10, 2026
    visitTime: '10:00 AM',
    status: 'confirmed',
  },
  {
    id: 'v4',
    propertyId: 'bhaktapur',
    propertyTitle: 'Room in Bhaktapur',
    priceMonthly: 14000,
    currency: 'Rs.',
    locationLabel: 'Bhaktapur',
    visitDate: new Date(2026, 4, 12), // May 12, 2026 (past)
    visitTime: '2:30 PM',
    status: 'confirmed',
  },
  {
    id: 'v5',
    propertyId: 'pokhara',
    propertyTitle: '1BHK in Pokhara',
    priceMonthly: 26000,
    currency: 'Rs.',
    locationLabel: 'Pokhara · Verified',
    visitDate: new Date(2026, 3, 22), // Apr 22, 2026 (past)
    visitTime: '9:00 AM',
    status: 'confirmed',
  },
  {
    id: 'v6',
    propertyId: 'budhanilkantha',
    propertyTitle: '2BHK near Budhanilkantha',
    priceMonthly: 28000,
    currency: 'Rs.',
    locationLabel: 'Kathmandu · Verified',
    visitDate: new Date(2026, 4, 2), // May 2, 2026
    visitTime: '3:15 PM',
    status: 'cancelled',
  },
];

// ─── Tab Definitions ─────────────────────────────────────────────────────────

const TABS: { key: TabKey; label: string }[] = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past', label: 'Past' },
  { key: 'cancelled', label: 'Cancelled' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const formatDate = (d: Date) =>
  d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

/** Returns the singular/plural subtitle copy for the active tab. */
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
  const { initialTab } = useLocalSearchParams<{ initialTab?: string }>();
  const validInitialTab: TabKey = (TABS.find((t) => t.key === initialTab)?.key ??
    'upcoming') as TabKey;
  const [activeTab, setActiveTab] = useState<TabKey>(validInitialTab);
  const [refreshing, setRefreshing] = useState(false);

  // Filter once per activeTab. Using a single today's-midnight stamp keeps
  // the comparison cheap and consistent.
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const filtered = useMemo(() => {
    switch (activeTab) {
      case 'upcoming':
        return VISITS.filter((v) => v.status !== 'cancelled' && v.visitDate >= today);
      case 'past':
        return VISITS.filter((v) => v.status !== 'cancelled' && v.visitDate < today);
      case 'cancelled':
        return VISITS.filter((v) => v.status === 'cancelled');
    }
  }, [activeTab, today]);

  const onRefresh = () => {
    setRefreshing(true);
    // No real network call — just give the spinner a beat.
    setTimeout(() => setRefreshing(false), 600);
  };

  const goToProperty = (propertyId: string) => {
    router.push({ pathname: '/(tenant)/property/[id]' as any, params: { id: propertyId } });
  };

  // ── Render helpers ───────────────────────────────────────────────────────

  const renderCard: ListRenderItem<Visit> = ({ item }) => (
    <VisitCard visit={item} onPress={() => goToProperty(item.propertyId)} />
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
                        isActive ? 'text-body font-bold text-ink' : 'text-body text-ink2'
                      }`}>
                      {tab.label}
                    </Text>
                    {isActive && (
                      <View className="mt-1.5 h-[2px] w-full rounded-pill bg-ink" />
                    )}
                  </Pressable>
                );
              })}
            </View>

            {/* Full-width separator under tab row */}
            <View className="h-px w-full bg-line" />
          </View>
        }
        ListEmptyComponent={<EmptyState tab={activeTab} />}
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

// ─── Visit Card ──────────────────────────────────────────────────────────────

const VisitCard = ({ visit, onPress }: { visit: Visit; onPress: () => void }) => {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open ${visit.propertyTitle} details`}
      className="mx-6 overflow-hidden rounded-card bg-canvas">
      {/* Top row: thumbnail + text */}
      <View className="flex-row items-center p-4">
        <View className="h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-lg bg-placeholder-image">
          {/* Placeholder block — image network loading can be wired later. */}
          <Text className="font-sans text-caption text-ink3">Photo</Text>
        </View>
        <View className="ml-4 flex-1">
          <Text numberOfLines={1} className="font-semibold text-body text-ink">
            {visit.propertyTitle}
          </Text>
          <Text className="mt-1 font-bold text-body text-brand">
            {visit.currency} {visit.priceMonthly.toLocaleString()}
            <Text className="font-sans text-caption text-ink2"> / month</Text>
          </Text>
          <Text className="mt-0.5 font-sans text-caption text-ink2">{visit.locationLabel}</Text>
        </View>
      </View>

      {/* Divider */}
      <View className="mx-4 h-px bg-line" />

      {/* Bottom row: date/time + status badge */}
      <View className="flex-row items-center justify-between p-4">
        <View className="flex-row items-center">
          <CalendarDays size={14} color="#6B6B6B" />
          <Text className="ml-1.5 font-sans text-body-sm text-ink">{formatDate(visit.visitDate)}</Text>
          <View className="mx-2 h-1 w-1 rounded-pill bg-ink3" />
          <Clock size={14} color="#6B6B6B" />
          <Text className="ml-1.5 font-sans text-body-sm text-ink">{visit.visitTime}</Text>
        </View>
        <VisitStatusBadge status={visit.status} />
      </View>
    </Pressable>
  );
};

// ─── Empty State ─────────────────────────────────────────────────────────────

const EMPTY_COPY: Record<TabKey, { icon: 'upcoming' | 'past' | 'cancelled'; title: string; body: string }> = {
  upcoming: {
    icon: 'upcoming',
    title: 'No upcoming visits',
    body: 'Schedule a visit on a property to see it here.',
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
  const { icon, title, body } = EMPTY_COPY[tab];
  const Icon =
    icon === 'upcoming' ? CalendarClock : icon === 'past' ? CalendarCheck : CalendarX;

  return (
    <View className="mt-16 items-center px-6">
      <View className="mb-4 h-[72px] w-[72px] items-center justify-center rounded-pill bg-canvas">
        <Icon size={28} color="#6B6B6B" />
      </View>
      <Text className="font-semibold text-h3 text-ink">{title}</Text>
      <Text className="mt-1 text-center font-sans text-body-sm text-ink2">{body}</Text>
    </View>
  );
};
