import React from 'react'
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { ArrowLeft } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { tokens } from '@/src/theme/tokens'

const { color, space, font, size } = tokens

interface Props {
  showSkip?: boolean
  onSkip?: () => void
  skipLabel?: string
}

export const OnboardingHeader: React.FC<Props> = ({
  showSkip = false,
  onSkip,
  skipLabel = 'Skip',
}) => {
  const router = useRouter()

  const handleBack = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    router.back()
  }

  const handleSkip = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onSkip?.()
  }

  return (
    <View style={styles.container}>
      {/* Back arrow */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={handleBack}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        accessibilityLabel="Go back"
        accessibilityRole="button"
      >
        <ArrowLeft size={20} color={color.ink} strokeWidth={2.2} />
      </TouchableOpacity>

      {/* Spacer */}
      <View style={{ flex: 1 }} />

      {/* Skip */}
      {showSkip && (
        <TouchableOpacity
          onPress={handleSkip}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityLabel={skipLabel}
          accessibilityRole="button"
        >
          <Text style={styles.skipText}>{skipLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.screenH,
    paddingTop: 8,
    paddingBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 40,
    backgroundColor: color.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipText: {
    fontFamily: font.medium,
    fontSize: size.bodySm,
    color: color.ink2,
  },
})
