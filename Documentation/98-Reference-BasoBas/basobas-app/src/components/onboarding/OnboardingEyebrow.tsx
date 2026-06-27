import React from 'react'
import { Text, StyleSheet } from 'react-native'
import { tokens } from '@/src/theme/tokens'

const { color, space, font, size } = tokens

interface Props {
  text: string
}

export const OnboardingEyebrow: React.FC<Props> = ({ text }) => (
  <Text style={styles.text}>{text}</Text>
)

const styles = StyleSheet.create({
  text: {
    fontFamily: font.semibold,
    fontSize: size.label,
    color: color.brand,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
})
