import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Lock, ShieldCheck, X } from 'lucide-react-native';
import { useUser } from '@clerk/expo';

import { ScreenHeader } from '@/src/components/layout/ScreenHeader';
import { SectionLabel } from '@/src/components/layout/SectionLabel';
import { PrimaryButton } from '@/src/components/shared/PrimaryButton';
import {
  DocumentUploadCard,
  type DocumentUploadCardStatus,
} from '@/src/components/kyc/DocumentUploadCard';
import {
  DocumentTypeSelector,
  type KYCDocumentType,
} from '@/src/components/kyc/DocumentTypeSelector';
import { KYCBenefitsList } from '@/src/components/kyc/KYCBenefitsList';
import { useClerkSupabase } from '@/src/hooks/useClerkSupabase';
import { getLatestKYCSubmission, submitKYC } from '@/src/services/kyc.service';
import type {
  KYCSubmission,
  KYCDocumentSlot,
} from '@/src/types/kyc.types';
import { tokens } from '@/src/theme/tokens';

const { color, font, size, radius, space } = tokens;

interface SlotState {
  status: DocumentUploadCardStatus;
  previewUri: string | null;
  storagePath: string | null;
  isPrefill: boolean;
  errorMessage?: string;
  /** 0..1 while `status === 'uploading'`. */
  progress?: number;
}

const emptySlot = (): SlotState => ({
  status: 'empty',
  previewUri: null,
  storagePath: null,
  isPrefill: false,
});

const uploadedFromServer = (path: string): SlotState => ({
  status: 'uploaded',
  previewUri: null,
  storagePath: path,
  isPrefill: true,
});

export default function KYCUploadScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ resubmit?: string }>();
  const isResubmit = params.resubmit === 'true';

  const { user: clerkUser } = useUser();
  const supabase = useClerkSupabase();
  const clerkId = clerkUser?.id;

  // ── State ────────────────────────────────────────────────────────────────
  const [front, setFront] = useState<SlotState>(emptySlot);
  const [back, setBack] = useState<SlotState>(emptySlot);
  const [hydrating, setHydrating] = useState(true);
  const [hydratedSubmission, setHydratedSubmission] = useState<KYCSubmission | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [documentType, setDocumentType] = useState<KYCDocumentType>('CITIZENSHIP');

  // Guard so we only hydrate once per screen lifetime.
  const hydratedRef = useRef(false);

  // ── Hydrate from prior submission ────────────────────────────────────────
  useEffect(() => {
    if (!clerkId) return;
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    (async () => {
      const result = await getLatestKYCSubmission(clerkId, supabase);
      if (result.success && result.data) {
        setHydratedSubmission(result.data);
        if (result.data.frontImagePath) setFront(uploadedFromServer(result.data.frontImagePath));
        if (result.data.backImagePath)  setBack(uploadedFromServer(result.data.backImagePath));
      }
      setHydrating(false);
    })();
  }, [clerkId, supabase]);

  // ── Derived flags ────────────────────────────────────────────────────────
  // "Ready to submit" = both slots have a file ready (locally picked OR
  // pre-filled from a previous submission). The Submit handler decides
  // which to actually re-upload.
  const allUploaded = useMemo(() => {
    const frontReady =
      front.status === 'uploaded' || front.status === 'selected';
    const backReady =
      back.status === 'uploaded' || back.status === 'selected';
    const frontBusy = front.status === 'uploading' || front.status === 'error';
    const backBusy = back.status === 'uploading' || back.status === 'error';
    return frontReady && backReady && !frontBusy && !backBusy;
  }, [front.status, back.status]);

  // ── Slot handlers ────────────────────────────────────────────────────────
  const updateSlot = useCallback(
    (slot: KYCDocumentSlot, patch: Partial<SlotState>) => {
      const setter = slot === 'front' ? setFront : setBack;
      setter((prev) => ({ ...prev, ...patch }));
    },
    []
  );

  const handlePick = useCallback(
    (slot: KYCDocumentSlot, uri: string) => {
      // Replacing a previously-uploaded (pre-fill) file flips isPrefill off so
      // the user sees the standard uploaded UX with thumbnail + Replace/Remove.
      updateSlot(slot, {
        status: 'selected',
        previewUri: uri,
        storagePath: null,
        isPrefill: false,
        errorMessage: undefined,
      });
    },
    [updateSlot]
  );

  const handleRemove = useCallback(
    (slot: KYCDocumentSlot) => {
      const setter = slot === 'front' ? setFront : setBack;
      setter(emptySlot());
    },
    []
  );

  const handleRetry = useCallback(
    (slot: KYCDocumentSlot) => {
      // After a failed upload, retry by resetting to selected so the user can
      // re-tap to pick again — keeps the same image rather than discarding.
      const current = slot === 'front' ? front : back;
      updateSlot(slot, {
        status: current.previewUri ? 'selected' : 'empty',
        errorMessage: undefined,
      });
    },
    [front, back, updateSlot]
  );

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!clerkId) {
      Alert.alert('Not signed in', 'Please sign in again to continue.');
      return;
    }
    // "Ready to submit" = both slots have either a freshly-picked local file
    // (previewUri) OR an existing server path (storagePath from a pre-fill).
    // Either is enough — we upload only what's local.
    const frontReady = !!front.previewUri || !!front.storagePath;
    const backReady  = !!back.previewUri  || !!back.storagePath;
    if (!frontReady || !backReady) {
      Alert.alert(
        'Documents required',
        'Both front and back of your ID need to be uploaded before submitting.'
      );
      return;
    }

    setSubmitting(true);

    // Helper to set the per-slot state during upload. Side effects of the
    // submit-KYC flow surface here so the cards visibly progress.
    const setSlot = (slot: KYCDocumentSlot, patch: Partial<SlotState>) => {
      const setter = slot === 'front' ? setFront : setBack;
      setter((prev) => ({ ...prev, ...patch }));
    };

    // Move both slots into "uploading" before we start so the bars appear
    // immediately. The onProgress callback will then advance each one.
    setSlot('front', {
      status: front.previewUri ? 'uploading' : 'uploaded',
      progress: front.previewUri ? 0 : 1,
    });
    setSlot('back', {
      status: back.previewUri ? 'uploading' : 'uploaded',
      progress: back.previewUri ? 0 : 1,
    });

    const result = await submitKYC({
      clerkId,
      documentType,
      frontLocalUri: front.previewUri,
      backLocalUri: back.previewUri,
      existingFrontPath: front.storagePath,
      existingBackPath: back.storagePath,
      supabase,
      onProgress: (side, progress) => {
        setSlot(side, { status: 'uploading', progress });
      },
    });

    if (!result.success) {
      // Mark whichever side was in-flight as errored. We can't always know
      // which side failed (the service returns a single combined error),
      // but the error message starts with "Front" or "Back", so use that.
      const which = result.error.toLowerCase().startsWith('front')
        ? 'front'
        : 'back';
      setSlot(which, {
        status: 'error',
        progress: 0,
        errorMessage: result.error,
      });
      // The other side stays at whatever progress it reached — likely 1.0
      // if it succeeded, or stuck at its last pulse value if it didn't run.
      setSubmitting(false);
      Alert.alert('Verification Failed', result.error, [{ text: 'Try Again' }]);
      return;
    }

    // Success — both slots uploaded. Reflect the server paths locally so
    // the cards flip to the "uploaded" state with the green check.
    setSlot('front', { status: 'uploaded', progress: 1, isPrefill: false });
    setSlot('back',  { status: 'uploaded', progress: 1, isPrefill: false });
    setSubmitting(false);

    router.replace('/(tenant)/kyc-status' as any);
  }, [clerkId, documentType, front.previewUri, front.storagePath, back.previewUri, back.storagePath, supabase]);

  const handleSkip = useCallback(() => {
    router.replace('/(tenant)/(tabs)/profile' as any);
  }, []);

  // ── Render ───────────────────────────────────────────────────────────────
  if (hydrating) {
    return (
      <SafeAreaView edges={['top']} style={styles.safe}>
        <ScreenHeader title="Identity Verification" showBack centerTitle />
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={color.brand} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScreenHeader title="Identity Verification" showBack centerTitle />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 160 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        {/* ── Rejection banner ──────────────────────────────────────────── */}
        {isResubmit && hydratedSubmission?.status === 'REJECTED' && (
          <View style={styles.resubmitBanner} accessibilityLabel="Previous submission was rejected">
            <ShieldCheck size={16} color={color.warn} strokeWidth={2.2} />
            <Text style={styles.resubmitText}>
              Previous submission was rejected. Update the flagged documents and resubmit.
            </Text>
            <Pressable
              onPress={() => router.replace('/(tenant)/kyc-status' as any)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="See reason">
              <Text style={styles.resubmitLink}>See reason</Text>
            </Pressable>
          </View>
        )}

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <View style={styles.heroRow}>
          <View style={styles.heroIcon}>
            <ShieldCheck size={22} color={color.brand} strokeWidth={2.2} />
          </View>
        </View>
        <Text style={styles.heroTitle}>Verify your identity</Text>
        <Text style={styles.heroBody}>
          Optional for tenants, but verified profiles get faster visit approvals
          from landlords.
        </Text>

        {/* ── Benefits ─────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <KYCBenefitsList />
        </View>

        {/* ── Documents ────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <SectionLabel label="Document Type" className="mb-3 ml-1" />
          <DocumentTypeSelector value={documentType} onChange={setDocumentType} />

          <View style={{ height: space.sectionGap }} />

          <SectionLabel label="Documents Required" className="mb-3 ml-1" />
          <View style={styles.uploadStack}>
            <DocumentUploadCard
              label={`${documentType === 'CITIZENSHIP' ? 'Citizenship' : 'National ID'} — Front`}
              hint="Front side, clearly legible"
              status={front.status}
              previewUri={front.previewUri}
              progress={front.progress ?? 0}
              isPrefill={front.isPrefill}
              errorMessage={front.errorMessage}
              onPick={(uri) => handlePick('front', uri)}
              onRemove={() => handleRemove('front')}
              onRetry={() => handleRetry('front')}
            />
            <DocumentUploadCard
              label={`${documentType === 'CITIZENSHIP' ? 'Citizenship' : 'National ID'} — Back`}
              hint="Back side, clearly legible"
              status={back.status}
              previewUri={back.previewUri}
              progress={back.progress ?? 0}
              isPrefill={back.isPrefill}
              errorMessage={back.errorMessage}
              onPick={(uri) => handlePick('back', uri)}
              onRemove={() => handleRemove('back')}
              onRetry={() => handleRetry('back')}
            />
          </View>

          <View style={styles.privacy}>
            <Lock size={12} color={color.ink3} strokeWidth={2} />
            <Text style={styles.privacyText}>
              Documents are encrypted and used for verification only.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* ── Sticky bottom CTA ─────────────────────────────────────────── */}
      <View
        style={[
          styles.bottom,
          { paddingBottom: insets.bottom + 16 },
        ]}>
        <PrimaryButton
          label="Submit for Verification"
          onPress={handleSubmit}
          disabled={!allUploaded}
          loading={submitting}
        />
        <Pressable
          onPress={handleSkip}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Skip for now"
          style={styles.skipBtn}>
          <Text style={styles.skipText}>Skip for now</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

KYCUploadScreen.displayName = 'KYCUploadScreen';

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

  // Resubmit banner ─────────────────────────────────────────────────────────
  resubmitBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: radius.card,
    backgroundColor: color.warnBg,
    borderWidth: 1,
    borderColor: color.warn + '33',
    marginBottom: space.cardPad,
  },
  resubmitText: {
    flex: 1,
    fontFamily: font.sans,
    fontSize: size.caption,
    color: color.warn,
    lineHeight: 18,
  },
  resubmitLink: {
    fontFamily: font.semibold,
    fontSize: size.caption,
    color: color.warn,
  },

  // Hero ────────────────────────────────────────────────────────────────────
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: color.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroTitle: {
    fontFamily: font.display,
    fontSize: 28,
    lineHeight: 34,
    color: color.ink,
    marginBottom: 8,
  },
  heroBody: {
    fontFamily: font.sans,
    fontSize: size.bodySm,
    lineHeight: 20,
    color: color.ink2,
    marginBottom: space.cardPad,
  },

  // Section spacing ─────────────────────────────────────────────────────────
  section: {
    marginTop: space.sectionGap,
  },

  uploadStack: {
    gap: 12,
  },

  privacy: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
  },
  privacyText: {
    fontFamily: font.sans,
    fontSize: size.micro + 1,
    color: color.ink3,
  },

  // Bottom sticky CTA ───────────────────────────────────────────────────────
  bottom: {
    paddingHorizontal: space.screenH,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: color.line,
    backgroundColor: color.bg,
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  skipText: {
    fontFamily: font.medium,
    fontSize: size.caption,
    color: color.ink2,
  },
});