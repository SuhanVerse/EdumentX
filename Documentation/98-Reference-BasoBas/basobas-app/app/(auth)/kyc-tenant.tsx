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
import { Upload, X, Zap, Shield, Check } from 'lucide-react-native'
import * as ImagePicker from 'expo-image-picker'
import * as ImageManipulator from 'expo-image-manipulator'
import * as Haptics from 'expo-haptics'
import { useUser } from '@clerk/expo'

import { OnboardingHeader } from '@/src/components/onboarding/OnboardingHeader'
import { StepProgressBar } from '@/src/components/onboarding/StepProgressBar'
import { OnboardingEyebrow } from '@/src/components/onboarding/OnboardingEyebrow'
import { PrimaryButton } from '@/src/components/shared/PrimaryButton'
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
  imageUri: string | null
  onUpload: () => void
  onRemove: () => void
}

const DocumentUploadZone: React.FC<DocumentUploadZoneProps> = ({
  label,
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
        <Text style={styles.uploadSub}>Tap to upload</Text>
      </>
    )}
  </TouchableOpacity>
)

// ─── Document Type Chip ────────────────────────────────────────────────────────

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

// ─── Document Picker Hook ─────────────────────────────────────────────────────

const useDocumentPicker = () => {
  const { setFrontImage, setBackImage, kyc } = useOnboardingStore()

  const compressDoc = async (uri: string): Promise<string> => {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1200 } }],
      { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
    )
    return result.uri
  }

  const pickImage = async (side: 'front' | 'back') => {
    const setter = side === 'front' ? setFrontImage : setBackImage

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
            const compressed = await compressDoc(result.assets[0].uri)
            setter(compressed)
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
            const compressed = await compressDoc(result.assets[0].uri)
            setter(compressed)
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ])
  }

  return { pickImage, frontUri: kyc.frontImageUri, backUri: kyc.backImageUri }
}

// ─── KYCTenant Screen ─────────────────────────────────────────────────────────

export default function KYCTenantScreen() {
  const router = useRouter()
  const { user } = useUser()
  const supabase = useClerkSupabase()

  const {
    roles,
    profile,
    kyc,
    setFrontImage,
    setBackImage,
    setDocumentType,
    setSubmitting,
    setSubmitError,
    setOnboardingComplete,
    isSubmitting,
  } = useOnboardingStore()

  const { pickImage, frontUri, backUri } = useDocumentPicker()

  const { documentType } = kyc

  const canSubmit = !!(documentType && frontUri && backUri)

  const handleSkip = useCallback(() => {
    router.replace('/(auth)/confirmation')
  }, [router])

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
        documentType: documentType ?? 'CITIZENSHIP',
        frontLocalUri: kyc.frontImageUri!,
        backLocalUri: kyc.backImageUri!,
      },
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
  }, [canSubmit, user, roles, profile, kyc, documentType, supabase, router, setSubmitting, setSubmitError, setOnboardingComplete])

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Header */}
      <OnboardingHeader
        showSkip
        onSkip={handleSkip}
        skipLabel="Skip"
      />

      {/* Progress */}
      <StepProgressBar currentStep={3} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Eyebrow + badge row */}
        <View style={styles.eyebrowRow}>
          <OnboardingEyebrow text="Step 3 · Identity Verification" />
          <View
            style={[
              styles.badge,
              styles.badgeOptional,
            ]}
          >
            <Text
              style={styles.badgeTextOptional}
            >
              Optional
            </Text>
          </View>
        </View>

        {/* Headline */}
        <Text style={styles.headline}>
          Verify your{'\n'}identity
        </Text>

        {/* Body */}
        <Text style={styles.body}>
          Optional for tenants. Verified profiles get faster{'\n'}
          visit approvals from landlords.
        </Text>

        {/* Tenant-only benefit card */}
        <View style={styles.benefitCard}>
          <Zap size={14} color={color.brand} strokeWidth={2.5} />
          <Text style={styles.benefitText}>
            Verified tenants get 3× faster approvals from landlords.
          </Text>
        </View>

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
        <Text style={styles.uploadTitle}>
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

        {!documentType && (
          <Text style={styles.validationText}>Select a document type</Text>
        )}

        {/* Document upload */}
        <Text style={styles.uploadTitle}>Upload your document</Text>

        {documentType && !frontUri && !backUri && (
          <Text style={styles.validationText}>
            Please upload both front and back of your document
          </Text>
        )}

        <View style={styles.uploadRow}>
          <DocumentUploadZone
            label="Front side"
            imageUri={frontUri}
            onUpload={() => pickImage('front')}
            onRemove={() => setFrontImage(null)}
          />
          <DocumentUploadZone
            label="Back side"
            imageUri={backUri}
            onUpload={() => pickImage('back')}
            onRemove={() => setBackImage(null)}
          />
        </View>

        <Text style={styles.fileNote}>JPEG or PNG  ·  Max 5MB each</Text>
      </ScrollView>

      {/* CTAs */}
      <View style={styles.bottomArea}>
        <PrimaryButton
          label="Submit for Verification →"
          onPress={handleSubmit}
          disabled={!canSubmit}
          loading={isSubmitting}
        />

        <TouchableOpacity
          onPress={handleSkip}
          style={styles.skipButton}
          accessibilityRole="button"
          accessibilityLabel="Skip for now"
        >
          <Text style={styles.skipText}>
            Skip for now, I'll do this later
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
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
  badgeOptional: { backgroundColor: color.brandLight },
  badgeTextOptional: {
    fontFamily: font.semibold,
    fontSize: size.caption,
    color: color.brand,
  },

  headline: {
    fontFamily: font.display,
    fontSize: size.h2,
    color: color.ink,
    lineHeight: 30,
    marginBottom: 12,
  },
  body: {
    fontFamily: font.sans,
    fontSize: size.bodySm,
    color: color.ink2,
    lineHeight: 20,
    marginBottom: space.cardPad,
  },

  // Benefit card (tenant only)
  benefitCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: color.brandLight,
    borderRadius: radius.md,
    padding: space.cardPad,
    marginBottom: space.cardPad,
  },
  benefitText: {
    flex: 1,
    fontFamily: font.medium,
    fontSize: size.bodySm,
    color: color.brand,
    lineHeight: 18,
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
  required: { color: color.danger },

  validationText: {
    fontFamily: font.sans,
    fontSize: size.caption,
    color: color.danger,
    marginBottom: 12,
    marginTop: -12,
  },

  // Upload
  uploadTitle: {
    fontFamily: font.semibold,
    fontSize: size.bodySm,
    color: color.ink,
    marginBottom: 12,
  },
  uploadRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
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

  fileNote: {
    fontFamily: font.sans,
    fontSize: size.micro,
    color: color.ink3,
    textAlign: 'center',
    marginTop: 4,
  },

  // Bottom
  bottomArea: {
    gap: 8,
    paddingBottom: space.cardPad,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  skipText: {
    fontFamily: font.medium,
    fontSize: size.bodySm,
    color: color.ink3,
  },
})
