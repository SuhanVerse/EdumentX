import React from 'react'
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import { tokens } from '@/src/theme/tokens'

const { color, space, font, size, radius } = tokens

interface Props {
  label: string
  onPress: () => void
  disabled?: boolean
  loading?: boolean
  style?: ViewStyle
}

export const PrimaryButton: React.FC<Props> = ({
  label,
  onPress,
  disabled = false,
  loading = false,
  style,
}) => {
  const handlePress = async () => {
    if (disabled || loading) return
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    onPress()
  }

  return (
    <TouchableOpacity
      style={[
        styles.button,
        (disabled || loading) && styles.disabled,
        style,
      ]}
      onPress={handlePress}
      activeOpacity={0.85}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading }}
    >
      {loading ? (
        <ActivityIndicator color={color.bg} size="small" />
      ) : (
        <Text style={styles.label}>{label}</Text>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    height: space.buttonH,
    backgroundColor: color.ink,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: space.screenH,
  },
  disabled: {
    backgroundColor: color.canvas,
  },
  label: {
    fontFamily: font.semibold,
    fontSize: size.body,
    color: color.bg,
  },
})
