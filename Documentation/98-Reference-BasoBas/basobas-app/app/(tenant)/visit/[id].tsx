import { useEffect, useCallback } from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Check, Calendar, Clock, Home, ShieldCheck, ChevronRight } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  FadeInDown,
} from 'react-native-reanimated';

import { tokens } from '@/src/theme/tokens';

const { color, space, radius, font, size, shadow } = tokens;

// ─── Mock Visit Data ─────────────────────────────────────────────────────────

interface VisitData {
  id: string;
  propertyId: string;
  landlordId: string;
  propertyTitle: string;
  propertyLocation: string;
  date: string;
  time: string;
  visitType: 'In-person' | 'Video';
  landlordName: string;
  landlordInitials: string;
  status: 'Confirmed' | 'Pending' | 'Completed' | 'Cancelled';
}

const MOCK_VISIT: VisitData = {
  id: '1',
  propertyId: '1',
  landlordId: '1',
  propertyTitle: '2BHK Apartment in Kupondole',
  propertyLocation: 'Lalitpur, Nepal',
  date: 'Wednesday, June 3',
  time: '11:30 AM',
  visitType: 'In-person',
  landlordName: 'Sita Sharma',
  landlordInitials: 'SS',
  status: 'Confirmed',
};

// ─── Status Config ───────────────────────────────────────────────────────────

const STATUS_STYLES: Record<
  VisitData['status'],
  { bg: string; text: string; label: string }
> = {
  Confirmed: { bg: 'bg-brand-light', text: 'text-brand', label: 'Confirmed' },
  Pending: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Pending' },
  Completed: { bg: 'bg-canvas', text: 'text-ink2', label: 'Completed' },
  Cancelled: { bg: 'bg-danger-bg', text: 'text-danger', label: 'Cancelled' },
};

// ─── Success Checkmark Animation ─────────────────────────────────────────────

const SuccessCheckmark: React.FC = () => {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(
      200,
      withTiming(1, { duration: 600, easing: Easing.out(Easing.back(1.5)) }),
    );
    opacity.value = withDelay(
      200,
      withTiming(1, { duration: 500 }),
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.checkmarkOuter, animatedStyle]}>
      <View style={styles.checkmarkInner}>
        <Check size={32} color={color.bg} strokeWidth={3.5} />
      </View>
    </Animated.View>
  );
};

// ─── Summary Card ────────────────────────────────────────────────────────────

interface SummaryCardProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  delay?: number;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ icon, title, children, delay = 0 }) => (
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

// ─── Detail Row ──────────────────────────────────────────────────────────────

interface DetailRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

const DetailRow: React.FC<DetailRowProps> = ({ icon, label, value }) => (
  <View style={styles.detailRow}>
    <View style={styles.detailIconSlot}>{icon}</View>
    <View style={styles.detailContent}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  </View>
);

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function VisitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  // Use mock data for now — would be fetched from API based on id
  const visit = MOCK_VISIT;
  const statusStyle = STATUS_STYLES[visit.status];

  const handleGoBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleGoToVisits = useCallback(() => {
    router.push('/(tenant)/(tabs)/visits' as any);
  }, [router]);

  const handleViewProperty = useCallback(() => {
    router.push({ pathname: '/(tenant)/property/[id]', params: { id: visit.propertyId } } as any);
  }, [router, visit.propertyId]);

  const handleViewLandlord = useCallback(() => {
    router.push({ pathname: '/(tenant)/landlord/[id]', params: { id: visit.landlordId } } as any);
  }, [router, visit.landlordId]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Back button — positioned absolutely above the scroll */}        <Pressable
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
        {/* ── Top Section ──────────────────────────────────────────────── */}
        <View style={styles.topSection}>
          <SuccessCheckmark />

          <Text style={styles.heading}>Visit Confirmed!</Text>
          <Text style={styles.subheading}>
            Your visit has been approved by the landlord. Here are the details.
          </Text>
        </View>

        {/* ── Status Pill ──────────────────────────────────────────────── */}
        <View style={styles.statusRow}>
          <View className={`rounded-pill px-3 py-1.5 ${statusStyle.bg}`}>
            <Text className={`font-semibold text-caption ${statusStyle.text}`}>
              {statusStyle.label}
            </Text>
          </View>
          <Text style={styles.visitIdText}>Visit #{id}</Text>
        </View>

        {/* ── Property Card ────────────────────────────────────────────── */}
        <SummaryCard
          icon={<Home size={18} color={color.ink} strokeWidth={1.8} />}
          title="Property"
          delay={350}>
          <Pressable
            onPress={handleViewProperty}
            style={styles.propertyRow}>
            <View style={styles.propertyInfo}>
              <Text style={styles.propertyTitle}>{visit.propertyTitle}</Text>
              <Text style={styles.propertyLocation}>{visit.propertyLocation}</Text>
            </View>
            <ChevronRight size={18} color={color.ink2} />
          </Pressable>
        </SummaryCard>

        {/* ── Visit Details Card ───────────────────────────────────────── */}
        <SummaryCard
          icon={<Calendar size={18} color={color.ink} strokeWidth={1.8} />}
          title="Visit Details"
          delay={500}>
          <DetailRow
            icon={<Calendar size={16} color={color.brand} />}
            label="Date"
            value={visit.date}
          />
          <View style={styles.divider} />
          <DetailRow
            icon={<Clock size={16} color={color.brand} />}
            label="Time"
            value={visit.time}
          />
          <View style={styles.divider} />
          <DetailRow
            icon={<Home size={16} color={color.brand} />}
            label="Visit Type"
            value={visit.visitType}
          />
        </SummaryCard>

        {/* ── Landlord Card ────────────────────────────────────────────── */}
        <SummaryCard
          icon={<ShieldCheck size={18} color={color.ink} strokeWidth={1.8} />}
          title="Landlord"
          delay={650}>            <Pressable
              onPress={handleViewLandlord}
              style={styles.landlordRow}>
            <View style={styles.landlordAvatar}>
              <Text style={styles.landlordInitials}>{visit.landlordInitials}</Text>
            </View>
            <View style={styles.landlordInfo}>
              <Text style={styles.landlordName}>{visit.landlordName}</Text>
              <View style={styles.verifiedRow}>
                <ShieldCheck size={12} color={color.brand} strokeWidth={2} />
                <Text style={styles.verifiedText}>Verified owner</Text>
              </View>
            </View>
            <ChevronRight size={18} color={color.ink2} />
          </Pressable>
        </SummaryCard>

        {/* ── CTA ──────────────────────────────────────────────────────── */}
        <Animated.View
          entering={FadeInDown.delay(900).duration(500).springify()}
          style={styles.bottomArea}>
          <Pressable
            onPress={handleGoToVisits}
            style={styles.primaryCta}>
            <Text style={styles.primaryCtaText}>View My Visits</Text>
          </Pressable>
          <Text style={styles.footerNote}>
            You can also find this visit in your Visits tab anytime.
          </Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: color.bg,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: space.screenH,
    paddingTop: 32,
    paddingBottom: 40,
  },

  // Top section
  topSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  checkmarkOuter: {
    marginBottom: 16,
  },
  checkmarkInner: {
    width: 72,
    height: 72,
    borderRadius: 72,
    backgroundColor: color.brand,
    alignItems: 'center',
    justifyContent: 'center',
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

  // Summary card
  summaryCard: {
    backgroundColor: color.bg,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: color.line,
    padding: space.cardPad,
    marginBottom: 12,
    gap: 8,
    ...shadow.card,
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

  // Divider
  divider: {
    height: 1,
    backgroundColor: color.divider,
    marginHorizontal: -space.cardPad,
  },

  // Landlord
  landlordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  landlordAvatar: {
    width: 44,
    height: 44,
    borderRadius: 44,
    backgroundColor: color.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  landlordInitials: {
    fontFamily: font.semibold,
    fontSize: size.body,
    color: color.ink2,
  },
  landlordInfo: {
    flex: 1,
  },
  landlordName: {
    fontFamily: font.semibold,
    fontSize: size.body,
    color: color.ink,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  verifiedText: {
    fontFamily: font.sans,
    fontSize: size.caption,
    color: color.brand,
  },

  // CTA
  bottomArea: {
    marginTop: 8,
    gap: 8,
    paddingBottom: space.cardPad,
  },
  primaryCta: {
    height: space.buttonH,
    borderRadius: radius.pill,
    backgroundColor: color.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryCtaText: {
    fontFamily: font.semibold,
    fontSize: size.body,
    color: color.bg,
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
