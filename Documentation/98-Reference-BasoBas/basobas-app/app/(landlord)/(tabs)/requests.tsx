import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useUser } from '@clerk/expo';
import { Calendar, ChevronRight, Clock, History } from 'lucide-react-native';

import { ScreenBody } from '@/src/components/layout/ScreenBody';
import { Avatar, StatusPill, type LdStatus } from '@/src/components/visit/LandlordUI';
import { useVisitsStore, type LandlordRow } from '@/src/store/visitsStore';
import { markPastVisitsCompleted } from '@/src/services/visits.service';
import { DEMO_MODE } from '@/src/lib/demoMode';
import { useClerkSupabase } from '@/src/hooks/useClerkSupabase';
import { c, font, radius, shadow } from '@/src/theme/visitTokens';
import { TIME_SLOT_LABELS, dayLabel } from '@/src/types/property.types';

// ─── Status mapping ──────────────────────────────────────────────────────────

const UI_TO_PILL: Record<LandlordRow['uiStatus'], LdStatus> = {
  new: 'Pending',
  upcoming: 'Accepted',
  rescheduled: 'Rescheduled',
  discussion: 'Pending',
  completed: 'Accepted',
  finalized: 'Accepted',
  cancelled: 'Declined',
  rejected: 'Declined',
};

const isOpen = (row: LandlordRow): boolean =>
  ['new', 'upcoming', 'rescheduled', 'discussion', 'completed'].includes(row.uiStatus);

type FilterKey = 'all' | 'pending' | 'accepted';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'accepted', label: 'Accepted' },
];

const inFilter = (row: LandlordRow, filter: FilterKey): boolean => {
  switch (filter) {
    case 'pending':
      return row.uiStatus === 'new';
    case 'accepted':
      return row.uiStatus === 'upcoming';
    default:
      return isOpen(row);
  }
};

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function VisitRequestsScreen() {
  const router = useRouter();
  const { user } = useUser();
  const supabase = useClerkSupabase();
  const clerkId = user?.id;

  const rows = useVisitsStore((s) => s.landlordVisits);
  const isLoading = useVisitsStore((s) => s.isLoading);
  const fetchLandlordVisits = useVisitsStore((s) => s.fetchLandlordVisits);

  const [filter, setFilter] = useState<FilterKey>('all');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (!clerkId) return;
      if (mode === 'refresh') setRefreshing(true);
      await fetchLandlordVisits(supabase, clerkId);
      setRefreshing(false);
    },
    [clerkId, supabase, fetchLandlordVisits]
  );

  useEffect(() => {
    if (clerkId && rows.length === 0) load('initial');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clerkId]);

  // DEMO ONLY — long-press an accepted request to fast-forward its window
  // so the follow-up drawer can be demoed without waiting for real time.
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
              if (result.success && clerkId) await fetchLandlordVisits(supabase, clerkId);
            },
          },
        ]
      );
    },
    [supabase, clerkId, fetchLandlordVisits]
  );

  const active = useMemo(() => rows.filter(isOpen), [rows]);
  const pendingCount = useMemo(() => active.filter((r) => r.uiStatus === 'new').length, [active]);
  const acceptedCount = useMemo(
    () => active.filter((r) => r.uiStatus === 'upcoming').length,
    [active]
  );
  const filtered = useMemo(() => active.filter((r) => inFilter(r, filter)), [active, filter]);

  return (
    <ScreenBody className="flex-1 bg-bg">
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load('refresh')}
            tintColor="#1A6B4A"
            colors={['#1A6B4A']}
          />
        }>
        {/* Title row + history */}
        <View style={styles.titleRow}>
          <Text style={styles.title}>Visit Requests</Text>
          <TouchableOpacity
            onPress={() => router.push('/(landlord)/visits' as any)}
            accessibilityRole="button"
            accessibilityLabel="Visit history"
            activeOpacity={0.6}
            style={styles.historyBtn}>
            <History size={13} color={c.meta} strokeWidth={2} />
            <Text style={styles.historyText}>History</Text>
          </TouchableOpacity>
        </View>

        {/* Summary strip */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, styles.summaryPending]}>
            <Text style={styles.summaryNumber}>{pendingCount}</Text>
            <Text style={styles.summaryLabel}>Awaiting review</Text>
          </View>
          <View style={[styles.summaryCard, styles.summaryAccepted]}>
            <Text style={[styles.summaryNumber, styles.summaryNumberGreen]}>{acceptedCount}</Text>
            <Text style={[styles.summaryLabel, styles.summaryLabelGreen]}>Accepted</Text>
          </View>
        </View>

        {/* Segmented filter */}
        <View style={styles.segmentWrap}>
          {FILTERS.map((f) => {
            const count =
              f.key === 'pending'
                ? pendingCount
                : f.key === 'accepted'
                  ? acceptedCount
                  : active.length;
            const isActive = f.key === filter;
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => setFilter(f.key)}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                activeOpacity={0.8}
                style={[styles.segment, isActive && styles.segmentActive]}>
                <Text style={[styles.segmentText, isActive && styles.segmentTextActive]}>
                  {f.label} {count}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* List */}
        {isLoading && rows.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator size="small" color="#1A6B4A" />
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyText}>
              No {filter === 'all' ? '' : `${filter} `}requests right now.
            </Text>
          </View>
        ) : (
          filtered.map((item) => (
            <RequestCard
              key={item.id}
              row={item}
              onPress={() =>
                router.push({
                  pathname: '/(landlord)/request/[id]',
                  params: { id: item.id },
                } as any)
              }
              onLongPress={
                DEMO_MODE && item.uiStatus === 'upcoming'
                  ? () => handleForceTimePassed(item.id, item.propertyTitle)
                  : undefined
              }
            />
          ))
        )}
      </ScrollView>
    </ScreenBody>
  );
}

// ─── Request card ────────────────────────────────────────────────────────────

const RequestCard = ({
  row,
  onPress,
  onLongPress,
}: {
  row: LandlordRow;
  onPress: () => void;
  onLongPress?: () => void;
}) => {
  const isPending = row.uiStatus === 'new';
  const pill = UI_TO_PILL[row.uiStatus];
  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={500}
      accessibilityRole="button"
      accessibilityLabel={`Request from ${row.tenantName ?? 'tenant'}`}
      activeOpacity={0.85}
      style={styles.card}>
      <View style={styles.cardTop}>
        <Avatar name={row.tenantName ?? 'Tenant'} size={44} />
        <View style={styles.cardNameWrap}>
          <Text numberOfLines={1} style={styles.cardName}>
            {row.tenantName ?? 'A tenant'}
          </Text>
          <Text numberOfLines={1} style={styles.cardProperty}>
            {row.propertyTitle ?? 'Your listing'}
          </Text>
        </View>
        <StatusPill status={pill} />
      </View>

      <View style={styles.insetBar}>
        <View style={styles.insetItem}>
          <Calendar size={12} color={c.meta} strokeWidth={2} />
          <Text style={styles.insetText}>{dayLabel(row.requestedDate)}</Text>
        </View>
        <View style={styles.insetDivider} />
        <View style={styles.insetItem}>
          <Clock size={12} color={c.meta} strokeWidth={2} />
          <Text style={styles.insetText}>{TIME_SLOT_LABELS[row.timeSlot]}</Text>
        </View>
        {isPending ? (
          <View style={styles.reviewWrap}>
            <Text style={styles.reviewText}>Review</Text>
            <ChevronRight size={13} color={c.ink} strokeWidth={2.2} />
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  body: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 130,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: {
    fontFamily: font.sansSemi,
    fontSize: 22,
    color: c.ink,
  },
  historyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.pill,
    backgroundColor: c.surfaceGrey,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  historyText: {
    fontFamily: font.sansSemi,
    fontSize: 12,
    color: c.meta,
    marginLeft: 6,
  },
  summaryRow: {
    flexDirection: 'row',
  },
  summaryCard: {
    flex: 1,
    borderRadius: 18,
    padding: 16,
  },
  summaryPending: {
    backgroundColor: '#0A0A0A',
    marginRight: 12,
  },
  summaryAccepted: {
    backgroundColor: c.greenBg,
  },
  summaryNumber: {
    fontFamily: font.sansSemi,
    fontSize: 26,
    color: '#FFFFFF',
    lineHeight: 32,
  },
  summaryNumberGreen: {
    color: c.accent,
  },
  summaryLabel: {
    marginTop: 2,
    fontFamily: font.sansSemi,
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
  },
  summaryLabelGreen: {
    color: 'rgba(26,107,74,0.7)',
  },
  segmentWrap: {
    flexDirection: 'row',
    borderRadius: radius.pill,
    backgroundColor: c.hairlineSoft,
    padding: 4,
    marginTop: 16,
  },
  segment: {
    flex: 1,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: {
    backgroundColor: '#FFFFFF',
    ...shadow.card,
  },
  segmentText: {
    fontFamily: font.sansSemi,
    fontSize: 12,
    color: '#8A8A8A',
  },
  segmentTextActive: {
    color: c.ink,
  },
  center: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontFamily: font.sans,
    fontSize: 12,
    color: c.faint,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginTop: 12,
    ...shadow.card,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardNameWrap: {
    flex: 1,
    minWidth: 0,
    marginLeft: 12,
    marginRight: 10,
  },
  cardName: {
    fontFamily: font.sansSemi,
    fontSize: 14,
    color: c.ink,
  },
  cardProperty: {
    marginTop: 2,
    fontFamily: font.sans,
    fontSize: 11,
    color: c.faint,
  },
  insetBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: c.surfaceAlt,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 14,
  },
  insetItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  insetText: {
    fontFamily: font.sans,
    fontSize: 11,
    color: c.meta,
    marginLeft: 6,
  },
  insetDivider: {
    width: 1,
    height: 12,
    backgroundColor: c.hairline,
    marginHorizontal: 12,
  },
  reviewWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  reviewText: {
    fontFamily: font.sansSemi,
    fontSize: 11,
    color: c.ink,
  },
});
