import { useCallback, useEffect, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import {
  ArrowLeft,
  Calendar,
  CalendarClock,
  Check,
  ChevronRight,
  Clock,
  Home,
  MapPin,
  Navigation,
  ShieldCheck,
  X,
} from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { tokens } from '@/src/theme/tokens';
import { PrimaryButton } from '@/src/components/shared/PrimaryButton';
import { VisitStatusChip } from '@/src/components/visits/VisitStatusChip';
import { AppMapView } from '@/src/components/map/AppMap';
import { useClerkSupabase } from '@/src/hooks/useClerkSupabase';
import { getVisitRequestForTenant } from '@/src/services/visits.service';
import { getPropertyWithUnlockedLocation } from '@/src/services/properties.service';
import { useVisitsStore } from '@/src/store/visitsStore';
import {
  FOLLOW_UP_RESPONSE_LABELS,
  TIME_SLOT_LABELS,
  formatVisitDate,
  type PropertyUnlocked,
  type TenantVisitStatusUi,
} from '@/src/types/property.types';

const { color, space, radius, font, size } = tokens;

// ─── Status Copy ─────────────────────────────────────────────────────────────

const STATUS_COPY: Record<TenantVisitStatusUi, { title: string; sub: string }> = {
  pending: {
    title: 'Visit Requested!',
    sub: 'Your request has been sent to the landlord. They typically respond within 24 hours.',
  },
  accepted: {
    title: 'Visit Confirmed!',
    sub: 'Your visit has been approved by the landlord. The exact location is unlocked below.',
  },
  rescheduled: {
    title: 'New Time Proposed',
    sub: 'The landlord suggested a different time for your visit. Review it below.',
  },
  rejected: {
    title: 'Visit Declined',
    sub: 'The landlord couldn’t accommodate this visit. Here are the details.',
  },
  cancelled: {
    title: 'Visit Cancelled',
    sub: 'This visit is no longer happening. You can browse other listings anytime.',
  },
  completed: {
    title: 'Visit Completed',
    sub: 'This visit is done. Here’s what you had scheduled.',
  },
};

// ─── Hero Icon ───────────────────────────────────────────────────────────────

const HERO_STYLES: Record<
  TenantVisitStatusUi,
  { bg: string; fg: string; Icon: React.ElementType }
> = {
  pending: { bg: '#DCFCE7', fg: '#15803D', Icon: Check },
  accepted: { bg: '#DCFCE7', fg: '#15803D', Icon: Check },
  rescheduled: { bg: '#DBEAFE', fg: '#1E40AF', Icon: CalendarClock },
  rejected: { bg: '#FEE2E2', fg: '#E53E3E', Icon: X },
  cancelled: { bg: '#F3F4F6', fg: '#6B7280', Icon: X },
  completed: { bg: '#DCFCE7', fg: '#15803D', Icon: Check },
};

const HeroIcon = ({ status }: { status: TenantVisitStatusUi }) => {
  const { bg, fg, Icon } = HERO_STYLES[status];
  return (
    <Animated.View
      entering={FadeInDown.delay(100).duration(450).springify()}
      style={[styles.heroIconOuter, { backgroundColor: bg }]}>
      <Icon size={32} color={fg} strokeWidth={3} />
    </Animated.View>
  );
};

// ─── Detail Card (shared shell) ──────────────────────────────────────────────

interface DetailCardProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  delay?: number;
}

const DetailCard: React.FC<DetailCardProps> = ({ icon, title, children, delay = 0 }) => (
  <Animated.View
    entering={FadeInDown.delay(delay).duration(450).springify()}
    style={styles.summaryCard}>
    <View style={styles.summaryCardHeader}>
      <View style={styles.summaryIconSlot}>{icon}</View>
      <Text style={styles.summaryCardTitle}>{title}</Text>
    </View>
    {children}
  </Animated.View>
);

const DetailRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  struck?: boolean;
}> = ({ icon, label, value, struck }) => (
  <View style={styles.detailRow}>
    <View style={styles.detailIconSlot}>{icon}</View>
    <View style={styles.detailContent}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, struck && styles.textStruck]}>{value}</Text>
    </View>
  </View>
);

const SectionDivider = () => <View style={styles.divider} />;

// ─── Confirm helpers ─────────────────────────────────────────────────────────

const confirmDestructive = (
  title: string,
  message: string,
  confirmLabel: string,
  onConfirm: () => void
) => {
  Alert.alert(title, message, [
    { text: 'Keep Request', style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
};

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

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function VisitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const supabase = useClerkSupabase();

  const visit = useVisitsStore((s) => s.visits.find((v) => v.id === id));
  const upsertPartial = useVisitsStore((s) => s.upsertPartial);
  const cancelVisit = useVisitsStore((s) => s.cancelVisit);
  const acceptReschedule = useVisitsStore((s) => s.acceptReschedule);
  const declineReschedule = useVisitsStore((s) => s.declineReschedule);

  const [loading, setLoading] = useState(!visit);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [unlocked, setUnlocked] = useState<PropertyUnlocked | null>(null);

  // Load into the store if missing (deep link / cold start) and re-sync on
  // focus as the polling fallback — realtime only provides immediacy.
  const load = useCallback(async () => {
    if (!id) return;
    const result = await getVisitRequestForTenant(id, supabase);
    if (result.success && result.data) {
      upsertPartial(result.data);
      setError(null);
    } else if (!result.success) {
      setError(result.error);
    }
    setLoading(false);
  }, [id, supabase, upsertPartial]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Accepted visits unlock the private location tier.
  const visitId = visit?.id;
  const isAccepted = visit?.statusUi === 'accepted';
  const visitPropertyId = visit?.propertyId;
  useEffect(() => {
    if (!isAccepted || !visitId || !visitPropertyId) {
      setUnlocked(null);
      return;
    }
    let cancelled = false;
    getPropertyWithUnlockedLocation(visitPropertyId, supabase).then((result) => {
      if (cancelled) return;
      setUnlocked(result.success ? result.data : null);
    });
    return () => {
      cancelled = true;
    };
  }, [isAccepted, visitId, visitPropertyId, supabase]);

  const handleGoBack = useCallback(() => router.back(), [router]);
  const handleViewProperty = useCallback(() => {
    if (!visit) return;
    router.push({ pathname: '/(tenant)/property/[id]', params: { id: visit.propertyId } } as any);
  }, [router, visit]);
  const handleGoToVisits = useCallback(() => {
    router.push('/(tenant)/(tabs)/visits' as any);
  }, [router]);
  const handleBrowse = useCallback(() => {
    router.push('/(tenant)/(tabs)/search' as any);
  }, [router]);

  const handleCancel = useCallback(() => {
    if (!visit) return;
    confirmDestructive(
      'Cancel Visit',
      visit.statusUi === 'accepted'
        ? 'Please cancel as early as possible so the landlord can rebook the slot.'
        : 'Are you sure you want to cancel this visit request?',
      'Yes, Cancel',
      async () => {
        setBusy(true);
        const ok = await cancelVisit(visit.id, supabase);
        setBusy(false);
        if (!ok) Alert.alert('Could not cancel', 'Please try again.');
      }
    );
  }, [visit, supabase, cancelVisit]);

  const handleAcceptReschedule = useCallback(async () => {
    if (!visit) return;
    setBusy(true);
    const ok = await acceptReschedule(visit.id, supabase);
    setBusy(false);
    if (!ok) Alert.alert('Could not accept', 'Please try again.');
  }, [visit, supabase, acceptReschedule]);

  const handleDeclineReschedule = useCallback(() => {
    if (!visit) return;
    confirmDestructive(
      'Decline New Time',
      'Declining will cancel this visit request.',
      'Yes, Decline',
      async () => {
        setBusy(true);
        const ok = await declineReschedule(visit.id, supabase);
        setBusy(false);
        if (!ok) Alert.alert('Could not decline', 'Please try again.');
      }
    );
  }, [visit, supabase, declineReschedule]);

  const handleGetDirections = useCallback(() => {
    if (!unlocked) return;
    Linking.openURL(
      mapsUrl(unlocked.locationLat, unlocked.locationLng, unlocked.locationAddress)
    ).catch(() => {});
  }, [unlocked]);

  const handleShareFeedback = useCallback(() => {
    if (!visit) return;
    router.push({ pathname: '/(tenant)/visit/follow-up', params: { visitId: visit.id } } as any);
  }, [router, visit]);

  const handleProposeNewTime = useCallback(() => {
    if (!visit) return;
    router.push({ pathname: '/(tenant)/visit/reschedule', params: { visitId: visit.id } } as any);
  }, [router, visit]);

  if (loading && !visit) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={color.brand} />
        </View>
      </SafeAreaView>
    );
  }

  if ((error && !visit) || !visit) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <Pressable
          onPress={handleGoBack}
          className="absolute left-6 top-6 z-10 h-10 w-10 items-center justify-center rounded-pill bg-input"
          accessibilityLabel="Go back"
          accessibilityRole="button">
          <ArrowLeft size={18} color="#0A0A0A" strokeWidth={2.2} />
        </Pressable>
        <View style={styles.loadingWrap}>
          <Text style={styles.errorText}>{error ?? 'Visit not found.'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const copy = STATUS_COPY[visit.statusUi];
  const timeLabel = TIME_SLOT_LABELS[visit.timeSlot];
  const oldTimeLabel = visit.previousTimeSlot ? TIME_SLOT_LABELS[visit.previousTimeSlot] : null;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Back button — positioned absolutely above the scroll */}
      <Pressable
        onPress={handleGoBack}
        className="absolute left-6 top-6 z-10 h-10 w-10 items-center justify-center rounded-pill bg-input"
        accessibilityLabel="Go back"
        accessibilityRole="button">
        <ArrowLeft size={18} color="#0A0A0A" strokeWidth={2.2} />
      </Pressable>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {/* ── Status hero ─────────────────────────────────────────────── */}
        <Animated.View
          entering={FadeInDown.delay(50).duration(450).springify()}
          style={styles.topSection}>
          <HeroIcon status={visit.statusUi} />
          <Text style={styles.heading}>{copy.title}</Text>
          <Text style={styles.subheading}>{copy.sub}</Text>
        </Animated.View>

        {/* ── Status chip ────────────────────────────────────────────── */}
        <View style={styles.statusRow}>
          <VisitStatusChip status={visit.statusUi} />
          <Text style={styles.visitIdText}>Visit #{visit.id.slice(0, 8)}</Text>
        </View>

        {/* ── Property card ──────────────────────────────────────────── */}
        <DetailCard
          icon={<Home size={18} color={color.ink} strokeWidth={1.8} />}
          title="Property"
          delay={250}>
          <Pressable onPress={handleViewProperty} style={styles.propertyRow}>
            <View style={styles.propertyInfo}>
              <Text style={styles.propertyTitle}>{visit.propertyTitle ?? 'Property'}</Text>
              <Text style={styles.propertyLocation}>
                {visit.propertyArea ?? 'Location unavailable'}
              </Text>
            </View>
            <ChevronRight size={18} color={color.ink2} />
          </Pressable>
        </DetailCard>

        {/* ── Status-specific banner + actions ───────────────────────── */}

        {visit.statusUi === 'accepted' && unlocked && (
          <DetailCard
            icon={<MapPin size={18} color={color.ink} strokeWidth={1.8} />}
            title="Location"
            delay={350}>
            <Text style={styles.unlockedAddress}>
              {unlocked.locationAddress ?? 'Exact address shared by the landlord'}
            </Text>
            {unlocked.locationLat != null && unlocked.locationLng != null && (
              <View style={styles.mapPreviewWrap} pointerEvents="none">
                <AppMapView
                  style={styles.mapPreview}
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
                      title: visit.propertyTitle ?? undefined,
                    },
                  ]}
                />
              </View>
            )}
            <Pressable
              onPress={handleGetDirections}
              style={styles.directionsButton}
              accessibilityRole="button"
              accessibilityLabel="Get Directions">
              <Navigation size={16} color={color.bg} strokeWidth={2.2} />
              <Text style={styles.directionsButtonText}>Get Directions</Text>
            </Pressable>
          </DetailCard>
        )}

        {visit.statusUi === 'accepted' && (
          <DetailCard
            icon={<CalendarClock size={18} color={color.ink} strokeWidth={1.8} />}
            title="Actions"
            delay={400}>
            <View style={styles.actionColumn}>
              <Pressable
                onPress={handleProposeNewTime}
                disabled={busy}
                style={styles.outlineButton}
                accessibilityRole="button"
                accessibilityLabel="Propose a New Time">
                <Text style={styles.proposeLinkText}>Propose a New Time</Text>
              </Pressable>
              <Pressable
                onPress={handleCancel}
                disabled={busy}
                style={styles.outlineButton}
                accessibilityRole="button"
                accessibilityLabel="Cancel Visit">
                <Text style={styles.cancelLinkText}>Cancel Visit</Text>
              </Pressable>
            </View>
            <Text style={styles.cancelCourtesy}>Please cancel as early as possible.</Text>
          </DetailCard>
        )}

        {visit.statusUi === 'rescheduled' && (
          <DetailCard
            icon={<CalendarClock size={18} color={color.ink} strokeWidth={1.8} />}
            title="Proposed New Time"
            delay={350}>
            {visit.previousRequestedDate && oldTimeLabel && (
              <>
                <DetailRow
                  icon={<Clock size={16} color={color.ink3} />}
                  label="Original"
                  value={`${formatVisitDate(visit.previousRequestedDate)} · ${oldTimeLabel}`}
                  struck
                />
                <SectionDivider />
              </>
            )}
            <View style={styles.proposedWrap}>
              <Calendar size={16} color="#1E40AF" />
              <Text style={styles.proposedText}>
                {formatVisitDate(visit.requestedDate)} · {timeLabel}
              </Text>
            </View>
            {visit.landlordResponseNote ? (
              <Text style={styles.landlordNote}>{visit.landlordResponseNote}</Text>
            ) : null}
            <View style={styles.actionColumn}>
              <PrimaryButton
                label="Accept New Time"
                onPress={handleAcceptReschedule}
                loading={busy}
                style={styles.insetButton}
              />
              <Pressable
                onPress={handleDeclineReschedule}
                disabled={busy}
                style={[styles.outlineButton, styles.insetButton]}
                accessibilityRole="button">
                <Text style={styles.outlineButtonText}>Decline</Text>
              </Pressable>
            </View>
          </DetailCard>
        )}

        {visit.statusUi === 'rejected' && visit.landlordResponseNote && (
          <DetailCard
            icon={<ShieldCheck size={18} color={color.ink} strokeWidth={1.8} />}
            title="Why it was declined"
            delay={350}>
            <Text style={styles.quoteText}>{visit.landlordResponseNote}</Text>
          </DetailCard>
        )}

        {visit.statusUi === 'rejected' && (
          <Animated.View entering={FadeInDown.delay(450).duration(450).springify()}>
            <PrimaryButton label="Browse Similar Properties" onPress={handleBrowse} />
          </Animated.View>
        )}

        {visit.statusUi === 'cancelled' && (
          <DetailCard
            icon={<X size={18} color={color.ink2} strokeWidth={1.8} />}
            title="Status"
            delay={350}>
            <Text style={styles.cancelledNote}>
              {visit.status === 'REJECTED' || visit.status === 'CLOSED'
                ? 'This visit was not able to go ahead.'
                : 'You cancelled this visit.'}
            </Text>
          </DetailCard>
        )}

        {visit.statusUi === 'completed' && visit.followUpPending && (
          <Animated.View entering={FadeInDown.delay(350).duration(450).springify()}>
            <View style={styles.feedbackBanner}>
              <Text style={styles.feedbackBannerTitle}>How did your visit go?</Text>
              <Text style={styles.feedbackBannerSub}>
                Share how you felt about the property — the landlord will see it.
              </Text>
            </View>
            <View style={styles.actionColumn}>
              <PrimaryButton
                label="Share Feedback"
                onPress={handleShareFeedback}
                style={styles.insetButton}
              />
            </View>
          </Animated.View>
        )}

        {visit.statusUi === 'completed' && visit.tenantFollowUpResponse && (
          <DetailCard
            icon={<Check size={18} color={color.brand} strokeWidth={2} />}
            title="Your Feedback"
            delay={350}>
            <Text style={styles.feedbackResponse}>
              {FOLLOW_UP_RESPONSE_LABELS[visit.tenantFollowUpResponse]}
            </Text>
            {visit.tenantFollowUpNote ? (
              <Text style={styles.feedbackNote}>{visit.tenantFollowUpNote}</Text>
            ) : null}
          </DetailCard>
        )}

        {/* ── Visit details ───────────────────────────────────────────── */}
        <DetailCard
          icon={<Calendar size={18} color={color.ink} strokeWidth={1.8} />}
          title="Visit Details"
          delay={450}>
          <DetailRow
            icon={<Calendar size={16} color={color.brand} />}
            label="Date"
            value={formatVisitDate(visit.requestedDate)}
          />
          <SectionDivider />
          <DetailRow
            icon={<Clock size={16} color={color.brand} />}
            label="Time"
            value={timeLabel}
          />
          <SectionDivider />
          <DetailRow
            icon={<Home size={16} color={color.brand} />}
            label="Visit Type"
            value="In-person"
          />
        </DetailCard>

        {/* ── Tenant message ──────────────────────────────────────────── */}
        {visit.note ? (
          <DetailCard
            icon={<ShieldCheck size={18} color={color.ink} strokeWidth={1.8} />}
            title="Your Message"
            delay={550}>
            <Text style={styles.quoteText}>{visit.note}</Text>
          </DetailCard>
        ) : null}

        {/* ── Timestamps footer ───────────────────────────────────────── */}
        <View style={styles.footerTimestamps}>
          <Text style={styles.footerTimestampText}>
            Requested {formatTimestamp(visit.createdAt)}
          </Text>
          {visit.respondedAt && (
            <Text style={styles.footerTimestampText}>
              · Responded {formatTimestamp(visit.respondedAt)}
            </Text>
          )}
        </View>

        {/* ── Pending hero CTA (doubles as the confirmation screen) ───── */}
        {visit.statusUi === 'pending' && (
          <Animated.View
            entering={FadeInDown.delay(650).duration(500).springify()}
            style={styles.bottomArea}>
            <PrimaryButton label="View My Visits" onPress={handleGoToVisits} />
            <Pressable
              onPress={handleProposeNewTime}
              disabled={busy}
              style={styles.cancelLink}
              accessibilityRole="button"
              accessibilityLabel="Propose a New Time">
              <Text style={styles.proposeLinkText}>Propose a New Time</Text>
            </Pressable>
            <Pressable
              onPress={handleCancel}
              disabled={busy}
              style={styles.cancelLink}
              accessibilityRole="button"
              accessibilityLabel="Cancel Request">
              <Text style={styles.cancelLinkText}>Cancel Request</Text>
            </Pressable>
            <Text style={styles.footerNote}>
              You can also find this visit in your Visits tab anytime.
            </Text>
          </Animated.View>
        )}

        {/* ── Cancelled CTA ───────────────────────────────────────────── */}
        {visit.statusUi === 'cancelled' && (
          <Animated.View
            entering={FadeInDown.delay(500).duration(500).springify()}
            style={styles.bottomArea}>
            <PrimaryButton label="Browse Listings" onPress={handleBrowse} />
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const formatTimestamp = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: color.bg,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    fontFamily: font.sans,
    fontSize: size.body,
    color: color.ink2,
    textAlign: 'center',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: space.screenH,
    paddingTop: 32,
    paddingBottom: 40,
  },

  // Hero
  topSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  heroIconOuter: {
    width: 72,
    height: 72,
    borderRadius: 72,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heading: {
    fontFamily: font.display,
    fontSize: 30,
    color: color.ink,
    lineHeight: 36,
    textAlign: 'center',
    marginBottom: 8,
  },
  subheading: {
    fontFamily: font.sans,
    fontSize: size.bodySm,
    color: color.ink2,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: space.cardPad,
  },

  // Status row
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  visitIdText: {
    fontFamily: font.sans,
    fontSize: size.caption,
    color: color.ink3,
  },

  // Cards
  summaryCard: {
    backgroundColor: color.bg,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: color.line,
    padding: space.cardPad,
    marginBottom: 12,
    gap: 8,
  },
  summaryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  summaryIconSlot: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: color.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCardTitle: {
    fontFamily: font.semibold,
    fontSize: size.body,
    color: color.ink,
  },

  // Property
  propertyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  propertyInfo: {
    flex: 1,
  },
  propertyTitle: {
    fontFamily: font.semibold,
    fontSize: size.body,
    color: color.ink,
  },
  propertyLocation: {
    fontFamily: font.sans,
    fontSize: size.bodySm,
    color: color.ink2,
    marginTop: 1,
  },

  // Detail rows
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  detailIconSlot: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: color.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontFamily: font.sans,
    fontSize: size.caption,
    color: color.ink3,
  },
  detailValue: {
    fontFamily: font.medium,
    fontSize: size.bodySm,
    color: color.ink,
    marginTop: 1,
  },
  textStruck: {
    textDecorationLine: 'line-through',
    color: color.ink3,
  },
  divider: {
    height: 1,
    backgroundColor: color.divider,
    marginHorizontal: -space.cardPad,
  },

  // Reschedule
  proposedWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#DBEAFE',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  proposedText: {
    fontFamily: font.semibold,
    fontSize: size.bodySm,
    color: '#1E40AF',
    flex: 1,
  },
  landlordNote: {
    fontFamily: font.sans,
    fontSize: size.bodySm,
    color: color.ink2,
    lineHeight: 20,
    marginTop: 4,
  },
  actionColumn: {
    gap: 10,
    marginTop: 6,
  },
  insetButton: {
    marginHorizontal: 0,
  },
  outlineButton: {
    height: 52,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.line,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 0,
  },
  outlineButtonText: {
    fontFamily: font.semibold,
    fontSize: size.body,
    color: color.ink2,
  },

  // Accepted location
  unlockedAddress: {
    fontFamily: font.medium,
    fontSize: size.bodySm,
    color: color.ink,
    lineHeight: 20,
  },
  mapPreviewWrap: {
    borderRadius: radius.md,
    overflow: 'hidden',
    marginTop: 4,
  },
  mapPreview: {
    height: 140,
    width: '100%',
  },
  directionsButton: {
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: color.brand,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  directionsButtonText: {
    fontFamily: font.semibold,
    fontSize: size.body,
    color: color.bg,
  },
  cancelLink: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  cancelLinkText: {
    fontFamily: font.semibold,
    fontSize: size.bodySm,
    color: color.danger,
  },
  proposeLinkText: {
    fontFamily: font.semibold,
    fontSize: size.bodySm,
    color: color.brand,
  },
  cancelCourtesy: {
    fontFamily: font.sans,
    fontSize: size.caption,
    color: color.ink3,
    textAlign: 'center',
    lineHeight: 18,
  },

  // Quotes / notes
  quoteText: {
    fontFamily: font.sans,
    fontSize: size.bodySm,
    color: color.ink2,
    lineHeight: 20,
  },
  cancelledNote: {
    fontFamily: font.sans,
    fontSize: size.bodySm,
    color: color.ink2,
    lineHeight: 20,
  },
  feedbackBanner: {
    backgroundColor: '#FFF3E0',
    borderRadius: radius.card,
    padding: space.cardPad,
    marginBottom: 12,
  },
  feedbackBannerTitle: {
    fontFamily: font.semibold,
    fontSize: size.body,
    color: '#B45309',
  },
  feedbackBannerSub: {
    fontFamily: font.sans,
    fontSize: size.bodySm,
    color: color.ink2,
    marginTop: 2,
    lineHeight: 19,
  },
  feedbackResponse: {
    fontFamily: font.semibold,
    fontSize: size.bodySm,
    color: color.brand,
    lineHeight: 20,
  },
  feedbackNote: {
    fontFamily: font.sans,
    fontSize: size.bodySm,
    color: color.ink2,
    lineHeight: 20,
  },

  // Footer
  footerTimestamps: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
    marginBottom: 12,
  },
  footerTimestampText: {
    fontFamily: font.sans,
    fontSize: size.label,
    color: color.ink3,
  },
  bottomArea: {
    gap: 8,
    paddingBottom: space.cardPad,
  },
  footerNote: {
    fontFamily: font.sans,
    fontSize: size.caption,
    color: color.ink3,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: space.screenH,
  },
});
