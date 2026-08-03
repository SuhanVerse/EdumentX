import React, { useCallback, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, Image, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import {
  Check,
  Shield,
  Clock,
  Zap,
  Home,
  Search,
  FileText,
  Lightbulb,
  Sparkles,
} from 'lucide-react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  FadeInDown,
} from 'react-native-reanimated'

import { PrimaryButton } from '@/src/components/shared/PrimaryButton'
import { useOnboardingStore } from '@/src/store/onboardingStore'
// NOTE: supabase is obtained via useClerkSupabase() hook below
import { useAuthStore } from '@/src/store/authStore'
import { useUser } from '@clerk/expo'
import { useClerkSupabase } from '@/src/hooks/useClerkSupabase'
import { completeOnboarding } from '@/src/services/onboarding.service'
import { tokens } from '@/src/theme/tokens'
import type { UserRole } from '@/src/types/onboarding.types'

const { color, space, radius, font, size, shadow } = tokens

// ─── Success Checkmark Animation ──────────────────────────────────────────────

const SuccessCheckmark: React.FC = () => {
  const scale = useSharedValue(0)
  const opacity = useSharedValue(0)

  useEffect(() => {
    scale.value = withDelay(
      200,
      withTiming(1, { duration: 500, easing: Easing.out(Easing.back(1.5)) })
    )
    opacity.value = withDelay(
      200,
      withTiming(1, { duration: 400 })
    )
  }, [])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }))

  return (
    <Animated.View style={[styles.checkmarkOuter, animatedStyle]}>
      <View style={styles.checkmarkInner}>
        <Check size={28} color={color.bg} strokeWidth={3} />
      </View>
    </Animated.View>
  )
}

// ─── Summary Card ─────────────────────────────────────────────────────────────

interface SummaryCardProps {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
  delay?: number
  accent?: boolean
}

const SummaryCard: React.FC<SummaryCardProps> = ({
  icon,
  title,
  children,
  delay = 0,
  accent = false,
}) => (
  <Animated.View
    entering={FadeInDown.delay(delay).duration(450).springify()}
    style={[styles.summaryCard, accent && styles.summaryCardAccent]}
  >
    <View style={styles.summaryCardHeader}>
      <View style={[styles.summaryIconSlot, accent && styles.summaryIconSlotAccent]}>
        {icon}
      </View>
      <Text style={[styles.summaryCardTitle, accent && styles.summaryCardTitleAccent]}>
        {title}
      </Text>
    </View>
    {children}
  </Animated.View>
)

// ─── Detail Row ───────────────────────────────────────────────────────────────

interface DetailRowProps {
  label: string
  value: string
  verified?: boolean
}

const DetailRow: React.FC<DetailRowProps> = ({ label, value, verified }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <View style={styles.detailValueRow}>
      <Text
        style={[
          styles.detailValue,
          !value && styles.detailValueEmpty,
        ]}
        numberOfLines={1}
      >
        {value || 'Not set'}
      </Text>
      {verified && (
        <View style={styles.verifiedBadge}>
          <Check size={10} color={color.bg} strokeWidth={3} />
        </View>
      )}
    </View>
  </View>
)

// ─── Tag Pill ─────────────────────────────────────────────────────────────────

const TagPill: React.FC<{ label: string }> = ({ label }) => (
  <View style={styles.tagPill}>
    <Text style={styles.tagPillText}>{label}</Text>
  </View>
)

// ─── Confirmation Screen ─────────────────────────────────────────────────────

export default function ConfirmationScreen() {
  const router = useRouter()
  const { roles, profile, kyc, reset, setSubmitting, setSubmitError, onboardingComplete } = useOnboardingStore()
  const { user } = useUser()
  const supabase = useClerkSupabase()
  const { setProfile } = useAuthStore()

  const role: UserRole = roles[0] || 'tenant'
  const isLandlord = role === 'landlord'
  const kycSubmitted = !!(kyc.frontImageUri && kyc.backImageUri)
  const billUploaded = !!kyc.electricityBillUri

  // Avatar initials fallback
  const initials = profile.fullName
    ? profile.fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?'

  const handleGoToApp = useCallback(async () => {
    if (!user) {
      const target = isLandlord ? '/(landlord)/(tabs)' : '/(tenant)/(tabs)'
      router.replace(target as any)
      return
    }

    const target = isLandlord ? '/(landlord)/(tabs)' : '/(tenant)/(tabs)'

    // ── If KYC was already submitted on the KYC screen, just navigate ──
    if (onboardingComplete) {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('clerk_id', user.id)
        .single()

      if (existingProfile) {
        setProfile(existingProfile as any)
      }

      reset()
      router.replace(target as any)
      return
    }

    // ── Tenant skipped KYC — complete onboarding now (profile only) ──
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
      kyc: null,
    })

    setSubmitting(false)

    // Debug: check DB state after onboarding (dev only)
    if (__DEV__) {
      const { debugOnboardingState } = await import('@/src/utils/debug')
      await debugOnboardingState(user.id, supabase)
    }

    if (!result.success) {
      setSubmitError(result.error)
      Alert.alert('Setup Failed', result.error, [
        { text: 'Try Again', onPress: handleGoToApp },
        { text: 'Continue Anyway', onPress: async () => {
          // Fallback: call RPC directly even if avatar upload failed
          if (user) {
            await supabase.rpc('complete_onboarding', {
              p_clerk_id: user.id,
              p_full_name: profile.fullName,
              p_city: profile.city,
              p_roles: roles,
              p_property_types: profile.preferences,
              p_has_landlord_role: roles.includes('landlord'),
              p_phone: user.phoneNumbers?.[0]?.phoneNumber ?? '',
              p_kyc_submission_id: undefined,
            })
          }
          reset()
          router.replace(target as any)
        }},
      ])
      return
    }

    // Refresh profile to trigger navigation
    const { data: updatedProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('clerk_id', user.id)
      .single()

    if (updatedProfile) {
      setProfile(updatedProfile as any)
    }

    reset()
    router.replace(target as any)
  }, [user, roles, profile, kyc, isLandlord, onboardingComplete, router, reset, setSubmitting, setSubmitError, setProfile])

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Top Section ───────────────────────────────────────────────── */}
        <View style={styles.topSection}>
          <SuccessCheckmark />

          <Text style={styles.greeting}>
            Welcome to BasoBas{','}
          </Text>
          <Text style={styles.userName} numberOfLines={1}>
            {profile.fullName || 'Explorer'}
          </Text>

          <Text style={styles.statusLine}>
            {isLandlord
              ? 'Your landlord account is set up and under review.'
              : kycSubmitted
                ? 'Your profile is set up and documents are under review.'
                : 'Your profile is ready. Start exploring!'}
          </Text>
        </View>

        {/* ── Profile Card ──────────────────────────────────────────────── */}
        <SummaryCard
          icon={<FileText size={18} color={color.ink} strokeWidth={1.8} />}
          title="Profile"
          delay={350}
        >
          <View style={styles.profileRow}>
            {/* Avatar circle */}
            {profile.avatarUri ? (
              <Image
                source={{ uri: profile.avatarUri }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
            )}

            <View style={styles.profileInfo}>
              <DetailRow
                label="Full name"
                value={profile.fullName || ''}
                verified={!!profile.fullName}
              />
              <DetailRow
                label="City"
                value={profile.city || ''}
                verified={!!profile.city}
              />
            </View>
          </View>

          <View style={styles.divider} />

          {/* Role */}
          <View style={styles.roleRow}>
            <View
              style={[
                styles.roleIconSlot,
                { backgroundColor: isLandlord ? color.brandLight : color.canvas },
              ]}
            >
              {isLandlord ? (
                <Home size={16} color={color.brand} strokeWidth={2} />
              ) : (
                <Search size={16} color={color.ink2} strokeWidth={2} />
              )}
            </View>
            <View style={styles.roleInfo}>
              <Text style={styles.roleLabel}>Account type</Text>
              <Text style={styles.roleValue}>
                {isLandlord ? 'Landlord' : 'Tenant'}
              </Text>
            </View>
            <Shield size={14} color={color.brand} strokeWidth={2} />
          </View>
        </SummaryCard>

        {/* ── Preferences Card ──────────────────────────────────────────── */}
        {profile.preferences.length > 0 && (
          <SummaryCard
            icon={<Sparkles size={18} color={color.ink} strokeWidth={1.8} />}
            title="Property Preferences"
            delay={500}
          >
            <View style={styles.tagsRow}>
              {profile.preferences.map((pref) => (
                <TagPill
                  key={pref}
                  label={
                    pref === 'ROOM'
                      ? 'Room'
                      : pref === 'APARTMENT'
                        ? 'Apartment'
                        : pref === 'HOUSE'
                          ? 'House'
                          : pref === 'OFFICE'
                            ? 'Office'
                            : 'Flat'
                  }
                />
              ))}
            </View>
          </SummaryCard>
        )}

        {/* ── KYC Status Card ───────────────────────────────────────────── */}
        {isLandlord ? (
          /* Landlord: always shows KYC + electricity bill */
          <SummaryCard
            icon={<Shield size={18} color={color.ink} strokeWidth={1.8} />}
            title="Verification"
            delay={650}
          >
            <DetailRow
              label="ID document"
              value={
                kyc.documentType === 'CITIZENSHIP'
                  ? 'Citizenship'
                  : kyc.documentType === 'NATIONAL_ID'
                    ? 'NID Card'
                    : ''
              }
              verified={!!kyc.documentType}
            />
            <View style={styles.docPreviewRow}>
              <View
                style={[
                  styles.docPreviewDot,
                  kyc.frontImageUri && styles.docPreviewDotActive,
                ]}
              />
              <Text
                style={[
                  styles.docPreviewLabel,
                  kyc.frontImageUri && styles.docPreviewLabelActive,
                ]}
              >
                Front side {kyc.frontImageUri ? '✓' : ''}
              </Text>
            </View>
            <View style={styles.docPreviewRow}>
              <View
                style={[
                  styles.docPreviewDot,
                  kyc.backImageUri && styles.docPreviewDotActive,
                ]}
              />
              <Text
                style={[
                  styles.docPreviewLabel,
                  kyc.backImageUri && styles.docPreviewLabelActive,
                ]}
              >
                Back side {kyc.backImageUri ? '✓' : ''}
              </Text>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            <DetailRow
              label="Electricity bill"
              value={billUploaded ? 'Uploaded' : 'Not uploaded'}
              verified={billUploaded}
            />
            <DetailRow
              label="Review status"
              value="Under review"
            />

            {/* Timeline note */}
            <View style={styles.timelineNote}>
              <Clock size={12} color={color.brand} strokeWidth={2} />
              <Text style={styles.timelineNoteText}>
                1–2 business days for verification
              </Text>
            </View>
          </SummaryCard>
        ) : kycSubmitted ? (
          /* Tenant: KYC submitted */
          <SummaryCard
            icon={<Shield size={18} color={color.ink} strokeWidth={1.8} />}
            title="Verification"
            delay={650}
          >
            <DetailRow
              label="ID document"
              value={kyc.documentType === 'CITIZENSHIP' ? 'Citizenship' : 'NID Card'}
              verified={!!kyc.documentType}
            />
            <DetailRow label="Review status" value="Under review" />
            <View style={styles.timelineNote}>
              <Zap size={12} color={color.brand} strokeWidth={2} />
              <Text style={styles.timelineNoteText}>
                Verified profiles get 3× faster approvals
              </Text>
            </View>
          </SummaryCard>
        ) : (
          /* Tenant: KYC skipped */
          <SummaryCard
            icon={<Shield size={18} color={color.ink3} strokeWidth={1.8} />}
            title="Verification"
            delay={650}
            accent
          >
            <Text style={styles.skippedText}>
              You skipped identity verification for now. You can complete it later
              from your profile settings.
            </Text>
          </SummaryCard>
        )}

        {/* ── Next Steps Card ───────────────────────────────────────────── */}
        <SummaryCard
          icon={<Lightbulb size={18} color={color.ink} strokeWidth={1.8} />}
          title="What's Next"
          delay={800}
        >
          {isLandlord ? (
            <>
              <View style={styles.nextStepRow}>
                <Text style={styles.nextStepNum}>1</Text>
                <Text style={styles.nextStepText}>
                  Wait for identity verification (1–2 days)
                </Text>
              </View>
              <View style={styles.nextStepRow}>
                <Text style={styles.nextStepNum}>2</Text>
                <Text style={styles.nextStepText}>
                  Set up your first property listing
                </Text>
              </View>
              <View style={styles.nextStepRow}>
                <Text style={styles.nextStepNum}>3</Text>
                <Text style={styles.nextStepText}>
                  Review and respond to tenant requests
                </Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.nextStepRow}>
                <Text style={styles.nextStepNum}>1</Text>
                <Text style={styles.nextStepText}>
                  Explore verified listings near you
                </Text>
              </View>
              <View style={styles.nextStepRow}>
                <Text style={styles.nextStepNum}>2</Text>
                <Text style={styles.nextStepText}>
                  Save favorites and compare properties
                </Text>
              </View>
              <View style={styles.nextStepRow}>
                <Text style={styles.nextStepNum}>3</Text>
                <Text style={styles.nextStepText}>
                  Schedule a visit and find your home
                </Text>
              </View>
            </>
          )}
        </SummaryCard>

        {/* ── CTA ───────────────────────────────────────────────────────── */}
        <Animated.View
          entering={FadeInDown.delay(1000).duration(500).springify()}
          style={styles.bottomArea}
        >
          <PrimaryButton
            label={isLandlord ? 'Go to Dashboard →' : 'Start Exploring →'}
            onPress={handleGoToApp}
          />
          <Text style={styles.footerNote}>
            {isLandlord
              ? 'You can browse the app while your verification is being reviewed.'
              : 'Browse rentals, save favorites, and book visits.'}
          </Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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

  // Top
  topSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  checkmarkOuter: {
    marginBottom: 16,
  },
  checkmarkInner: {
    width: 64,
    height: 64,
    borderRadius: 64,
    backgroundColor: color.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: {
    fontFamily: font.sans,
    fontSize: size.body,
    color: color.ink2,
    textAlign: 'center',
  },
  userName: {
    fontFamily: font.display,
    fontSize: 34,
    color: color.ink,
    lineHeight: 40,
    textAlign: 'center',
    marginBottom: 8,
  },
  statusLine: {
    fontFamily: font.sans,
    fontSize: size.bodySm,
    color: color.ink2,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: space.cardPad,
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
  summaryCardAccent: {
    borderColor: color.line,
    backgroundColor: color.canvas,
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
  summaryIconSlotAccent: {
    backgroundColor: color.bg,
  },
  summaryCardTitle: {
    fontFamily: font.semibold,
    fontSize: size.body,
    color: color.ink,
  },
  summaryCardTitleAccent: {
    color: color.ink2,
  },

  // Detail rows
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  detailLabel: {
    fontFamily: font.sans,
    fontSize: size.bodySm,
    color: color.ink2,
  },
  detailValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailValue: {
    fontFamily: font.medium,
    fontSize: size.bodySm,
    color: color.ink,
  },
  detailValueEmpty: {
    color: color.ink3,
    fontFamily: font.sans,
  },
  verifiedBadge: {
    width: 16,
    height: 16,
    borderRadius: 16,
    backgroundColor: color.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: color.divider,
    marginVertical: 4,
  },

  // Profile card specifics
  profileRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 48,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 48,
    backgroundColor: color.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontFamily: font.semibold,
    fontSize: size.h3,
    color: color.brand,
  },
  profileInfo: {
    flex: 1,
  },

  // Role row
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  roleIconSlot: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleInfo: {
    flex: 1,
  },
  roleLabel: {
    fontFamily: font.sans,
    fontSize: size.caption,
    color: color.ink2,
  },
  roleValue: {
    fontFamily: font.semibold,
    fontSize: size.bodySm,
    color: color.ink,
  },

  // Tags
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: color.ink,
  },
  tagPillText: {
    fontFamily: font.medium,
    fontSize: size.caption,
    color: color.bg,
  },

  // Doc preview
  docPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  docPreviewDot: {
    width: 8,
    height: 8,
    borderRadius: 8,
    backgroundColor: color.line,
  },
  docPreviewDotActive: {
    backgroundColor: color.brand,
  },
  docPreviewLabel: {
    fontFamily: font.sans,
    fontSize: size.caption,
    color: color.ink3,
  },
  docPreviewLabelActive: {
    color: color.ink2,
    fontFamily: font.medium,
  },

  // Timeline note
  timelineNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: color.brandLight,
    borderRadius: radius.sm,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginTop: 4,
  },
  timelineNoteText: {
    fontFamily: font.sans,
    fontSize: size.caption,
    color: color.brand,
    flex: 1,
  },

  // Skipped text
  skippedText: {
    fontFamily: font.sans,
    fontSize: size.bodySm,
    color: color.ink2,
    lineHeight: 18,
  },

  // Next steps
  nextStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  nextStepNum: {
    width: 24,
    height: 24,
    borderRadius: 24,
    backgroundColor: color.ink,
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: font.semibold,
    fontSize: size.caption,
    color: color.bg,
    overflow: 'hidden',
  },
  nextStepText: {
    flex: 1,
    fontFamily: font.sans,
    fontSize: size.bodySm,
    color: color.ink2,
    lineHeight: 18,
  },

  // CTA
  bottomArea: {
    marginTop: 12,
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
})
