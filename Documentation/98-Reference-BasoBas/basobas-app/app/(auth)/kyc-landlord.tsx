import React, { useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Upload, X, Shield, Check, Zap, CheckCheck } from 'lucide-react-native'
import * as ImagePicker from 'expo-image-picker'
import * as ImageManipulator from 'expo-image-manipulator'
import * as Haptics from 'expo-haptics'
import { useSession, useUser } from '@clerk/expo'

import { OnboardingHeader } from '@/src/components/onboarding/OnboardingHeader'
import { StepProgressBar } from '@/src/components/onboarding/StepProgressBar'
import { OnboardingEyebrow } from '@/src/components/onboarding/OnboardingEyebrow'
import { PrimaryButton } from '@/src/components/shared/PrimaryButton'
import { VideoUploadCard } from '@/src/components/kyc/VideoUploadCard'
import { useOnboardingStore } from '@/src/store/onboardingStore'
import { useClerkSupabase } from '@/src/hooks/useClerkSupabase'
import { validateImageAsset } from '@/src/lib/imageValidation'
import { completeOnboarding } from '@/src/services/onboarding.service'
import { tokens } from '@/src/theme/tokens'
import type { DocumentType } from '@/src/types/onboarding.types'

const { color, space, radius, font, size } = tokens

// ─── Document Upload Zone ─────────────────────────────────────────────────────

interface DocumentUploadZoneProps {
  label: string
  sublabel?: string
  imageUri: string | null
  onUpload: () => void
  onRemove: () => void
}

const DocumentUploadZone: React.FC<DocumentUploadZoneProps> = ({
  label,
  sublabel,
  imageUri,
  onUpload,
  onRemove,
}) => (
  <TouchableOpacity
    style={[styles.uploadZone, imageUri && styles.uploadZoneFilled]}
    onPress={imageUri ? onRemove : onUpload}
    accessibilityLabel={`${label} — ${imageUri ? 'tap to remove' : 'tap to upload'}`}
    accessibilityRole="button"
  >
    {imageUri ? (
      <>
        <Image
          source={{ uri: imageUri }}
          style={styles.uploadPreview}
          resizeMode="cover"
        />
        <View style={styles.removeOverlay}>
          <X size={16} color={color.bg} strokeWidth={2.5} />
        </View>
      </>
    ) : (
      <>
        <Upload size={20} color={color.ink3} strokeWidth={1.8} />
        <Text style={styles.uploadLabel}>{label}</Text>
        {sublabel && <Text style={styles.uploadSub}>{sublabel}</Text>}
      </>
    )}
  </TouchableOpacity>
)

// ─── Document Picker Hook ─────────────────────────────────────────────────────

const compressDoc = async (uri: string): Promise<string> => {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1200 } }],
    { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
  )
  return result.uri
}

const pickFromOptions = async (
  onImage: (uri: string) => void,
  compress: boolean = true
) => {
  Alert.alert('Upload Document', 'Choose an option', [
    {
      text: 'Take Photo',
      onPress: async () => {
        const perm = await ImagePicker.requestCameraPermissionsAsync()
        if (!perm.granted) {
          Alert.alert('Camera access needed', 'Please allow camera in settings.')
          return
        }
        const result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          quality: 1,
        })
        if (!result.canceled && result.assets[0]) {
          const check = validateImageAsset(result.assets[0], 'kyc_document')
          if (!check.ok) {
            Alert.alert('Invalid document', check.message)
            return
          }
          const uri = compress
            ? await compressDoc(result.assets[0].uri)
            : result.assets[0].uri
          onImage(uri)
        }
      },
    },
    {
      text: 'Choose from Library',
      onPress: async () => {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
        if (!perm.granted) {
          Alert.alert('Photo access needed', 'Please allow photo library in settings.')
          return
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          quality: 1,
        })
        if (!result.canceled && result.assets[0]) {
          const check = validateImageAsset(result.assets[0], 'kyc_document')
          if (!check.ok) {
            Alert.alert('Invalid document', check.message)
            return
          }
          const uri = compress
            ? await compressDoc(result.assets[0].uri)
            : result.assets[0].uri
          onImage(uri)
        }
      },
    },
    { text: 'Cancel', style: 'cancel' },
  ])
}

// ─── Document Type Chips ──────────────────────────────────────────────────────

interface DocTypeChipProps {
  label: string
  active: boolean
  onPress: () => void
}

const DocTypeChip: React.FC<DocTypeChipProps> = ({ label, active, onPress }) => (
  <TouchableOpacity
    style={[styles.docTypeChip, active && styles.docTypeChipActive]}
    onPress={async () => {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      onPress()
    }}
    accessibilityRole="radio"
    accessibilityLabel={label}
    accessibilityState={{ selected: active }}
  >
    {active && <Check size={12} color={color.bg} strokeWidth={3} />}
    <Text style={[styles.docTypeText, active && styles.docTypeTextActive]}>
      {label}
    </Text>
  </TouchableOpacity>
)

// ─── KYCLandlord Screen ───────────────────────────────────────────────────────

export default function KYCLandlordScreen() {
  const router = useRouter()
  const { user } = useUser()
  const { session } = useSession()
  const supabase = useClerkSupabase()

  const {
    roles,
    profile,
    kyc,
    setFrontImage,
    setBackImage,
    setDocumentType,
    setElectricityBill,
    setHomeTourVideo,
    setSubmitting,
    setSubmitError,
    setOnboardingComplete,
    isSubmitting,
  } = useOnboardingStore()

  const { frontImageUri, backImageUri, electricityBillUri, homeTourVideoUri, documentType } = kyc

  const canSubmit = !!(
    documentType &&
    frontImageUri &&
    backImageUri &&
    electricityBillUri &&
    homeTourVideoUri
  )

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !user) return
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    setSubmitting(true)

    const result = await completeOnboarding({
      clerkId: user.id,
      phone: user.phoneNumbers?.[0]?.phoneNumber ?? '',
      roles,
      fullName: profile.fullName,
      city: profile.city,
      avatarLocalUri: profile.avatarUri,
      preferences: profile.preferences as any,
      supabase,
      kyc: {
        documentType:            documentType ?? 'CITIZENSHIP',
        frontLocalUri:           frontImageUri!,
        backLocalUri:            backImageUri!,
        electricityBillLocalUri: electricityBillUri ?? undefined,
        homeTourVideoLocalUri:   homeTourVideoUri ?? undefined,
      },
      getToken: async () => (session ? await session.getToken() : null),
    })

    setSubmitting(false)

    if (!result.success) {
      setSubmitError(result.error)
      Alert.alert(
        'Verification Failed',
        result.error,
        [{ text: 'Try Again' }]
      )
      return
    }

    setOnboardingComplete(true)
    router.replace('/(auth)/confirmation')
  }, [canSubmit, user, session, roles, profile, kyc, frontImageUri, backImageUri, electricityBillUri, homeTourVideoUri, documentType, supabase, router, setSubmitting, setSubmitError, setOnboardingComplete])

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Header — no skip for landlord */}
      <OnboardingHeader />

      {/* Progress */}
      <StepProgressBar currentStep={3} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {/* Eyebrow + badge row */}
        <View style={styles.eyebrowRow}>
          <OnboardingEyebrow text="Step 3 · Identity Verification" />
          <View style={[styles.badge, styles.badgeRequired]}>
            <Text style={styles.badgeTextRequired}>Required</Text>
          </View>
        </View>

        {/* Headline */}
        <Text style={styles.headline}>Verify your{'\n'}identity</Text>

        {/* Body */}
        <Text style={styles.body}>
          Verification is required before you can publish{'\n'}
          any property listing.
        </Text>

        {/* Why we verify card */}
        <View style={styles.whyCard}>
          <View style={styles.whyHeader}>
            <Shield size={18} color={color.brand} />
            <Text style={styles.whyTitle}>Why we verify identity</Text>
          </View>
          {[
            'Builds trust between tenants and landlords',
            'Keeps the platform safe from scams',
            'Your listings show a Verified ✓ badge',
          ].map((point) => (
            <View key={point} style={styles.whyRow}>
              <Check size={14} color={color.brand} strokeWidth={2.5} />
              <Text style={styles.whyText}>{point}</Text>
            </View>
          ))}
        </View>

        {/* ── Document Type Selector ── */}
        <Text style={styles.sectionTitle}>
          Document type <Text style={styles.required}>*</Text>
        </Text>
        <View style={styles.docTypeRow}>
          {(['CITIZENSHIP', 'NATIONAL_ID'] as DocumentType[]).map((type) => (
            <DocTypeChip
              key={type}
              label={type === 'CITIZENSHIP' ? 'Citizenship' : 'NID Card'}
              active={documentType === type}
              onPress={() => setDocumentType(type)}
            />
          ))}
        </View>

        {/* Validation: document type */}
        {!documentType && <Text style={styles.validationText}>Select a document type</Text>}

        {/* ── ID Document Upload ── */}
        <Text style={styles.sectionTitle}>
          Upload your ID document <Text style={styles.required}>*</Text>
        </Text>

        <View style={styles.uploadRow}>
          <DocumentUploadZone
            label="Front side"
            imageUri={frontImageUri}
            onUpload={() => pickFromOptions((uri) => setFrontImage(uri))}
            onRemove={() => setFrontImage(null)}
          />
          <DocumentUploadZone
            label="Back side"
            imageUri={backImageUri}
            onUpload={() => pickFromOptions((uri) => setBackImage(uri))}
            onRemove={() => setBackImage(null)}
          />
        </View>

        {/* Validation: ID upload */}
        {documentType && (!frontImageUri || !backImageUri) && (
          <Text style={styles.validationText}>
            Please upload both front and back of your document
          </Text>
        )}

        {/* ── Electricity Bill Upload (required) ── */}
        <Text style={styles.sectionTitle}>
          Electricity Bill <Text style={styles.required}>*</Text>
        </Text>
        <Text style={styles.sectionSubtitle}>
          Upload a recent utility bill to verify your address
        </Text>

        <View style={styles.electricityRow}>
          <DocumentUploadZone
            label="Electricity bill"
            sublabel="Recent bill preferred"
            imageUri={electricityBillUri}
            onUpload={() => pickFromOptions((uri) => setElectricityBill(uri))}
            onRemove={() => setElectricityBill(null)}
          />
        </View>

        {electricityBillUri && (
          <View style={styles.uploadSuccessBanner}>
            <Zap size={14} color={color.brand} strokeWidth={2.5} />
            <Text style={styles.uploadSuccessText}>Bill uploaded</Text>
            <CheckCheck size={16} color={color.brand} />
          </View>
        )}

        {/* Validation: electricity bill */}
        {!electricityBillUri && (
          <Text style={styles.validationText}>Please upload a recent electricity bill</Text>
        )}

        <Text style={styles.fileNote}>JPEG or PNG · Max 5MB each</Text>

        {/* ── Home Tour Video (required extra verification) ── */}
        <View style={styles.videoSectionHeader}>
          <Text style={styles.sectionTitle}>Home Tour Video</Text>
          <View style={[styles.badge, styles.badgeRequired]}>
            <Text style={styles.badgeTextRequired}>Required</Text>
          </View>
        </View>
        <Text style={styles.sectionSubtitle}>
          Record a short 1–2 minute walkthrough of your home to build trust and verify faster
        </Text>

        <VideoUploadCard
          label="Home tour video"
          hint="Show the rooms, entrance and common areas"
          status={homeTourVideoUri ? 'selected' : 'empty'}
          onPick={(uri) => setHomeTourVideo(uri)}
          onRemove={() => setHomeTourVideo(null)}
        />

        {!homeTourVideoUri && (
          <Text style={styles.validationText}>
            Please add a short home tour video for extra verification
          </Text>
        )}

        <Text style={[styles.fileNote, styles.videoFileNote]}>
          MP4 or MOV · Up to 2 minutes · Max 100MB
        </Text>
      </ScrollView>

      {/* CTAs */}
      <View style={styles.bottomArea}>
        <PrimaryButton
          label="Submit & Finish Setup →"
          onPress={handleSubmit}
          disabled={!canSubmit}
          loading={isSubmitting}
        />

        <Text style={styles.reviewNote}>
          Review takes 1–2 business days.{'\n'}You can explore the app meanwhile.
        </Text>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: color.bg },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: space.screenH,
    paddingTop: 8,
    paddingBottom: 32,
  },

  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  badgeRequired: { backgroundColor: '#FFF3E0' },
  badgeTextRequired: {
    fontFamily: font.semibold,
    fontSize: size.caption,
    color: '#B45309',
  },

  headline: {
    fontFamily: font.display,
    fontSize: 34,
    color: color.ink,
    lineHeight: 40,
    marginBottom: 12,
  },
  body: {
    fontFamily: font.sans,
    fontSize: size.bodySm,
    color: color.ink2,
    lineHeight: 20,
    marginBottom: space.cardPad,
  },

  // Why card
  whyCard: {
    backgroundColor: color.canvas,
    borderRadius: radius.card,
    padding: space.cardPad,
    marginBottom: space.cardPad,
    gap: 12,
  },
  whyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  whyTitle: {
    fontFamily: font.semibold,
    fontSize: size.bodySm,
    color: color.ink,
  },
  whyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  whyText: {
    flex: 1,
    fontFamily: font.sans,
    fontSize: size.bodySm,
    color: color.ink2,
    lineHeight: 18,
  },

  // Document type selector
  sectionTitle: {
    fontFamily: font.semibold,
    fontSize: size.bodySm,
    color: color.ink,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontFamily: font.sans,
    fontSize: size.caption,
    color: color.ink3,
    marginBottom: 8,
    marginTop: -4,
  },
  required: { color: color.danger },
  docTypeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  docTypeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space.cardPad,
    paddingVertical: 10,
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderColor: color.line,
    backgroundColor: color.bg,
  },
  docTypeChipActive: {
    backgroundColor: color.ink,
    borderColor: color.ink,
  },
  docTypeText: {
    fontFamily: font.medium,
    fontSize: size.bodySm,
    color: color.ink2,
  },
  docTypeTextActive: { color: color.bg },

  validationText: {
    fontFamily: font.sans,
    fontSize: size.caption,
    color: color.danger,
    marginBottom: 12,
    marginTop: -12,
  },

  // Upload
  uploadRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  electricityRow: {
    marginBottom: 8,
  },
  uploadZone: {
    flex: 1,
    height: 120,
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderColor: color.line,
    borderStyle: 'dashed',
    backgroundColor: color.canvas,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    overflow: 'hidden',
  },
  uploadZoneFilled: {
    borderStyle: 'solid',
    borderColor: color.ink,
    padding: 0,
  },
  uploadPreview: {
    width: '100%',
    height: '100%',
  },
  removeOverlay: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadLabel: {
    fontFamily: font.medium,
    fontSize: size.caption,
    color: color.ink2,
  },
  uploadSub: {
    fontFamily: font.sans,
    fontSize: size.micro,
    color: color.ink3,
  },

  uploadSuccessBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: color.brandLight,
    borderRadius: radius.sm,
    padding: 8,
    marginBottom: 4,
    flex: 1,
  },
  uploadSuccessText: {
    display:"flex",
    fontFamily: font.sans,
    fontSize: size.caption,
    color: color.brand,
  },

  fileNote: {
    fontFamily: font.sans,
    fontSize: size.micro,
    color: color.ink3,
    textAlign: 'center',
    marginTop: 4,
  },

  // Home tour video
  videoSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: space.cardPad,
    marginBottom: 8,
  },
  optionalBadge: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: color.canvas,
    borderWidth: 1,
    borderColor: color.line,
  },
  optionalBadgeText: {
    fontFamily: font.medium,
    fontSize: size.micro + 1,
    color: color.ink3,
  },
  videoFileNote: {
    marginTop: 8,
  },

  // Bottom
  bottomArea: {
    gap: 8,
    paddingBottom: space.cardPad,
  },
  reviewNote: {
    fontFamily: font.sans,
    fontSize: size.caption,
    color: color.ink3,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: space.screenH,
  },
})
