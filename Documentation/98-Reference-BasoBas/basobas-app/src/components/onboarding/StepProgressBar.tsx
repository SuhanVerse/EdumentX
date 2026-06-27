import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Animated, {
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated'
import { tokens } from '@/src/theme/tokens'

const { color, space, font, size } = tokens

interface Props {
  currentStep: 1 | 2 | 3
  totalSteps?: number
}

export const StepProgressBar: React.FC<Props> = ({
  currentStep,
  totalSteps = 3,
}) => {
  const percent = (currentStep / totalSteps) * 100

  const animatedFill = useAnimatedStyle(() => ({
    width: withTiming(`${percent}%`, {
      duration: 500,
      easing: Easing.out(Easing.cubic),
    }),
  }))

  return (
    <View style={styles.wrapper}>
      {/* Step label right-aligned */}
      <Text style={styles.stepLabel}>
        {currentStep} of {totalSteps}
      </Text>

      {/* Progress bar track */}
      <View style={styles.track}>
        <Animated.View style={[styles.fill, animatedFill]} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: space.screenH,
    paddingTop: 4,
    paddingBottom: space.cardPad,
    gap: 4,
  },
  stepLabel: {
    fontFamily: font.sans,
    fontSize: size.caption,
    color: color.ink3,
    textAlign: 'right',
  },
  track: {
    height: 3,
    borderRadius: 999,
    backgroundColor: color.line,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: color.ink,
  },
})
