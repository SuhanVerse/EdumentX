import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ScrollView,
  View,
  Text,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useUser } from '@clerk/expo';
import {
  Home,
  Inbox,
  Star,
  Eye,
  ChevronRight,
  User,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { LucideIcon } from 'lucide-react-native';

import { ScreenBody, dockBottomReserve } from '@/src/components/layout/ScreenBody';
import { tokens } from '@/src/theme/tokens';
import { useAuthStore } from '@/src/store/authStore';
import { useClerkSupabase } from '@/src/hooks/useClerkSupabase';
import {
  getLandlordDashboard,
  type LandlordDashboard as LandlordDashboardData,
} from '@/src/services/dashboard.service';

// ─── Public Types ───────────────────────────────────────────────────────────

export interface StatItem {
  /** Display label beneath the number. */
  label: string;
  /** Large numeric value shown in DM Serif Display. */
  value: string;
  /** Optional secondary label (e.g. "24 Reviews"). */
  sublabel?: string;
  /** Visual treatment: dark (black), cream (warm), mint (green). */
  variant: 'dark' | 'cream' | 'mint';
  /** Lucide icon rendered top-right of the card. */
  icon: LucideIcon;
}

export interface InsightItem {
  /** Background colour of the circular icon badge. */
  iconBg: string;
  /** Lucide icon rendered inside the badge. */
  icon: LucideIcon;
  /** Primary title (bold). */
  title: string;
  /** Secondary subtitle (muted). */
  subtitle: string;
}

export interface ActivityItem {
  /** Visit-request id this row links to, for tap-through navigation. */
  id?: string;
  /** 1-2 character initials for the avatar circle. */
  initials: string;
  /** Person's display name. */
  name: string;
  /** Action verb phrase (e.g. "requested visit"). */
  action: string;
  /** Property / listing detail line. */
  detail: string;
  /** Relative timestamp. */
  time: string;
  /** Optional pill badge text (e.g. "New"). Omit for chevron. */
  badge?: string;
}

export interface LandlordDashboardProps {
  /** Override: landlord's display name (falls back to auth profile). */
  landlordName?: string;
  /** Stat card data. */
  stats?: StatItem[];
  /** Insight row data. */
  insights?: InsightItem[];
  /** Recent activity feed. */
  activity?: ActivityItem[];
  /** Called when the user taps any "add listing" affordance. */
  onAddListing?: () => void;
  /** Called when the user taps an insight row (by index). */
  onInsightPress?: (index: number) => void;
  /** Called when the user taps an activity row (by index). */
  onActivityPress?: (index: number) => void;
  /** Called when the user taps "See all" in the activity header. */
  onSeeAllActivity?: () => void;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function computeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Returns the number of milliseconds until the next greeting boundary
 * (12:00 or 17:00 local time), capped at 60 s so the timer stays current
 * even if the user leaves the screen open overnight.
 */
function msUntilNextBoundary(): number {
  const now = new Date();
  const boundaries = [12, 17];
  for (const h of boundaries) {
    const boundary = new Date(now);
    boundary.setHours(h, 0, 0, 0);
    if (boundary > now) return Math.min(boundary.getTime() - now.getTime(), 60_000);
  }
  // After 17:00 — next boundary is tomorrow 12:00, but cap at 60 s.
  return 60_000;
}

// ─── Add New Listing button (pill outline) ────────────────────────────────

function AddNewListingButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity style={s.pillButton} onPress={onPress} activeOpacity={0.7}>
      <Text style={s.plusIcon}>+</Text>
      <Text style={s.pillButtonLabel}>Add new listing</Text>
    </TouchableOpacity>
  );
}

// ─── Loading / empty state ───────────────────────────────────────────────────

/** Shown while the first fetch is in flight, and if it fails. */
const EMPTY_STATS: StatItem[] = [
  { label: 'Active Listings', value: '—', variant: 'dark', icon: Home },
  { label: 'Visit Requests', value: '—', variant: 'cream', icon: Inbox },
  { label: 'No reviews yet', value: '—', variant: 'mint', icon: Star },
];

// ─── Live-data shaping ──────────────────────────────────────────────────────

function buildStats(d: LandlordDashboardData): StatItem[] {
  return [
    {
      label: 'Active Listings',
      value: String(d.activeListings),
      variant: 'dark',
      icon: Home,
    },
    {
      label: 'Visit Requests',
      value: String(d.pendingRequests),
      variant: 'cream',
      icon: Inbox,
    },
    {
      label: d.totalReviews === 1 ? '1 Review' : `${d.totalReviews} Reviews`,
      value: d.totalReviews > 0 ? d.avgRating.toFixed(1) : '—',
      variant: 'mint',
      icon: Star,
    },
  ];
}

function buildInsights(d: LandlordDashboardData): InsightItem[] {
  return [
    {
      icon: Eye,
      iconBg: '#3B82F6',
      title: `${d.totalViews} total views`,
      subtitle: `Across ${d.activeListings} ${
        d.activeListings === 1 ? 'listing' : 'listings'
      }`,
    },
    {
      icon: Inbox,
      iconBg: '#F59E0B',
      title: `${d.requestRate}% request rate`,
      subtitle:
        d.totalViews > 0 ? 'Visit requests per listing view' : 'No views yet',
    },
    {
      icon: Star,
      iconBg: '#1A6B4A',
      title: d.totalSaves === 1 ? '1 saved listing' : `${d.totalSaves} saved listings`,
      subtitle: 'Tenants who bookmarked your properties',
    },
  ];
}

/** "SK" from "Sandeep Khatri"; falls back to a neutral glyph. */
function initialsOf(name: string | null): string {
  if (!name) return '··';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

/** Coarse relative time — good enough for a feed, no dependency needed. */
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const mins = Math.floor((Date.now() - then) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'Yesterday' : `${days}d ago`;
}

function buildActivity(d: LandlordDashboardData): ActivityItem[] {
  return d.activity.map((a, idx) => ({
    id: a.id,
    initials: initialsOf(a.name),
    name: a.name ?? 'Someone',
    action: a.action,
    detail: a.detail,
    time: relativeTime(a.at),
    // Only the newest row gets the "New" pill.
    badge: idx === 0 ? 'New' : undefined,
  }));
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function StatCard({ item }: { item: StatItem }) {
  const isMint = item.variant === 'mint';
  const iconColor =
    item.variant === 'dark'
      ? 'rgba(255,255,255,0.5)'
      : isMint
        ? tokens.color.brand
        : tokens.color.ink;

  return (
    <View
      style={[
        s.statCard,
        item.variant === 'dark' && s.statDark,
        item.variant === 'cream' && s.statCream,
        isMint && s.statMint,
      ]}
      accessibilityLabel={`${item.value} ${item.label}`}
    >
      {/* Icon — top-right */}
      <View style={s.statIconRow}>
        <View style={s.statSpacer} />
        {isMint ? (
          <Star size={18} color={tokens.color.brand} fill={tokens.color.brand} strokeWidth={1.8} />
        ) : (
          <item.icon size={18} color={iconColor} strokeWidth={1.8} />
        )}
      </View>

      {/* Large serif number */}
      <Text
        style={[
          s.statValue,
          item.variant === 'dark' && s.statValueLight,
        ]}
      >
        {item.value}
      </Text>

      {/* Label */}
      <Text
        style={[
          s.statLabel,
          item.variant === 'dark' && s.statLabelLight,
        ]}
      >
        {item.label}
      </Text>

      {item.sublabel ? (
        <Text
          style={[
            s.statLabel,
            item.variant === 'dark' && s.statLabelLight,
          ]}
        >
          {item.sublabel}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * Single horizontal row used by both Insights and Recent Activity cards.
 * Source of truth: 3 direct children (leading | text | trailing), explicit
 * `flexDirection: 'row'`, `textCol` takes remaining space, trailing is
 * auto-width (never `width: '100%'`).
 */
function DashboardRow({
  leading,
  title,
  subtitle,
  titleWeight = '500',
  trailing,
  onPress,
  accessibilityLabel,
}: {
  leading: React.ReactNode;
  title: string;
  subtitle: string;
  titleWeight?: '500' | '600';
  trailing: React.ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  const inner = (
    <View style={s.row}>
      <View style={s.leadingSlot}>{leading}</View>
      <View style={s.textCol}>
        <Text style={[s.rowTitle, { fontWeight: titleWeight }]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={s.rowSubtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <View style={s.trailingSlot}>{trailing}</View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [pressed && s.rowPressed]}
      >
        {inner}
      </Pressable>
    );
  }
  return inner;
}

function InsightRow({
  item,
  isLast,
  onPress,
}: {
  item: InsightItem;
  isLast: boolean;
  onPress?: () => void;
}) {
  return (
    <View style={!isLast ? s.rowBorder : undefined}>
      <DashboardRow
        leading={
          <View style={[s.iconCircle, { backgroundColor: item.iconBg }]}>
            <item.icon size={14} color="#FFFFFF" strokeWidth={2} />
          </View>
        }
        title={item.title}
        subtitle={item.subtitle}
        titleWeight="600"
        trailing={<ChevronRight size={16} color={tokens.color.ink3} strokeWidth={1.8} />}
        onPress={onPress}
        accessibilityLabel={item.title}
      />
    </View>
  );
}

function ActivityRow({
  item,
  isLast,
  onPress,
}: {
  item: ActivityItem;
  isLast: boolean;
  onPress?: () => void;
}) {
  const title = item.action ? `${item.name} ${item.action}` : item.name;
  const subtitle = `${item.detail} · ${item.time}`;
  return (
    <View style={!isLast ? s.rowBorder : undefined}>
      <DashboardRow
        leading={
          <View style={s.avatar}>
            <Text style={s.avatarText}>{item.initials}</Text>
          </View>
        }
        title={title}
        subtitle={subtitle}
        titleWeight="600"
        trailing={
          item.badge ? (
            <View style={s.badge}>
              <Text style={s.badgeText}>{item.badge}</Text>
            </View>
          ) : (
            <ChevronRight size={16} color={tokens.color.ink3} strokeWidth={1.8} />
          )
        }
        onPress={onPress}
        accessibilityLabel={title}
      />
    </View>
  );
}

// ─── Main Screen ────────────────────────────────────────────────────────────

export default function LandlordDashboard({
  landlordName: landlordNameProp,
  stats: statsProp,
  insights: insightsProp,
  activity: activityProp,
  onAddListing,
  onInsightPress,
  onActivityPress,
  onSeeAllActivity,
}: LandlordDashboardProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const profile = useAuthStore((st) => st.profile);
  const { user } = useUser();
  const supabase = useClerkSupabase();
  const clerkId = user?.id;

  // ── Live dashboard data ─────────────────────────────────────────────
  const [data, setData] = useState<LandlordDashboardData | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (!clerkId) return;
      if (mode === 'refresh') setRefreshing(true);

      const result = await getLandlordDashboard(clerkId, supabase);
      if (result.success) setData(result.data);
      else console.warn('[dashboard] load failed:', result.error);

      setRefreshing(false);
    },
    [clerkId, supabase],
  );

  useEffect(() => {
    load('initial');
  }, [load]);

  // Publishing a listing or acting on a request changes these numbers.
  useFocusEffect(
    useCallback(() => {
      load('refresh');
    }, [load]),
  );

  // Explicit props win (used by previews/tests), then live data, then a
  // neutral placeholder — never the old demo numbers.
  const stats = useMemo(
    () => statsProp ?? (data ? buildStats(data) : EMPTY_STATS),
    [statsProp, data],
  );
  const insights = useMemo(
    () => insightsProp ?? (data ? buildInsights(data) : []),
    [insightsProp, data],
  );
  const activity = useMemo(
    () => activityProp ?? (data ? buildActivity(data) : []),
    [activityProp, data],
  );

  // ── Reactive greeting — recomputes at each 12:00 / 17:00 boundary ──
  const [greeting, setGreeting] = useState(computeGreeting);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timeout = setTimeout(() => {
        setGreeting(computeGreeting());
        schedule();
      }, msUntilNextBoundary());
    };
    schedule();
    return () => clearTimeout(timeout);
  }, []);

  // Derive display name: prop override > auth profile > temporary fallback.
  // Use 'there' (not a fake name) when no identity is available.
  const displayName =
    landlordNameProp ?? profile?.full_name?.split(' ')[0] ?? 'there';

  const navigateToAddListing = () => {
    if (onAddListing) {
      onAddListing();
    } else {
      router.push('/(landlord)/listing/new/step-1' as never);
    }
  };

  // expo-router renders this screen without props, so the callbacks below are
  // normally undefined — fall back to real navigation. A row with an `id` opens
  // that visit request; "See all" jumps to the requests tab.
  const handleActivityPress = (index: number) => {
    if (onActivityPress) {
      onActivityPress(index);
      return;
    }
    const id = activity[index]?.id;
    if (id) {
      router.push({ pathname: '/(landlord)/request/[id]', params: { id } } as never);
    }
  };

  const handleSeeAllActivity = () => {
    if (onSeeAllActivity) {
      onSeeAllActivity();
    } else {
      router.push('/(landlord)/(tabs)/requests' as never);
    }
  };

  return (
    <ScreenBody>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: dockBottomReserve(insets.bottom) }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load('refresh')} />
        }
      >
        {/* ── Header ────────────────────────────────────────── */}
        <View style={s.header}>
          {/* Avatar placeholder */}
          <View style={s.headerAvatar}>
            <User size={20} color={tokens.color.ink3} strokeWidth={1.8} />
          </View>

          {/* Greeting stack */}
          <View style={s.headerGreeting}>
            <Text style={s.greetingText}>{greeting}</Text>
            <Text style={s.nameText}>{displayName}</Text>
          </View>

          {/* (Add listing moved to the pill below) */}
        </View>

        {/* Hairline separator */}
        <View style={s.separator} />

        {/* ── Stats Row ─────────────────────────────────────── */}
        <View style={s.statsRow}>
          {stats.map((stat) => {
            const card = <StatCard item={stat} />;
            const navigate = () =>
              router.push('/(landlord)/(tabs)/listings' as never);

            return stat.label === 'Active Listings' ? (
              <TouchableOpacity
                key={stat.label}
                style={{ flex: 1 }}
                onPress={navigate}
                activeOpacity={0.7}
              >
                {card}
              </TouchableOpacity>
            ) : (
              <View key={stat.label} style={{ flex: 1 }}>
                {card}
              </View>
            );
          })}
        </View>

        {/* ── Add New Listing (pill outline) ────────────────── */}
        <AddNewListingButton onPress={navigateToAddListing} />

        {/* ── Insights ──────────────────────────────────────── */}
        <Text style={s.sectionTitle}>INSIGHTS</Text>
        <View style={s.card}>
          {insights.length === 0 ? (
            <Text style={s.emptyRow}>
              Publish a listing to start seeing views and requests.
            </Text>
          ) : (
            insights.map((item, idx) => (
              <InsightRow
                key={idx}
                item={item}
                isLast={idx === insights.length - 1}
                onPress={() => onInsightPress?.(idx)}
              />
            ))
          )}
        </View>

        {/* ── Recent Activity ───────────────────────────────── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>RECENT ACTIVITY</Text>
          <Pressable onPress={handleSeeAllActivity} style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1 }]}>
            <Text style={s.seeAllText}>See all</Text>
          </Pressable>
        </View>
        <View style={s.card}>
          {activity.length === 0 ? (
            <Text style={s.emptyRow}>No activity yet.</Text>
          ) : (
            activity.map((item, idx) => (
              <ActivityRow
                key={idx}
                item={item}
                isLast={idx === activity.length - 1}
                onPress={() => handleActivityPress(idx)}
              />
            ))
          )}
        </View>
      </ScrollView>
    </ScreenBody>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  /* ── Header ── */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 14,
  },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: tokens.color.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerGreeting: {
    flex: 1,
    marginLeft: 12,
  },
  greetingText: {
    fontFamily: tokens.font.sans,
    fontSize: tokens.size.bodySm,
    color: tokens.color.ink2,
  },
  nameText: {
    fontFamily: tokens.font.semibold,
    fontSize: tokens.size.h3,
    color: tokens.color.ink,
    marginTop: 1,
  },

  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: tokens.color.line,
    marginHorizontal: 24,
  },

  /* ── Stats Row ── */
  statsRow: {
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 24,
    marginTop: 20,
  },
  statCard: {
    borderRadius: 11,
    padding: 12,
    paddingTop: 10,
    minHeight: 105,
  },
  statDark: {
    backgroundColor: '#0A0A0A',
  },
  statCream: {
    backgroundColor: '#FEF3DC',
  },
  statMint: {
    backgroundColor: '#E8F5EE',
  },
  statIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  statSpacer: { flex: 1 },
  statValue: {
    fontFamily: tokens.font.display,
    fontSize: 28,
    lineHeight: 32,
    color: tokens.color.ink,
  },
  statValueLight: {
    color: '#FFFFFF',
  },
  statLabel: {
    fontFamily: tokens.font.sans,
    fontSize: tokens.size.caption,
    color: tokens.color.ink2,
    marginTop: 3,
  },
  statLabelLight: {
    color: 'rgba(255,255,255,0.5)',
  },

  /* ── Add listing button (pill outline) ── */
  pillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    borderWidth: 1,
    borderColor: '#0A0A0A',
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 24,
    marginTop: 16,
    backgroundColor: '#FFFFFF',
  },
  plusIcon: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0A0A0A',
    marginRight: 6,
  },
  pillButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0A0A0A',
  },

  /* ── Section headers ── */
  sectionTitle: {
    fontFamily: tokens.font.semibold,
    fontSize: tokens.size.label,
    color: tokens.color.ink3,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginLeft: 24,
    marginTop: 28,
    marginBottom: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 24,
  },
  seeAllText: {
    fontFamily: tokens.font.medium,
    fontSize: tokens.size.bodySm,
    color: tokens.color.brand,
  },

  /* ── Card ── */
  card: {
    marginHorizontal: 24,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: tokens.color.line,
    backgroundColor: tokens.color.bg,
    overflow: 'hidden',
  },

  emptyRow: {
    fontFamily: tokens.font.sans,
    fontSize: tokens.size.bodySm,
    color: tokens.color.ink3,
    paddingHorizontal: 12,
    paddingVertical: 16,
  },

  /* ── Shared row ── */
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    width: '100%',
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tokens.color.line,
  },
  rowPressed: {
    opacity: 0.55,
  },
  leadingSlot: {
    flexShrink: 0,
    marginRight: 10,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontFamily: tokens.font.sans,
    fontSize: tokens.size.bodySm,
    color: tokens.color.ink,
  },
  rowSubtitle: {
    fontFamily: tokens.font.sans,
    fontSize: tokens.size.caption,
    color: tokens.color.ink2,
    marginTop: 2,
  },
  trailingSlot: {
    flexShrink: 0,
    marginLeft: 8,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },

  /* ── Insight icon circle (coloured) ── */
  iconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ── Activity avatar ── */
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: tokens.color.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: tokens.font.semibold,
    fontSize: tokens.size.caption,
    color: tokens.color.ink2,
  },

  /* ── Badge pill ── */
  badge: {
    backgroundColor: '#FEF3DC',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontFamily: tokens.font.semibold,
    fontSize: tokens.size.micro,
    color: '#B45309',
  },
});
