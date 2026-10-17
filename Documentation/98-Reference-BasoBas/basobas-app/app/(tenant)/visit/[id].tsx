import { useCallback, useEffect, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  Pressable,
  Alert,
  Linking,
  Platform,
  Image,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowDown, MapPin, MoreHorizontal, Navigation, Phone, User } from 'lucide-react-native';

import { c, font, radius, sp, t } from '@/src/theme/visitTokens';
import { DetailHeader } from '@/src/components/visit/DetailHeader';
import { VisitDetailSkeleton } from '@/src/components/visit/Skeleton';
import { DateTimeRow } from '@/src/components/visit/DateTimeRow';
import { VStack } from '@/src/components/visit/VStack';
import { SectionLabel } from '@/src/components/visit/SectionLabel';
import { Card } from '@/src/components/visit/Card';
import { Divider } from '@/src/components/visit/Divider';
import { Button } from '@/src/components/visit/Button';
import { StatusChip } from '@/src/components/visit/StatusChip';
import { AppMapView } from '@/src/components/map/AppMap';
import { useVisitsStore } from '@/src/store/visitsStore';
import {
  TIME_SLOT_LABELS,
  formatMonthlyPrice,
  formatVisitDate,
  type PropertyUnlocked,
  type TenantVisitRequest,
} from '@/src/types/property.types';
import { useClerkSupabase } from '@/src/hooks/useClerkSupabase';
import { getPropertyWithUnlockedLocation } from '@/src/services/properties.service';
import { getVisitRequestForTenant } from '@/src/services/visits.service';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const mapsUrl = (lat: number | null, lng: number | null, address: string | null) => {
  if (lat != null && lng != null) {
    return Platform.select({
      ios: `http://maps.apple.com/?q=${lat},${lng}`,
      android: `geo:${lat},${lng}?q=${lat},${lng}`,
      default: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    });
  }
  const query = encodeURIComponent(address ?? '');
  return Platform.select({
    ios: `http://maps.apple.com/?q=${query}`,
    android: `geo:0,0?q=${query}`,
    default: `https://www.google.com/maps/search/?api=1&query=${query}`,
  });
};

const HELPER: Partial<Record<TenantVisitRequest['statusUi'], string>> = {
  pending: 'Awaiting host confirmation — usually within 1 hour.',
  rescheduled: 'The host proposed a new time. Accept it or decline the request.',
};

/** `+977 9801001234` → `+97••••1234`-style mask, keeping the tail visible. */
const maskPhone = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 6) return phone;
  return `${digits.slice(0, 3)}••••${digits.slice(-2)}`;
};

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function VisitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const supabase = useClerkSupabase();

  const storeVisit = useVisitsStore((s) => s.tenantVisits.find((v) => v.id === id));
  const cancelVisit = useVisitsStore((s) => s.cancelVisit);
  const acceptReschedule = useVisitsStore((s) => s.acceptReschedule);
  const declineReschedule = useVisitsStore((s) => s.declineReschedule);

  const [busy, setBusy] = useState(false);
  const [unlocked, setUnlocked] = useState<PropertyUnlocked | null>(null);
  const [freshVisit, setFreshVisit] = useState<TenantVisitRequest | null>(null);
  const [loading, setLoading] = useState(true);

  // Always fetch the single visit with its real property + landlord joins, so
  // the screen shows real details even when the store row arrived via
  // realtime (which carries no joined display fields).
  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    getVisitRequestForTenant(id, supabase)
      .then((r) => {
        if (!cancelled && r.success && r.data) setFreshVisit(r.data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, supabase]);

  // Prefer the store row (live updates win) when it carries the joined
  // display fields; otherwise fill from the fetched single-visit row.
  const hasRealDetails = storeVisit?.propertyTitle != null || storeVisit?.landlordName != null;
  const visit = hasRealDetails ? storeVisit : (freshVisit ?? storeVisit);

  // Pull the unlocked location once the visit is accepted.
  useEffect(() => {
    if (visit?.statusUi !== 'accepted' || !visit.propertyId || unlocked != null) return;
    getPropertyWithUnlockedLocation(visit.propertyId, supabase).then((r) => {
      if (r.success) setUnlocked(r.data);
    });
  }, [visit, supabase, unlocked]);

  const handleCancel = useCallback(() => {
    if (!visit) return;
    Alert.alert(
      'Cancel Visit',
      visit.statusUi === 'accepted'
        ? 'Please cancel as early as possible so the landlord can rebook.'
        : 'Are you sure you want to cancel this visit request?',
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Yes, cancel',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            await cancelVisit(visit.id, supabase);
            setBusy(false);
            router.back();
          },
        },
      ]
    );
  }, [visit, supabase, cancelVisit, router]);

  const handleAcceptReschedule = useCallback(async () => {
    if (!visit) return;
    setBusy(true);
    await acceptReschedule(visit.id, supabase);
    setBusy(false);
  }, [visit, supabase, acceptReschedule]);

  const handleDeclineReschedule = useCallback(() => {
    if (!visit) return;
    Alert.alert('Decline New Time', 'Declining will cancel this visit request.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Yes, decline',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          await declineReschedule(visit.id, supabase);
          setBusy(false);
          router.back();
        },
      },
    ]);
  }, [visit, supabase, declineReschedule, router]);

  const handleGetDirections = useCallback(() => {
    if (!unlocked) return;
    Linking.openURL(
      mapsUrl(unlocked.locationLat, unlocked.locationLng, unlocked.locationAddress)
    ).catch(() => {});
  }, [unlocked]);

  const handleCallHost = useCallback(() => {
    if (!visit?.landlordPhone) return;
    Linking.openURL(`tel:${visit.landlordPhone}`).catch(() => {});
  }, [visit]);

  // Skeleton while the real joined row loads — never flash dummy text.
  if (loading && !hasRealDetails) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <DetailHeader title="Visit Details" />
        <VisitDetailSkeleton />
      </SafeAreaView>
    );
  }

  if (!visit) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <DetailHeader title="Visit Details" />
        <View style={styles.center}>
          <Text style={styles.meta}>Visit not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const v: TenantVisitRequest = visit;
  const timeLabel = TIME_SLOT_LABELS[v.timeSlot];
  const oldTimeLabel = v.previousTimeSlot ? TIME_SLOT_LABELS[v.previousTimeSlot] : null;
  const helper = HELPER[v.statusUi];
  const hostName = v.landlordName ?? 'Your host';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <DetailHeader
        title="Visit Details"
        right={<MoreHorizontal size={16} color={c.faint} strokeWidth={1.75} />}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <VStack gap={sp.lg}>
          {/* ── Property summary (no card) ─────────────────────────────── */}
          <View style={styles.hero}>
            {v.propertyPhotoUrl ? (
              <Image
                source={{ uri: v.propertyPhotoUrl }}
                style={styles.heroImg}
                resizeMode="cover"
              />
            ) : (
              <MapPin size={22} color={c.icon} strokeWidth={1.75} />
            )}
          </View>

          <VStack gap={sp.xs}>
            <Text style={styles.momentTitle}>{v.propertyTitle ?? 'Property'}</Text>
            {v.propertyPrice != null && (
              <Text style={styles.price}>{formatMonthlyPrice(v.propertyPrice)}</Text>
            )}
            <Text style={styles.meta}>
              {v.propertyArea ? `${v.propertyArea} · Verified listing` : 'Verified listing'}
            </Text>
          </VStack>

          <Divider />

          <DateTimeRow date={formatVisitDate(v.requestedDate)} time={timeLabel} />

          {/* Status row + helper */}
          <View style={styles.statusRow}>
            <SectionLabel label="Status" />
            <StatusChip status={v.statusUi} />
          </View>
          {helper ? <Text style={styles.helper}>{helper}</Text> : null}

          {/* ── Pending ────────────────────────────────────────────────── */}
          {v.statusUi === 'pending' && (
            <VStack gap={sp.lg}>
              {v.note ? (
                <VStack gap={sp.sm}>
                  <SectionLabel label="Your message" />
                  <Text style={styles.meta}>{v.note}</Text>
                </VStack>
              ) : null}

              <HostRow name={hostName} avatarUrl={v.landlordAvatarUrl} />

              <View style={styles.actions}>
                <Button
                  variant="primary"
                  onPress={() =>
                    router.push({
                      pathname: '/(tenant)/visit/reschedule',
                      params: { visitId: v.id },
                    } as any)
                  }
                  disabled={busy}>
                  Reschedule
                </Button>
                <Button
                  variant="danger"
                  onPress={handleCancel}
                  disabled={busy}
                  style={{ marginTop: sp.xs }}>
                  Cancel Request
                </Button>
              </View>
            </VStack>
          )}

          {/* ── Accepted ───────────────────────────────────────────────── */}
          {v.statusUi === 'accepted' && (
            <VStack gap={sp.lg}>
              <Divider />

              <VStack gap={sp.base}>
                <SectionLabel label="Exact Location" />
                <Text style={styles.address}>
                  {unlocked?.locationAddress ?? 'Exact address shared by the landlord'}
                </Text>
                {unlocked?.locationLat != null && unlocked?.locationLng != null ? (
                  <View style={styles.mapWrap} pointerEvents="none">
                    <AppMapView
                      style={styles.map}
                      cameraPosition={{
                        latitude: unlocked.locationLat,
                        longitude: unlocked.locationLng,
                        zoom: 15,
                      }}
                      markers={[
                        {
                          id: 'property',
                          latitude: unlocked.locationLat,
                          longitude: unlocked.locationLng,
                          title: v.propertyTitle ?? undefined,
                        },
                      ]}
                    />
                  </View>
                ) : (
                  <View style={styles.mapPlaceholder}>
                    <MapPin size={22} color={c.ink} strokeWidth={2} fill={c.ink} />
                  </View>
                )}
                <Button variant="outline" onPress={handleGetDirections} disabled={busy}>
                  <Navigation size={16} color={c.title} strokeWidth={1.75} />
                  <Text style={styles.btnText}>Get Directions</Text>
                </Button>
              </VStack>

              <Divider />

              <HostRow
                name={hostName}
                avatarUrl={v.landlordAvatarUrl}
                phone={v.landlordPhone}
                onCall={v.landlordPhone ? handleCallHost : undefined}
              />

              {/* The landlord may counter-propose, so the tenant can too. */}
              <Button
                variant="outline"
                onPress={() =>
                  router.push({
                    pathname: '/(tenant)/visit/reschedule',
                    params: { visitId: v.id },
                  } as any)
                }
                disabled={busy}>
                Propose a New Time
              </Button>

              <Button variant="link" onPress={handleCancel} disabled={busy}>
                Cancel Visit
              </Button>
            </VStack>
          )}

          {/* ── Rescheduled ────────────────────────────────────────────── */}
          {v.statusUi === 'rescheduled' && (
            <VStack gap={sp.lg}>
              <Card>
                <View style={styles.compareCol}>
                  <SectionLabel label="Original" />
                  <Text style={[styles.meta, styles.struck]}>
                    {v.previousRequestedDate && oldTimeLabel
                      ? `${formatVisitDate(v.previousRequestedDate)} · ${oldTimeLabel}`
                      : 'Not set yet'}
                  </Text>
                </View>

                <View style={styles.betweenHairlines}>
                  <View style={styles.hairline} />
                  <View style={styles.arrowWrap}>
                    <ArrowDown size={14} color={c.icon} strokeWidth={1.75} />
                  </View>
                  <View style={styles.hairline} />
                </View>

                <View style={styles.compareCol}>
                  <SectionLabel label="Proposed" />
                  <Text style={styles.proposed}>
                    {formatVisitDate(v.requestedDate)} · {timeLabel}
                  </Text>
                </View>
              </Card>

              {v.landlordResponseNote ? (
                <Text style={styles.meta}>{v.landlordResponseNote}</Text>
              ) : null}

              <View style={styles.actionRow}>
                <Button
                  variant="outline"
                  onPress={handleDeclineReschedule}
                  disabled={busy}
                  flex={1}>
                  Decline
                </Button>
                <Button
                  variant="primary"
                  onPress={handleAcceptReschedule}
                  disabled={busy}
                  flex={2}
                  style={{ marginLeft: sp.base }}>
                  Accept New Time
                </Button>
              </View>

              {/* Counter-propose instead of accepting or declining outright. */}
              <Button
                variant="link"
                onPress={() =>
                  router.push({
                    pathname: '/(tenant)/visit/reschedule',
                    params: { visitId: v.id },
                  } as any)
                }
                disabled={busy}>
                Propose a Different Time
              </Button>
            </VStack>
          )}

          {/* ── Completed → invite feedback ────────────────────────────── */}
          {v.statusUi === 'completed' && (
            <VStack gap={sp.base}>
              <SectionLabel label="How did it go?" />
              <Text style={styles.meta}>
                Share your feedback so the landlord knows whether to move forward.
              </Text>
              <Button
                variant="primary"
                onPress={() =>
                  router.push({
                    pathname: '/(tenant)/visit/follow-up',
                    params: { visitId: v.id },
                  } as any)
                }>
                Share Feedback
              </Button>
            </VStack>
          )}

          {/* ── Rejected ───────────────────────────────────────────────── */}
          {v.statusUi === 'rejected' && v.landlordResponseNote && (
            <VStack gap={sp.base}>
              <SectionLabel label="Why it was declined" />
              <Text style={styles.meta}>{v.landlordResponseNote}</Text>
            </VStack>
          )}
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Host row ────────────────────────────────────────────────────────────────

const HostRow = ({
  name,
  avatarUrl,
  phone,
  onCall,
}: {
  name: string;
  avatarUrl?: string | null;
  phone?: string | null;
  onCall?: () => void;
}) => (
  <VStack gap={sp.base}>
    <SectionLabel label="Host" />
    <View style={styles.hostRow}>
      <View style={styles.avatar}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatarImg} resizeMode="cover" />
        ) : (
          <User size={14} color={c.icon} strokeWidth={1.75} />
        )}
      </View>
      <View style={styles.hostBody}>
        <Text style={styles.hostName}>{name}</Text>
        <Text style={styles.meta}>{phone ? maskPhone(phone) : 'Responds within 1 hour'}</Text>
      </View>
      {onCall ? (
        <Pressable
          onPress={onCall}
          accessibilityRole="button"
          accessibilityLabel="Call host"
          hitSlop={8}
          style={styles.callBtn}>
          <Phone size={14} color={c.title} strokeWidth={1.75} />
          <Text style={styles.callText}>Call</Text>
        </Pressable>
      ) : null}
    </View>
  </VStack>
);

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: c.screenBg },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: sp.lg,
    paddingTop: sp.base,
    paddingBottom: 60,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  // Property summary
  hero: {
    height: 120,
    borderRadius: radius.card,
    backgroundColor: '#E2E5DF',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImg: { width: '100%', height: '100%' },
  momentTitle: {
    fontFamily: font.serif,
    fontSize: t.moment,
    color: c.title,
    lineHeight: 30,
  },
  price: {
    fontFamily: font.sansSemi,
    fontSize: t.body,
    color: c.accent,
  },
  meta: {
    fontFamily: font.sans,
    fontSize: t.meta,
    color: c.meta,
    lineHeight: 20,
  },
  // Status
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  helper: {
    fontFamily: font.sans,
    fontSize: t.meta,
    color: c.faint,
    lineHeight: 20,
  },
  // Sections
  hostRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: c.cardBg,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  hostBody: { flex: 1, marginLeft: sp.base },
  hostName: {
    fontFamily: font.sansSemi,
    fontSize: t.body,
    color: c.title,
    marginBottom: 2,
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: sp.base,
    paddingVertical: sp.sm,
    paddingHorizontal: sp.base,
  },
  callText: {
    fontFamily: font.sansSemi,
    fontSize: t.body,
    color: c.title,
    marginLeft: sp.sm,
  },
  // Accepted — location
  address: {
    fontFamily: font.sansSemi,
    fontSize: t.body,
    color: c.title,
    lineHeight: 20,
  },
  mapWrap: {
    height: 140,
    width: '100%',
    borderRadius: radius.control,
    overflow: 'hidden',
  },
  map: { width: '100%', height: '100%' },
  mapPlaceholder: {
    height: 92,
    width: '100%',
    borderRadius: radius.control,
    backgroundColor: '#E7EAE4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontFamily: font.sansSemi,
    fontSize: 15,
    color: c.title,
  },
  // Rescheduled comparison
  compareCol: {},
  struck: { marginTop: 4, textDecorationLine: 'line-through', color: c.faint },
  proposed: {
    marginTop: 4,
    fontFamily: font.sansSemi,
    fontSize: t.body,
    color: c.title,
  },
  betweenHairlines: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hairline: { flex: 1, height: 1, backgroundColor: c.divider },
  arrowWrap: { marginHorizontal: sp.base },
  actionRow: {
    flexDirection: 'row',
    marginTop: sp.sm,
  },
  actions: {},
});
