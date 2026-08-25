import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useUser } from '@clerk/expo';

import { ScreenHeader } from '@/src/components/layout/ScreenHeader';
import { useClerkSupabase } from '@/src/hooks/useClerkSupabase';
import {
  getNotificationRoute,
  type NotificationViewer,
} from '@/src/services/notifications.service';
import { useNotificationsStore } from '@/src/store/notificationsStore';
import {
  groupByDate,
  isUnread,
  type Notification,
  type NotificationKind,
} from '@/src/types/notification.types';
import { NotificationsEmptyState } from './EmptyState';

// ─── Public types ────────────────────────────────────────────────────────────

export interface NotificationTab {
  /** Stable id — used as React key. */
  key: string;
  /** Pill label rendered in the tab strip. */
  label: string;
  /** null = "show all kinds"; otherwise filter to this subset. */
  kinds: NotificationKind[] | null;
}

export interface NotificationsListProps {
  /** Drives the deep-link target (visit vs request). */
  viewer: NotificationViewer;
  /** Tabs rendered above the list. First entry is selected by default. */
  tabs: NotificationTab[];
  /** Render the ScreenHeader. False for the landlord tab screen (it has its own). */
  showHeader?: boolean;
  /** Render the "Mark all read" affordance. Shown on every screen. */
  showMarkAllRead?: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Shared list UI used by every notification screen in the app.
 *
 * Owns:
 *  - tab pill row
 *  - day-bucketed sections (Today / Yesterday / Earlier)
 *  - empty state
 *  - mark-all-read action
 *
 * Does NOT own:
 *  - the realtime channel (mounted at the layout level)
 *  - per-row navigation (uses {@link getNotificationRoute} from the service)
 *
 * Hydrates from the store on focus; reads + writes go through the store
 * actions so optimistic reconcile + realtime merge run in one place.
 */
export const NotificationsList = ({
  viewer,
  tabs,
  showHeader = true,
  showMarkAllRead = true,
}: NotificationsListProps) => {
  const { user } = useUser();
  const supabase = useClerkSupabase();

  // Store hooks (subscribed individually to minimise re-renders).
  const notifications = useNotificationsStore((s) => s.notifications);
  const isLoading = useNotificationsStore((s) => s.isLoading);
  const fetchNotifications = useNotificationsStore((s) => s.fetchNotifications);
  const fetchUnreadCount = useNotificationsStore((s) => s.fetchUnreadCount);
  const markRead = useNotificationsStore((s) => s.markRead);
  const markAllRead = useNotificationsStore((s) => s.markAllRead);

  // The selected tab — default to the first entry.
  const [activeTabKey, setActiveTabKey] = useState<string>(tabs[0]?.key ?? 'all');
  const [refreshing, setRefreshing] = useState(false);

  const activeTab = useMemo<NotificationTab | undefined>(
    () => tabs.find((t) => t.key === activeTabKey) ?? tabs[0],
    [tabs, activeTabKey]
  );

  // Hydrate from the DB on every focus, mirroring `visitsStore`'s pattern.
  // Realtime patches the store live between focus cycles.
  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return;
      fetchNotifications(supabase);
      fetchUnreadCount(supabase);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id])
  );

  const filtered = useMemo<Notification[]>(() => {
    if (!activeTab || activeTab.kinds == null) return notifications;
    const allowed = new Set(activeTab.kinds);
    return notifications.filter((n) => allowed.has(n.kind));
  }, [notifications, activeTab]);

  const grouped = useMemo(() => groupByDate(filtered), [filtered]);

  const hasAny = filtered.length > 0;
  const hasUnread = notifications.some(isUnread);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifications(supabase);
    await fetchUnreadCount(supabase);
    setRefreshing(false);
  }, [fetchNotifications, fetchUnreadCount, supabase]);

  const handleRowPress = useCallback(
    async (n: Notification) => {
      // Mark read optimistically; navigation happens unconditionally
      // even if the mark fails (the route works regardless).
      if (isUnread(n)) {
        markRead(n.id, supabase).catch(() => {});
      }
      const route = getNotificationRoute(n, viewer);
      if (route) {
        // The deep-link params are validated at runtime by expo-router;
        // cast through any to keep the route call idiomatic with the
        // rest of the codebase's `as any` convention.
        router.push(route as any);
      }
    },
    [markRead, supabase, viewer]
  );

  const handleMarkAllRead = useCallback(() => {
    if (!hasUnread) return;
    markAllRead(supabase).catch(() => {});
  }, [hasUnread, markAllRead, supabase]);

  const headerRight = showMarkAllRead
    ? { label: 'Mark all read', onPress: handleMarkAllRead }
    : undefined;

  const body = (
    <ScrollView
      className="flex-1 px-[24px]"
      contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mb-5"
        contentContainerClassName="gap-2">
        {tabs.map((tab) => {
          const active = tab.key === activeTabKey;
          return (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTabKey(tab.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={tab.label}
              className={`rounded-pill px-4 py-2 ${
                active ? 'bg-ink' : 'bg-canvas'
              }`}>
              <Text
                className={`font-medium text-body-sm ${
                  active ? 'text-white' : 'text-ink'
                }`}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Loading (initial fetch only — subsequent fetches use RefreshControl) */}
      {isLoading && notifications.length === 0 ? (
        <View className="items-center pt-16">
          <ActivityIndicator color="#1A6B4A" />
        </View>
      ) : !hasAny ? (
        <NotificationsEmptyState />
      ) : (
        <>
          <NotificationSection title="Today" items={grouped.today} onPress={handleRowPress} />
          {grouped.yesterday.length > 0 && (
            <NotificationSection
              title="Yesterday"
              items={grouped.yesterday}
              onPress={handleRowPress}
            />
          )}
          {grouped.earlier.length > 0 && (
            <NotificationSection
              title="Earlier"
              items={grouped.earlier}
              onPress={handleRowPress}
            />
          )}
        </>
      )}
    </ScrollView>
  );

  if (!showHeader) return body;

  return (
    <View className="flex-1 bg-bg">
      <ScreenHeader
        title="Notifications"
        showBack
        centerTitle
        rightText={headerRight}
      />
      {body}
    </View>
  );
};

// ─── Section + Row ───────────────────────────────────────────────────────────

interface NotificationSectionProps {
  title: string;
  items: Notification[];
  onPress: (n: Notification) => void;
}

const NotificationSection = ({ title, items, onPress }: NotificationSectionProps) => (
  <View className="mb-2">
    <Text className="mb-3 font-semibold text-body-sm text-ink3">{title}</Text>
    {items.map((item) => (
      <NotificationRow key={item.id} item={item} onPress={onPress} />
    ))}
  </View>
);

interface NotificationRowProps {
  item: Notification;
  onPress: (n: Notification) => void;
}

/** Returns 2 uppercase initials from a display name, or a question mark. */
const initialsOf = (name: string | null): string => {
  if (!name) return '·';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return ((parts[0][0] ?? '') + (parts[parts.length - 1][0] ?? '')).toUpperCase();
};

const NotificationRow = ({ item, onPress }: NotificationRowProps) => {
  const unread = isUnread(item);
  return (
    <Pressable
      onPress={() => onPress(item)}
      accessibilityRole="button"
      accessibilityLabel={item.title}
      className={`mb-4 flex-row items-start border-b border-row-divider pb-4 ${
        unread ? 'bg-brand-light/30 rounded-card px-3 -mx-3' : ''
      }`}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
      <View className="mr-3 h-10 w-10 items-center justify-center rounded-pill bg-brand-light">
        <Text className="font-bold text-caption text-brand">
          {initialsOf(item.actorName)}
        </Text>
      </View>
      <View className="flex-1">
        <Text className="font-semibold text-body text-ink" numberOfLines={1}>
          {item.title}
        </Text>
        <Text className="mt-1 font-sans text-body-sm text-ink2" numberOfLines={2}>
          {item.body}
        </Text>
        <Text className="mt-1 font-sans text-caption text-ink3">
          {relativeTime(item.createdAt)}
        </Text>
      </View>
      {unread && <View className="mt-2 h-2 w-2 rounded-pill bg-brand" />}
    </Pressable>
  );
};

// ─── Relative time helper ────────────────────────────────────────────────────

const MIN_MS = 60 * 1000;
const HR_MS = 60 * MIN_MS;
const DAY_MS = 24 * HR_MS;

const relativeTime = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < MIN_MS) return 'just now';
  if (diff < HR_MS) return `${Math.floor(diff / MIN_MS)}m ago`;
  if (diff < DAY_MS) return `${Math.floor(diff / HR_MS)}h ago`;
  if (diff < 7 * DAY_MS) return `${Math.floor(diff / DAY_MS)}d ago`;
  const d = new Date(iso);
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
};
