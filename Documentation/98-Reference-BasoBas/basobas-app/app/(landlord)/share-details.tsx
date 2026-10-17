import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowRight,
  Calendar,
  Clock,
  Copy,
  MapPin,
  Phone,
} from 'lucide-react-native';

import { AppMapView } from '@/src/components/map/AppMap';
import { Avatar, ScreenShell, StatusPill, Toggle } from '@/src/components/visit/LandlordUI';
import { useVisitsStore } from '@/src/store/visitsStore';
import { useClerkSupabase } from '@/src/hooks/useClerkSupabase';
import { useAuthStore } from '@/src/store/authStore';
import { getVisitRequest } from '@/src/services/visits.service';
import { getPropertyWithUnlockedLocation } from '@/src/services/properties.service';
import { c, font, shadow } from '@/src/theme/visitTokens';
import {
  dayLabel,
  TIME_SLOT_LABELS,
  type LandlordVisitRequest,
  type PropertyUnlocked,
} from '@/src/types/property.types';

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function ShareDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const supabase = useClerkSupabase();
  const profile = useAuthStore((st) => st.profile);

  const storeRow = useVisitsStore((s) => s.landlordVisits.find((v) => v.id === id));

  const [shareLocation, setShareLocation] = useState(true);
  const [shareContact, setShareContact] = useState(true);
  // Store row gives an instant paint when navigated from the request screen;
  // the direct fetch covers cold deep-links where the store is empty.
  const [visit, setVisit] = useState<LandlordVisitRequest | null>(storeRow ?? null);
  const [property, setProperty] = useState<PropertyUnlocked | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!id) return;

    getVisitRequest(id, supabase).then((r) => {
      if (!cancelled) {
        if (r.success && r.data) setVisit(r.data);
        else if (!r.success && !visit) setVisit(null);
      }
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, supabase]);

  // The landlord owns this property, so the private location tier is theirs
  // to see and choose to share.
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

  const name = visit?.tenantName ?? 'this tenant';
  const firstName = name.split(' ')[0] ?? name;
  const visitDate = visit ? dayLabel(visit.requestedDate) : '—';
  const visitSlot = visit ? TIME_SLOT_LABELS[visit.timeSlot] : '—';
  const phone = profile?.phone ?? null;
  const hasPin = property?.locationLat != null && property?.locationLng != null;

  const canSend = shareLocation || shareContact;

  const handleSend = () => {
    if (!canSend) return;
    router.push({
      pathname: '/(landlord)/share-confirmation',
      params: { id: visit?.id ?? '' },
    } as any);
  };

  return (
    <ScreenShell title="Share Details" showBack paddingBottom={32}>
      {/* ── Tenant hero ──────────────────────────────────────────────── */}
      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <Avatar name={name} size={48} />
          <View style={styles.heroCopy}>
            <Text numberOfLines={1} style={styles.heroName}>
              {name}
            </Text>
            <Text style={styles.heroSub}>Requesting tenant</Text>
          </View>
          <StatusPill status="Accepted" />
        </View>

        {/* Bento tiles — date & slot */}
        <View style={styles.tileRow}>
          <View style={[styles.tile, styles.tileGap]}>
            <Calendar size={15} color={c.meta} strokeWidth={2} />
            <Text style={styles.tileLabel}>DATE</Text>
            <Text numberOfLines={1} style={styles.tileValue}>
              {visitDate}
            </Text>
          </View>
          <View style={styles.tile}>
            <Clock size={15} color={c.meta} strokeWidth={2} />
            <Text style={styles.tileLabel}>TIME</Text>
            <Text numberOfLines={1} style={styles.tileValue}>
              {visitSlot}
            </Text>
          </View>
        </View>

        {visit?.note ? (
          <View style={styles.noteBubble}>
            <Text style={styles.noteText}>{visit.note}</Text>
          </View>
        ) : null}
      </View>

      {/* ── Location bento card ──────────────────────────────────────── */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.iconChip}>
            <MapPin size={15} color={c.ink} strokeWidth={2} />
          </View>
          <View style={styles.cardHeaderCopy}>
            <Text style={styles.cardTitle}>Pin location</Text>
            <Text style={styles.cardDesc}>Exact pin to the entrance.</Text>
          </View>
          <Toggle on={shareLocation} onToggle={() => setShareLocation((v) => !v)} />
        </View>

        {shareLocation ? (
          <View style={styles.cardBody}>
            {hasPin ? (
              <View style={styles.mapWrap}>
                <AppMapView
                  style={{ height: 120, width: '100%' }}
                  cameraPosition={{
                    latitude: property!.locationLat!,
                    longitude: property!.locationLng!,
                    zoom: 15,
                  }}
                  markers={[
                    {
                      id: 'property',
                      latitude: property!.locationLat!,
                      longitude: property!.locationLng!,
                      title: property!.title ?? undefined,
                    },
                  ]}
                />
              </View>
            ) : (
              <View style={[styles.mapWrap, styles.mapEmpty]}>
                <MapPin size={18} color={c.faint} strokeWidth={2} />
                <Text style={styles.mapEmptyText}>No map pin set yet</Text>
              </View>
            )}
            <Text numberOfLines={1} style={styles.addressMain}>
              {property?.locationAddress ?? property?.title ?? 'Address not set'}
            </Text>
            <Text style={styles.addressSub}>
              {property?.locationAddress
                ? property.locationArea
                : 'Add an exact address to your listing for a precise pin.'}
            </Text>
          </View>
        ) : null}
      </View>

      {/* ── Contact bento card ───────────────────────────────────────── */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.iconChip}>
            <Phone size={15} color={c.ink} strokeWidth={2} />
          </View>
          <View style={styles.cardHeaderCopy}>
            <Text style={styles.cardTitle}>Contact number</Text>
            <Text style={styles.cardDesc}>So they can call to coordinate.</Text>
          </View>
          <Toggle on={shareContact} onToggle={() => setShareContact((v) => !v)} />
        </View>

        {shareContact ? (
          <View style={styles.cardBody}>
            <View style={styles.phonePanel}>
              <Text style={styles.phoneValue}>{phone ?? 'No number on file'}</Text>
              <TouchableOpacity
                onPress={() => {}}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Copy phone number"
                style={styles.copyBtn}>
                <Copy size={13} color={c.meta} strokeWidth={2} />
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </View>

      {/* ── Privacy microcopy ────────────────────────────────────────── */}
      <Text style={styles.privacyText}>
        Details stay private to this tenant for the visit window · revoke anytime.
      </Text>

      {/* ── Send ─────────────────────────────────────────────────────── */}
      <TouchableOpacity
        onPress={handleSend}
        disabled={!canSend}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`Send to ${firstName}`}
        style={[styles.sendBtn, !canSend && styles.sendDisabled]}>
        <Text style={styles.sendText}>Send to {firstName}</Text>
        <ArrowRight size={15} color="#FFFFFF" strokeWidth={2.2} />
      </TouchableOpacity>
    </ScreenShell>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  heroCard: {
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: c.hairlineSoft,
    padding: 16,
    ...shadow.card,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
    marginLeft: 12,
    marginRight: 10,
  },
  heroName: {
    fontFamily: font.sansSemi,
    fontSize: 17,
    color: c.ink,
  },
  heroSub: {
    marginTop: 2,
    fontFamily: font.sans,
    fontSize: 11,
    color: c.faint,
  },
  tileRow: {
    flexDirection: 'row',
    marginTop: 14,
  },
  tile: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: c.surfaceGrey,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  tileGap: {
    marginRight: 10,
  },
  tileLabel: {
    marginTop: 8,
    fontFamily: font.sansSemi,
    fontSize: 9,
    letterSpacing: 0.8,
    color: c.faint,
  },
  tileValue: {
    marginTop: 3,
    fontFamily: font.sansSemi,
    fontSize: 13,
    color: c.ink,
  },
  noteBubble: {
    marginTop: 12,
    borderRadius: 14,
    backgroundColor: c.surfaceAlt,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  noteText: {
    fontFamily: font.sans,
    fontSize: 12,
    lineHeight: 18,
    color: c.inkSub,
  },
  card: {
    marginTop: 12,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: c.hairlineSoft,
    padding: 16,
    ...shadow.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconChip: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: c.surfaceGrey,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderCopy: {
    flex: 1,
    minWidth: 0,
    marginLeft: 12,
    marginRight: 10,
  },
  cardTitle: {
    fontFamily: font.sansSemi,
    fontSize: 13,
    color: c.ink,
  },
  cardDesc: {
    marginTop: 2,
    fontFamily: font.sans,
    fontSize: 11,
    color: c.meta,
  },
  cardBody: {
    marginTop: 14,
  },
  mapWrap: {
    height: 120,
    borderRadius: 14,
    overflow: 'hidden',
  },
  mapEmpty: {
    backgroundColor: c.surfaceGrey,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapEmptyText: {
    marginTop: 6,
    fontFamily: font.sans,
    fontSize: 11,
    color: c.faint,
  },
  addressMain: {
    marginTop: 12,
    fontFamily: font.sansSemi,
    fontSize: 13,
    color: c.ink,
  },
  addressSub: {
    marginTop: 2,
    fontFamily: font.sans,
    fontSize: 11,
    lineHeight: 16,
    color: c.meta,
  },
  phonePanel: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: c.surfaceGrey,
    paddingLeft: 14,
    paddingRight: 8,
    paddingVertical: 8,
  },
  phoneValue: {
    flex: 1,
    fontFamily: font.sansSemi,
    fontSize: 15,
    letterSpacing: 0.4,
    color: c.ink,
  },
  copyBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  privacyText: {
    alignSelf: 'center',
    textAlign: 'center',
    marginTop: 14,
    marginHorizontal: 8,
    fontFamily: font.sans,
    fontSize: 10,
    lineHeight: 15,
    color: '#9A9A9A',
  },
  sendBtn: {
    marginTop: 14,
    height: 50,
    borderRadius: 999,
    backgroundColor: c.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: {
    opacity: 0.4,
  },
  sendText: {
    fontFamily: font.sansSemi,
    fontSize: 13,
    color: '#FFFFFF',
    marginRight: 8,
  },
});
