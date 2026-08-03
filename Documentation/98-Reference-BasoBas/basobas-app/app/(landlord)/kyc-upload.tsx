import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Lock, ShieldCheck, Zap, CheckCheck } from 'lucide-react-native';
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
import { useClerkSupabase } from '@/src/hooks/useClerkSupabase';
import { getLatestKYCSubmission, submitKYC } from '@/src/services/kyc.service';
import type { KYCSubmission, KYCDocumentSlot } from '@/src/types/kyc.types';
import { tokens } from '@/src/theme/tokens';

const { color, font, size, radius, space } = tokens;

interface SlotState {
  status: DocumentUploadCardStatus;
  previewUri: string | null;
  storagePath: string | null;
  isPrefill: boolean;
  errorMessage?: string;
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

export default function LandlordKYCUploadScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ resubmit?: string }>();
  const isResubmit = params.resubmit === 'true';

  const { user: clerkUser } = useUser();
  const supabase = useClerkSupabase();
  const clerkId = clerkUser?.id;

  const [front, setFront] = useState<SlotState>(emptySlot);
  const [back, setBack] = useState<SlotState>(emptySlot);
  const [bill, setBill] = useState<SlotState>(emptySlot);
  const [hydrating, setHydrating] = useState(true);
  const [hydratedSubmission, setHydratedSubmission] = useState<KYCSubmission | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [documentType, setDocumentType] = useState<KYCDocumentType>('CITIZENSHIP');

  const hydratedRef = useRef(false);

  useEffect(() => {
    if (!clerkId) return;
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    (async () => {
      const result = await getLatestKYCSubmission(clerkId, supabase);
      if (result.success && result.data) {
        setHydratedSubmission(result.data);
        if (result.data.frontImagePath) setFront(uploadedFromServer(result.data.frontImagePath));
        if (result.data.backImagePath) setBack(uploadedFromServer(result.data.backImagePath));
      }
      setHydrating(false);
    })();
  }, [clerkId, supabase]);

  const allUploaded = useMemo(() => {
    const frontReady = front.status === 'uploaded' || front.status === 'selected';
    const backReady = back.status === 'uploaded' || back.status === 'selected';
    const billReady = bill.status === 'uploaded' || bill.status === 'selected';
    const frontBusy = front.status === 'uploading' || front.status === 'error';
    const backBusy = back.status === 'uploading' || back.status === 'error';
    const billBusy = bill.status === 'uploading' || bill.status === 'error';
    return frontReady && backReady && billReady && !frontBusy && !backBusy && !billBusy;
  }, [front.status, back.status, bill.status]);

  const updateSlot = useCallback(
    (slot: string, patch: Partial<SlotState>) => {
      const setter = slot === 'front' ? setFront : slot === 'back' ? setBack : setBill;
      setter((prev) => ({ ...prev, ...patch }));
    },
    [],
  );

  const handlePick = useCallback(
    (slot: string, uri: string) => {
      updateSlot(slot, {
        status: 'selected',
        previewUri: uri,
        storagePath: null,
        isPrefill: false,
        errorMessage: undefined,
      });
    },
    [updateSlot],
  );

  const handleRemove = useCallback(
    (slot: string) => {
      const setter = slot === 'front' ? setFront : slot === 'back' ? setBack : setBill;
      setter(emptySlot());
    },
    [],
  );

  const handleRetry = useCallback(
    (slot: string) => {
      const current =
        slot === 'front' ? front : slot === 'back' ? back : bill;
      updateSlot(slot, {
        status: current.previewUri ? 'selected' : 'empty',
        errorMessage: undefined,
      });
    },
    [front, back, bill, updateSlot],
  );

  const handleSubmit = useCallback(async () => {
    if (!clerkId) {
      Alert.alert('Not signed in', 'Please sign in again to continue.');
      return;
    }

    const frontReady = !!front.previewUri || !!front.storagePath;
    const backReady = !!back.previewUri || !!back.storagePath;
    const billReady = !!bill.previewUri || !!bill.storagePath;
    if (!frontReady || !backReady) {
      Alert.alert('Documents required', 'Both front and back of your ID need to be uploaded before submitting.');
      return;
    }
    if (!billReady) {
      Alert.alert('Electricity bill required', 'Please upload a recent electricity bill for address verification.');
      return;
    }

    setSubmitting(true);

    const setSlot = (slot: string, patch: Partial<SlotState>) => {
      const setter = slot === 'front' ? setFront : slot === 'back' ? setBack : setBill;
      setter((prev) => ({ ...prev, ...patch }));
    };

    setSlot('front', { status: front.previewUri ? 'uploading' : 'uploaded', progress: front.previewUri ? 0 : 1 });
    setSlot('back', { status: back.previewUri ? 'uploading' : 'uploaded', progress: back.previewUri ? 0 : 1 });
    setSlot('bill', { status: 'uploading', progress: 0 });

    const result = await submitKYC({
      clerkId,
      documentType,
      frontLocalUri: front.previewUri,
      backLocalUri: back.previewUri,
      existingFrontPath: front.storagePath,
      existingBackPath: back.storagePath,
      electricityBillLocalUri: bill.previewUri ?? undefined,
      supabase,
      onProgress: (side, progress) => {
        setSlot(side, { status: 'uploading', progress });
      },
    });

    if (!result.success) {
      const which = result.error.toLowerCase().startsWith('front')
        ? 'front'
        : result.error.toLowerCase().startsWith('back')
          ? 'back'
          : 'bill';
      setSlot(which, { status: 'error', progress: 0, errorMessage: result.error });
      setSubmitting(false);
      Alert.alert('Verification Failed', result.error, [{ text: 'Try Again' }]);
      return;
    }

    setSlot('front', { status: 'uploaded', progress: 1, isPrefill: false });
    setSlot('back', { status: 'uploaded', progress: 1, isPrefill: false });
    setSlot('bill', { status: 'uploaded', progress: 1, isPrefill: false });
    setSubmitting(false);

    router.replace('/(landlord)/verification' as any);
  }, [clerkId, documentType, front.previewUri, front.storagePath, back.previewUri, back.storagePath, bill.previewUri, bill.storagePath, supabase]);

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

  const billLabel = 'Electricity Bill';
  const billHint = 'Recent bill for address verification';

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScreenHeader title="Identity Verification" showBack centerTitle />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 160 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {isResubmit && hydratedSubmission?.status === 'REJECTED' && (
          <View style={styles.resubmitBanner} accessibilityLabel="Previous submission was rejected">
            <ShieldCheck size={16} color={color.warn} strokeWidth={2.2} />
            <Text style={styles.resubmitText}>
              Previous submission was rejected. Update the flagged documents and resubmit.
            </Text>
          </View>
        )}

        <View style={styles.heroRow}>
          <View style={styles.heroIcon}>
            <ShieldCheck size={22} color={color.brand} strokeWidth={2.2} />
          </View>
        </View>
        <Text style={styles.heroTitle}>Verify your identity</Text>
        <Text style={styles.heroBody}>
          Landlords must complete identity verification to publish listings and receive visit requests.
        </Text>

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

          <View style={styles.section}>
            <SectionLabel label="Address Verification" className="mb-3 ml-1" />
            <DocumentUploadCard
              label={billLabel}
              hint={billHint}
              status={bill.status}
              previewUri={bill.previewUri}
              progress={bill.progress ?? 0}
              isPrefill={bill.isPrefill}
              errorMessage={bill.errorMessage}
              onPick={(uri) => handlePick('bill', uri)}
              onRemove={() => handleRemove('bill')}
              onRetry={() => handleRetry('bill')}
            />
          </View>

          {bill.status === 'uploaded' && (
            <View style={styles.uploadSuccessBanner}>
              <Zap size={14} color={color.brand} strokeWidth={2.5} />
              <Text style={styles.uploadSuccessText}>Bill uploaded</Text>
              <CheckCheck size={16} color={color.brand} />
            </View>
          )}

          <View style={styles.privacy}>
            <Lock size={12} color={color.ink3} strokeWidth={2} />
            <Text style={styles.privacyText}>Documents are encrypted and used for verification only.</Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 16 }]}>
        <PrimaryButton
          label="Submit for Verification"
          onPress={handleSubmit}
          disabled={!allUploaded}
          loading={submitting}
        />
      </View>
    </SafeAreaView>
  );
}

LandlordKYCUploadScreen.displayName = 'LandlordKYCUploadScreen';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: space.screenH, paddingTop: 16 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
  resubmitText: { flex: 1, fontFamily: font.sans, fontSize: size.caption, color: color.warn, lineHeight: 18 },
  heroRow: { flexDirection: 'row', alignItems: 'center' },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: color.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroTitle: { fontFamily: font.display, fontSize: 28, lineHeight: 34, color: color.ink, marginBottom: 8 },
  heroBody: { fontFamily: font.sans, fontSize: size.bodySm, lineHeight: 20, color: color.ink2, marginBottom: space.cardPad },
  section: { marginTop: space.sectionGap },
  uploadStack: { gap: 12 },
  uploadSuccessBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: color.brandLight,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  uploadSuccessText: { fontFamily: font.medium, fontSize: size.caption, color: color.brand, flex: 1 },
  privacy: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
  },
  privacyText: { fontFamily: font.sans, fontSize: size.micro + 1, color: color.ink3 },
  bottom: {
    paddingHorizontal: space.screenH,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: color.line,
    backgroundColor: color.bg,
  },
});
