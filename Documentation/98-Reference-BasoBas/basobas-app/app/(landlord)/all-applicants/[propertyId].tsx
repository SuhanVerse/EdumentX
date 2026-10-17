import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useUser } from '@clerk/expo';
import { BadgeCheck, ChevronRight, Search } from 'lucide-react-native';

import { Avatar, ScreenShell, StatusPill, type LdStatus } from '@/src/components/visit/LandlordUI';
import { useVisitsStore, type LandlordRow } from '@/src/store/visitsStore';
import { useClerkSupabase } from '@/src/hooks/useClerkSupabase';
import { c, font, radius, shadow } from '@/src/theme/visitTokens';

// ─── Mappings ────────────────────────────────────────────────────────────────

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

type ChipKey = 'all' | 'pending' | 'accepted' | 'declined';

const CHIPS: { key: ChipKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'declined', label: 'Declined' },
];

const inChip = (row: LandlordRow, chip: ChipKey): boolean => {
  switch (chip) {
    case 'pending':
      return row.uiStatus === 'new';
    case 'accepted':
      return row.uiStatus === 'upcoming';
    case 'declined':
      return row.uiStatus === 'rejected' || row.uiStatus === 'cancelled';
    default:
      return true;
  }
};

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function AllApplicantsScreen() {
  const router = useRouter();
  const { propertyId } = useLocalSearchParams<{ propertyId: string }>();
  const supabase = useClerkSupabase();
  const { user } = useUser();

  const landlordVisits = useVisitsStore((s) => s.landlordVisits);
  const fetchLandlordVisits = useVisitsStore((s) => s.fetchLandlordVisits);

  const [chip, setChip] = useState<ChipKey>('all');

  useEffect(() => {
    if (landlordVisits.length === 0 && user?.id) {
      fetchLandlordVisits(supabase, user.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const applicants = useMemo(
    () => landlordVisits.filter((r) => r.propertyId === propertyId),
    [landlordVisits, propertyId]
  );
  const filtered = useMemo(() => applicants.filter((r) => inChip(r, chip)), [applicants, chip]);
  const property = applicants[0];

  const openRequest = useCallback(
    (id: string) => {
      router.push({ pathname: '/(landlord)/request/[id]', params: { id } } as any);
    },
    [router]
  );

  return (
    <ScreenShell title="All Applicants" showBack paddingBottom={32}>
      {/* Property context */}
      {property ? (
        <View style={styles.propertyPanel}>
          <View style={styles.propertyCopy}>
            <Text numberOfLines={1} style={styles.propertyTitle}>
              {property.propertyTitle ?? 'Your listing'}
            </Text>
            <Text style={styles.propertyCount}>{applicants.length} applicants total</Text>
          </View>
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: '/(landlord)/listing/[id]',
                params: { id: propertyId },
              } as any)
            }
            accessibilityRole="button"
            accessibilityLabel="Open listing"
            activeOpacity={0.8}
            style={styles.searchBtn}>
            <Search size={15} color={c.ink} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipScroll}
        contentContainerStyle={styles.chipRow}>
        {CHIPS.map((chipDef) => {
          const isActive = chipDef.key === chip;
          return (
            <TouchableOpacity
              key={chipDef.key}
              onPress={() => setChip(chipDef.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              activeOpacity={0.8}
              style={[styles.chip, isActive && styles.chipActive]}>
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                {chipDef.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* List */}
      {filtered.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>
            No {chip === 'all' ? '' : `${chip} `}applicants right now.
          </Text>
        </View>
      ) : (
        filtered.map((item) => (
          <TouchableOpacity
            key={item.id}
            onPress={() => openRequest(item.id)}
            accessibilityRole="button"
            accessibilityLabel={`Applicant ${item.tenantName ?? 'tenant'}`}
            activeOpacity={0.85}
            style={styles.card}>
            <Avatar name={item.tenantName ?? 'Tenant'} size={48} />
            <View style={styles.cardCopy}>
              <View style={styles.cardNameRow}>
                <Text numberOfLines={1} style={styles.cardName}>
                  {item.tenantName ?? 'A tenant'}
                </Text>
                <BadgeCheck size={13} color={c.accent} strokeWidth={2} />
              </View>
              <Text numberOfLines={1} style={styles.cardJob}>
                {item.note ?? 'Verified tenant'}
              </Text>
            </View>
            <StatusPill status={UI_TO_PILL[item.uiStatus]} />
            <ChevronRight size={15} color="#CCCCCC" strokeWidth={2} style={styles.chevron} />
          </TouchableOpacity>
        ))
      )}
    </ScreenShell>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  propertyPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: c.surfaceAlt,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  propertyCopy: {
    flex: 1,
    minWidth: 0,
  },
  propertyTitle: {
    fontFamily: font.sansSemi,
    fontSize: 13,
    color: c.ink,
  },
  propertyCount: {
    marginTop: 2,
    fontFamily: font.sans,
    fontSize: 11,
    color: c.faint,
  },
  searchBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
    ...shadow.card,
  },
  chipScroll: {
    flexGrow: 0,
  },
  chipRow: {
    paddingRight: 8,
  },
  chip: {
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: c.surfaceGrey,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: c.ink,
  },
  chipText: {
    fontFamily: font.sansSemi,
    fontSize: 12,
    color: c.meta,
  },
  chipTextActive: {
    color: '#FFFFFF',
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    ...shadow.card,
  },
  cardCopy: {
    flex: 1,
    minWidth: 0,
    marginLeft: 12,
    marginRight: 10,
  },
  cardNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardName: {
    fontFamily: font.sansSemi,
    fontSize: 13,
    color: c.ink,
    marginRight: 5,
  },
  cardJob: {
    marginTop: 3,
    fontFamily: font.sans,
    fontSize: 11,
    color: c.faint,
  },
  chevron: {
    marginLeft: 10,
  },
});
