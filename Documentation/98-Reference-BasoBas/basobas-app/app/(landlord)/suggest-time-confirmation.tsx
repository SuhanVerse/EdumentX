import { useCallback } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Calendar } from 'lucide-react-native';

import { tokens } from '@/src/theme/tokens';

const { color, space, radius, font, size } = tokens;

// ─── Day label map ───────────────────────────────────────────────────────────

const DAY_LABELS: Record<string, string> = {
  '9': 'Mon',
  '10': 'Tue',
  '11': 'Wed',
  '12': 'Thu',
  '13': 'Fri',
  '14': 'Sat',
};

const ORIGINAL_TIME = 'Mon, June 9 \u00B7 4:00 PM';

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function SuggestTimeConfirmationScreen() {
  const router = useRouter();
  const { date, time } = useLocalSearchParams<{ date: string; time: string }>();

  const dayNum = date ?? '11';
  const timeStr = time ?? '4:00 PM';
  const dayLabel = DAY_LABELS[dayNum] ?? 'Wed';
  const newProposal = `${dayLabel}, June ${dayNum} \u00B7 ${timeStr}`;

  const handleBackToRequests = useCallback(() => {
    router.push('/(landlord)/(tabs)/requests' as any);
  }, [router]);

  const handleGoBack = useCallback(() => {
    router.back();
  }, [router]);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {/* ─── Header ──────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Pressable
          onPress={handleGoBack}
          style={styles.backButton}
          accessibilityLabel="Go back"
          accessibilityRole="button">
          <ArrowLeft size={18} color={color.ink} strokeWidth={2.2} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Reschedule Sent</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* ─── Hero Section ──────────────────────────────────────────── */}
        <View style={styles.heroSection}>
          <View style={styles.heroOuterCircle}>
            <View style={styles.heroInnerCircle}>
              <Calendar size={28} color="#FFFFFF" strokeWidth={2} />
            </View>
          </View>

          <Text style={styles.heroHeadline}>New time proposed</Text>
          <Text style={styles.heroSubtitle}>
            {'Sandeep will get a notification to confirm '}
            {newProposal}
            {'.\u2009'}
          </Text>
        </View>

        {/* ─── Summary Card ──────────────────────────────────────────── */}
        <View style={styles.summaryCard}>
          {/* Row 1: Original time */}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Original time</Text>
            <Text style={styles.originalValue}>{ORIGINAL_TIME}</Text>
          </View>

          <View style={styles.summaryDivider} />

          {/* Row 2: New proposal */}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>New proposal</Text>
            <Text style={styles.newProposalValue}>{newProposal}</Text>
          </View>

          <View style={styles.summaryDivider} />

          {/* Row 3: Status */}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Status</Text>
            <Text style={styles.statusValue}>Awaiting tenant</Text>
          </View>
        </View>
      </ScrollView>

      {/* ─── Bottom CTA ──────────────────────────────────────────────── */}
      <View style={styles.bottomArea}>
        <Pressable
          onPress={handleBackToRequests}
          style={styles.cta}
          accessibilityLabel="Back to requests"
          accessibilityRole="button">
          <Text style={styles.ctaText}>Back to requests</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.bg,
  },

  // Header
  header: {
    height: space.headerH,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: color.line,
    paddingHorizontal: space.screenH,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: color.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingRight: 40,
  },
  headerTitle: {
    fontFamily: font.semibold,
    fontSize: 17,
    color: color.ink,
  },

  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: space.screenH,
    paddingTop: 40,
    paddingBottom: 24,
  },

  // Hero
  heroSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  heroOuterCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#FFF8E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  heroInnerCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E67E22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroHeadline: {
    fontFamily: font.display,
    fontSize: 28,
    color: color.ink,
    textAlign: 'center',
    marginBottom: 10,
  },
  heroSubtitle: {
    fontFamily: font.sans,
    fontSize: size.bodySm,
    color: color.ink2,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
  },

  // Summary card
  summaryCard: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: color.line,
    backgroundColor: color.bg,
    paddingVertical: space.cardPad,
    paddingHorizontal: space.cardPad,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  summaryLabel: {
    fontFamily: font.sans,
    fontSize: size.bodySm,
    color: color.ink3,
  },
  originalValue: {
    fontFamily: font.sans,
    fontSize: size.bodySm,
    color: color.ink3,
    textDecorationLine: 'line-through',
  },
  newProposalValue: {
    fontFamily: font.semibold,
    fontSize: size.bodySm,
    color: color.brand,
  },
  statusValue: {
    fontFamily: font.semibold,
    fontSize: size.bodySm,
    color: color.ink,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: color.divider,
    marginVertical: 6,
  },

  // Bottom CTA
  bottomArea: {
    paddingHorizontal: space.screenH,
    paddingBottom: space.safeBottom + 8,
    paddingTop: 8,
  },
  cta: {
    height: space.buttonH,
    borderRadius: radius.pill,
    backgroundColor: color.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontFamily: font.semibold,
    fontSize: size.body,
    color: color.bg,
  },
});
