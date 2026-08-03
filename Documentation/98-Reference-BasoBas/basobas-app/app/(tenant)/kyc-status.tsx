import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  BadgeCheck,
  Calendar,
  Clock,
  ExternalLink,
  FileText,
  Hash,
  Layers,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react-native';
import { useUser } from '@clerk/expo';

import { ScreenHeader } from '@/src/components/layout/ScreenHeader';
import { SectionLabel } from '@/src/components/layout/SectionLabel';
import { KYCStatusHero } from '@/src/components/kyc/KYCStatusHero';
import { KYCStatusTimeline } from '@/src/components/kyc/KYCStatusTimeline';
import { KYCRejectionNotice } from '@/src/components/kyc/KYCRejectionNotice';
import { PrimaryButton } from '@/src/components/shared/PrimaryButton';
import { useClerkSupabase } from '@/src/hooks/useClerkSupabase';
import { getLatestKYCSubmission } from '@/src/services/kyc.service';
import type {
  KYCStatus,
  KYCStatusUi,
  KYCSubmission,
} from '@/src/types/kyc.types';
import { toKYCStatusUi } from '@/src/types/kyc.types';
import { tokens } from '@/src/theme/tokens';

const { color, font, size, radius, space } = tokens;

const POLL_INTERVAL_MS = 15000;

const formatDateTime = (iso: string): string => {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
};

export default function KYCStatusScreen() {
  const insets = useSafeAreaInsets();
  const { user: clerkUser } = useUser();
  const supabase = useClerkSupabase();
  const clerkId = clerkUser?.id;

  const [submission, setSubmission] = useState<KYCSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(
    async (mode: 'initial' | 'refresh' | 'poll') => {
      if (!clerkId) return;
      if (mode === 'initial') setLoading(true);
      if (mode === 'refresh') setRefreshing(true);
      setErrorMessage(null);

      const result = await getLatestKYCSubmission(clerkId, supabase);
      if (!result.success) {
        setErrorMessage(result.error);
      } else {
        setSubmission(result.data);
      }
      setLoading(false);
      setRefreshing(false);
    },
    [clerkId, supabase]
  );

  useEffect(() => {
    load('initial');
  }, [load]);

  const pollHandleRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (pollHandleRef.current) {
      clearInterval(pollHandleRef.current);
      pollHandleRef.current = null;
    }

    if (submission?.status === 'UNDER_REVIEW') {
      pollHandleRef.current = setInterval(() => {
        load('poll');
      }, POLL_INTERVAL_MS);
    }

    return () => {
      if (pollHandleRef.current) {
        clearInterval(pollHandleRef.current);
        pollHandleRef.current = null;
      }
    };
  }, [submission?.status, load]);

  const onRefresh = useCallback(() => {
    load('refresh');
  }, [load]);

  const uiStatus: KYCStatusUi = submission
    ? toKYCStatusUi(submission.status, true)
    : 'not_submitted';

  if (loading) {
    return (
      <SafeAreaView edges={['top']} style={styles.safe}>
        <ScreenHeader title="Verification Status" showBack centerTitle />
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={color.brand} />
        </View>
      </SafeAreaView>
    );
  }

  if (errorMessage && !submission) {
    return (
      <SafeAreaView edges={['top']} style={styles.safe}>
        <ScreenHeader title="Verification Status" showBack centerTitle />
        <View style={styles.errorWrap}>
          <Text style={styles.errorTitle}>Couldn't load verification status</Text>
          <Text style={styles.errorBody}>{errorMessage}</Text>
          <PrimaryButton
            label="Retry"
            onPress={() => load('initial')}
            style={styles.errorCta}
          />
        </View>
      </SafeAreaView>
    );
  }

  const showTimeline = submission !== null;

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScreenHeader title="Verification Status" showBack centerTitle />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={color.brand}
            colors={[color.brand]}
          />
        }>
        <KYCStatusHero status={uiStatus} />

        {showTimeline && submission && (
          <View style={styles.section}>
            <SectionLabel label="Progress" className="mb-3 ml-1" />
            <View style={styles.timelineCard}>
              <KYCStatusTimeline
                status={submission.status as KYCStatus}
                submittedAt={submission.submittedAt}
                reviewedAt={submission.reviewedAt}
              />
            </View>
          </View>
        )}

        {submission && (
          <View style={styles.section}>
            <SectionLabel label="Submission Details" className="mb-3 ml-1" />
            <View style={styles.detailsCard}>
              <DetailRow
                icon={Calendar}
                label="Submitted on"
                value={formatDateTime(submission.submittedAt)}
              />
              <Divider />
              <DetailRow
                icon={Layers}
                label="Documents"
                value={`2 of 2 · ${submission.documentType === 'CITIZENSHIP' ? 'Citizenship' : 'NID'}`}
              />
              <Divider />
              <DetailRow
                icon={Hash}
                label="Reference ID"
                value={
                  <Text style={styles.mono} selectable>
                    {submission.id.slice(0, 8).toUpperCase()}
                  </Text>
                }
              />
              {submission.reviewedAt && (
                <>
                  <Divider />
                  <DetailRow
                    icon={Clock}
                    label="Reviewed on"
                    value={formatDateTime(submission.reviewedAt)}
                  />
                </>
              )}
              <Divider />
              <DetailRow
                icon={RefreshCw}
                label="Attempt"
                value={`#${submission.attemptNumber}`}
              />
            </View>
          </View>
        )}

        {submission?.status === 'REJECTED' ? (
          <View style={styles.rejectionSection}>
            <KYCRejectionNotice rejectionReason={submission.rejectionReason} />
            <PrimaryButton
              label="Resubmit Documents"
              onPress={() => router.push('/(tenant)/kyc-upload?resubmit=true' as any)}
            />
          </View>
        ) : uiStatus === 'verified' ? (
          <View style={[styles.badgeCard, styles.section]}>
            <View style={styles.badgeIcon}>
              <BadgeCheck size={28} color={color.successDark} strokeWidth={2.2} />
            </View>
            <View style={styles.badgeCopy}>
              <Text style={styles.badgeTitle}>Verified Tenant</Text>
              <Text style={styles.badgeSupporting}>
                Your identity is verified. Landlords can trust you when requesting visits.
              </Text>
            </View>
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Learn more about identity verification"
          style={styles.helpRow}
          onPress={() =>
            Alert.alert(
              'Identity Verification',
              'Your documents are encrypted and reviewed by our team within 1–2 business days.'
            )
          }>
          <ShieldCheck size={14} color={color.ink3} strokeWidth={2} />
          <Text style={styles.helpText}>How verification works</Text>
          <ExternalLink size={12} color={color.ink3} strokeWidth={2} />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

KYCStatusScreen.displayName = 'KYCStatusScreen';

const DetailRow = ({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Calendar;
  label: string;
  value: React.ReactNode;
}) => (
  <View style={styles.detailRow}>
    <View style={styles.detailLeft}>
      <View style={styles.detailIcon}>
        <Icon size={14} color={color.ink2} strokeWidth={1.8} />
      </View>
      <Text style={styles.detailLabel}>{label}</Text>
    </View>
    {typeof value === 'string' ? (
      <Text style={styles.detailValue}>{value}</Text>
    ) : (
      value
    )}
  </View>
);

const Divider = () => <View style={styles.divider} />;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: color.bg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: space.screenH,
    paddingTop: 16,
  },

  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  errorWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.screenH,
    gap: 12,
  },
  errorTitle: {
    fontFamily: font.semibold,
    fontSize: size.body,
    color: color.ink,
    textAlign: 'center',
  },
  errorBody: {
    fontFamily: font.sans,
    fontSize: size.caption,
    color: color.ink2,
    textAlign: 'center',
  },
  errorCta: {
    marginTop: 12,
  },

  section: {
    marginTop: space.sectionGap,
  },
  rejectionSection: {
    marginTop: space.sectionGap,
    gap: 12,
  },

  timelineCard: {
    backgroundColor: color.bg,
    borderWidth: 1,
    borderColor: color.line,
    borderRadius: radius.card,
    padding: space.cardPad,
  },

  detailsCard: {
    backgroundColor: color.bg,
    borderWidth: 1,
    borderColor: color.line,
    borderRadius: radius.card,
    paddingHorizontal: space.cardPad,
    paddingVertical: 4,
  },

  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  detailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: color.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailLabel: {
    fontFamily: font.medium,
    fontSize: size.bodySm,
    color: color.ink2,
  },
  detailValue: {
    fontFamily: font.sans,
    fontSize: size.bodySm,
    color: color.ink,
  },
  mono: {
    fontFamily: 'Courier',
    fontSize: size.caption,
    color: color.ink3,
  },
  divider: {
    height: 1,
    backgroundColor: color.divider,
    marginLeft: 36,
  },

  badgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: space.cardPad,
    borderRadius: radius.card,
    backgroundColor: color.successBg,
    borderWidth: 1,
    borderColor: color.successDark + '33',
  },
  badgeIcon: {
    width: 48,
    height: 48,
    borderRadius: 999,
    backgroundColor: color.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeCopy: {
    flex: 1,
  },
  badgeTitle: {
    fontFamily: font.semibold,
    fontSize: size.body,
    color: color.successDark,
  },
  badgeSupporting: {
    fontFamily: font.sans,
    fontSize: size.caption,
    color: color.ink2,
    marginTop: 2,
    lineHeight: 18,
  },

  helpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
    marginTop: space.sectionGap,
    paddingVertical: 8,
  },
  helpText: {
    fontFamily: font.medium,
    fontSize: size.caption,
    color: color.ink3,
  },
});
