import React, { useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Search, Home, Check } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'

import { OnboardingHeader } from '@/src/components/onboarding/OnboardingHeader'
import { StepProgressBar } from '@/src/components/onboarding/StepProgressBar'
import { OnboardingEyebrow } from '@/src/components/onboarding/OnboardingEyebrow'
import { PrimaryButton } from '@/src/components/shared/PrimaryButton'
import { useOnboardingStore } from '@/src/store/onboardingStore'
import { tokens } from '@/src/theme/tokens'
import type { UserRole } from '@/src/types/onboarding.types'

const { color, space, radius, font, size, shadow } = tokens

// ─── Role card data ───────────────────────────────────────────────────────────

const ROLES: {
  id: UserRole
  Icon: React.FC<{ size?: number; color?: string; strokeWidth?: number }>
  title: string
  description: string
}[] = [
  {
    id: 'tenant',
    Icon: Search,
    title: "I'm Looking to Rent",
    description:
      'Browse listings, schedule visits, find your next home.',
  },
  {
    id: 'landlord',
    Icon: Home,
    title: 'I Have a Property to List',
    description:
      'List your space, manage visit requests, find tenants.',
  },
]

// ─── Role Card Component ──────────────────────────────────────────────────────

interface RoleCardProps {
  role: (typeof ROLES)[0]
  selected: boolean
  onPress: () => void
}

const RoleCard: React.FC<RoleCardProps> = ({ role, selected, onPress }) => {
  const Icon = role.Icon

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onPress()
  }

  return (
    <TouchableOpacity
      style={[styles.card, selected && styles.cardSelected]}
      onPress={handlePress}
      activeOpacity={0.8}
      accessibilityRole="radio"
      accessibilityLabel={role.title}
      accessibilityState={{ selected }}
    >
      {/* Icon container */}
      <View
        style={[
          styles.iconContainer,
          selected && styles.iconContainerSelected,
        ]}
      >
        <Icon
          size={22}
          color={selected ? color.bg : color.ink2}
          strokeWidth={1.8}
        />
      </View>

      {/* Text block */}
      <View style={styles.cardText}>
        <Text
          style={[
            styles.cardTitle,
            selected && styles.cardTitleSelected,
          ]}
        >
          {role.title}
        </Text>
        <Text style={styles.cardDescription}>{role.description}</Text>
      </View>

      {/* Selection indicator */}
      <View
        style={[
          styles.selectionIndicator,
          selected && styles.selectionIndicatorSelected,
        ]}
      >
        {selected && (
          <Check size={14} color={color.bg} strokeWidth={3} />
        )}
      </View>
    </TouchableOpacity>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function RoleSelectionScreen() {
  const router = useRouter()
  const { roles, setRole } = useOnboardingStore()

  const selectedRole = roles.length > 0 ? roles[0] : null
  const canContinue = !!selectedRole

  const handleContinue = useCallback(() => {
    if (!canContinue) return
    router.push('/(auth)/profile-setup')
  }, [canContinue, router])

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Header — back arrow only, no skip */}
      <OnboardingHeader />

      {/* Progress */}
      <StepProgressBar currentStep={1} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Eyebrow */}
        <OnboardingEyebrow text="Step 1 · Choose Your Role" />

        {/* Headline */}
        <Text style={styles.headline}>
          How will you use{'\n'}BasoBas?
        </Text>

        {/* Body */}
        <Text style={styles.body}>
          Your role shapes your experience.{'\n'}
          You can switch this later from your profile.
        </Text>

        {/* Role cards */}
        <View style={styles.cardsWrapper}>
          {ROLES.map((role) => (
            <RoleCard
              key={role.id}
              role={role}
              selected={selectedRole === role.id}
              onPress={() => setRole(role.id)}
            />
          ))}
        </View>

        {/* Validation message */}
        {!selectedRole && (
          <Text style={styles.validationText}>
            Please select a role to continue
          </Text>
        )}
      </ScrollView>

      {/* CTA */}
      <PrimaryButton
        label="Continue to Profile Setup →"
        onPress={handleContinue}
        disabled={!canContinue}
        style={styles.cta}
      />
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
    paddingTop: space.cardPad,
    paddingBottom: 32,
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
    fontSize: size.body,
    color: color.ink2,
    lineHeight: 22,
    marginBottom: 32,
  },
  cardsWrapper: {
    gap: 12,
    marginBottom: space.cardPad,
  },

  // Role card
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: space.cardPad,
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderColor: color.line,
    backgroundColor: color.bg,
    gap: 12,
    ...shadow.card,
  },
  cardSelected: {
    borderColor: color.ink,
    borderWidth: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: color.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerSelected: {
    backgroundColor: color.ink,
  },
  cardText: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontFamily: font.semibold,
    fontSize: size.h3,
    color: color.ink,
  },
  cardTitleSelected: {
    color: color.ink,
  },
  cardDescription: {
    fontFamily: font.sans,
    fontSize: size.bodySm,
    color: color.ink2,
    lineHeight: 18,
  },
  selectionIndicator: {
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: color.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionIndicatorSelected: {
    backgroundColor: color.ink,
    borderColor: color.ink,
  },

  validationText: {
    fontFamily: font.sans,
    fontSize: size.caption,
    color: color.danger,
    textAlign: 'center',
    marginTop: 4,
  },

  cta: {
    marginBottom: space.cardPad,
  },
})
