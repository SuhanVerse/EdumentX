import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Calendar, CheckCircle2, MapPin, Phone, X } from 'lucide-react-native';

import { Avatar, ScreenShell, StatusPill } from '@/src/components/visit/LandlordUI';
import { useVisitsStore } from '@/src/store/visitsStore';
import { useClerkSupabase } from '@/src/hooks/useClerkSupabase';
import { useAuthStore } from '@/src/store/authStore';
import { getVisitRequest } from '@/src/services/visits.service';
import { getPropertyWithUnlockedLocation } from '@/src/services/properties.service';
import { c, font, radius, shadow } from '@/src/theme/visitTokens';
import {
  dayLabel,
  TIME_SLOT_LABELS,
  type LandlordVisitRequest,
  type PropertyUnlocked,
} from '@/src/types/property.types';

export default function DetailsSharedScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const supabase = useClerkSupabase();
  const profile = useAuthStore((st) => st.profile);

  const storeRow = useVisitsStore((s) => s.landlordVisits.find((v) => v.id === id));

  // Store row paints instantly when navigated from share-details; the direct
  // fetch covers cold deep-links where the store is empty.
  const [visit, setVisit] = useState<LandlordVisitRequest | null>(storeRow ?? null);
  const [property, setProperty] = useState<PropertyUnlocked | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!id) return;
    getVisitRequest(id, supabase).then((r) => {
      if (!cancelled && r.success && r.data) setVisit(r.data);
    });
    return () => {
      cancelled = true;
    };
  }, [id, supabase]);

  useEffect(() => {
    let cancelled = false;
    if (!visit?.propertyId) return;
    getPropertyWithUnlockedLocation(visit.propertyId, supabase).then((detail) => {
      if (!cancelled && detail.success) setProperty(detail.data);
    });
    return () => {
      cancelled = true;
    };
  }, [visit?.propertyId, supabase]);

  const name = visit?.tenantName ?? 'the tenant';
  const firstName = name.split(' ')[0] ?? name;
  const visitLine = visit
    ? `${dayLabel(visit.requestedDate)} · ${TIME_SLOT_LABELS[visit.timeSlot]}`
    : '—';
  const sharedAddress =
    property?.locationAddress ?? property?.title ?? 'Your listing pin';
  const phone = profile?.phone ?? 'No number on file';

  return (
    <ScreenShell title="Visit Accepted" showBack paddingBottom={48}>
      {/* Success hero — one block so the stack keeps its internal rhythm */}
      <View style={styles.hero}>
        <View style={styles.haloWrap}>
          <View style={styles.halo}>
            <View style={styles.haloInner}>
              <CheckCircle2 size={28} color="#FFFFFF" strokeWidth={2.2} />
            </View>
          </View>
        </View>
        <Text style={styles.headline}>Details sent to {firstName}</Text>
        <Text style={styles.subcopy}>
          They&apos;ll get a notification with your pin location and contact number.
        </Text>
      </View>

      {/* Tenant details card — same grammar as the Share Details screen */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <Avatar name={name} size={48} />
          <View style={styles.summaryNameWrap}>
            <Text numberOfLines={1} style={styles.summaryName}>
              {name}
            </Text>
            <Text style={styles.summarySub}>Requesting tenant</Text>
          </View>
          <StatusPill status="Accepted" />
        </View>

        <View style={styles.row}>
          <Calendar size={15} color={c.meta} strokeWidth={2} />
          <View style={styles.rowCopy}>
            <Text style={styles.rowLabel}>Requested</Text>
            <Text style={styles.rowValue}>{visitLine}</Text>
          </View>
        </View>

        <View style={[styles.row, styles.rowBorder]}>
          <MapPin size={15} color={c.meta} strokeWidth={2} />
          <View style={styles.rowCopy}>
            <Text style={styles.rowLabel}>Location</Text>
            <Text numberOfLines={1} style={styles.rowValue}>
              {sharedAddress}
            </Text>
          </View>
          <View style={styles.onBadge}>
            <Text style={styles.onText}>SHARED</Text>
          </View>
        </View>

        <View style={[styles.row, styles.rowBorder]}>
          <Phone size={15} color={c.meta} strokeWidth={2} />
          <View style={styles.rowCopy}>
            <Text style={styles.rowLabel}>Contact</Text>
            <Text style={styles.rowValue}>{phone}</Text>
          </View>
          <View style={styles.onBadge}>
            <Text style={styles.onText}>SHARED</Text>
          </View>
        </View>
      </View>

      {/* Revoke */}
      <TouchableOpacity
        onPress={() => router.replace('/(landlord)/(tabs)/requests' as any)}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Revoke shared details"
        style={styles.revokeBtn}>
        <X size={14} color="#C0392B" strokeWidth={2.4} />
        <Text style={styles.revokeText}>Revoke shared details</Text>
      </TouchableOpacity>

      {/* Done */}
      <TouchableOpacity
        onPress={() => router.replace('/(landlord)/(tabs)/requests' as any)}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Done"
        style={styles.doneBtn}>
        <Text style={styles.doneText}>Done</Text>
      </TouchableOpacity>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  haloWrap: {
    alignItems: 'center',
    marginTop: 40,
  },
  halo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F5EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  haloInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: c.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headline: {
    marginTop: 20,
    fontFamily: font.serif,
    fontSize: 24,
    color: c.ink,
    textAlign: 'center',
  },
  subcopy: {
    marginTop: 8,
    marginBottom: 24,
    fontFamily: font.sans,
    fontSize: 12,
    lineHeight: 18,
    color: c.meta,
    textAlign: 'center',
    maxWidth: 280,
    alignSelf: 'center',
  },
  hero: {
    alignItems: 'center',
  },
  summaryCard: {
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: c.hairlineSoft,
    overflow: 'hidden',
    ...shadow.card,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: c.hairlineSoft,
  },
  summaryNameWrap: {
    flex: 1,
    minWidth: 0,
    marginLeft: 12,
    marginRight: 10,
  },
  summaryName: {
    fontFamily: font.sansSemi,
    fontSize: 17,
    color: c.ink,
  },
  summarySub: {
    marginTop: 2,
    fontFamily: font.sans,
    fontSize: 11,
    color: c.faint,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowBorder: {
    borderTopWidth: 1,
    borderTopColor: c.hairlineSoft,
  },
  rowCopy: {
    flex: 1,
    minWidth: 0,
    marginLeft: 12,
  },
  rowLabel: {
    fontFamily: font.sans,
    fontSize: 10,
    color: c.faint,
  },
  rowValue: {
    marginTop: 2,
    fontFamily: font.sansSemi,
    fontSize: 13,
    color: c.ink,
  },
  onBadge: {
    borderRadius: radius.pill,
    backgroundColor: c.greenBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  onText: {
    fontFamily: font.sansSemi,
    fontSize: 9,
    color: c.accent,
  },
  revokeBtn: {
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: '#FDECEC',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  revokeText: {
    fontFamily: font.sansSemi,
    fontSize: 12,
    color: '#C0392B',
    marginLeft: 6,
  },
  doneBtn: {
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: c.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneText: {
    fontFamily: font.sansSemi,
    fontSize: 13,
    color: '#FFFFFF',
  },
});
