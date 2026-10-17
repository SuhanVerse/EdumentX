import React, { useCallback, useRef, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  Alert,
  Keyboard,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Camera, ChevronDown, Check } from 'lucide-react-native'
import * as ImagePicker from 'expo-image-picker'
import * as ImageManipulator from 'expo-image-manipulator'
import * as Haptics from 'expo-haptics'
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet'
import { useController, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { OnboardingHeader } from '@/src/components/onboarding/OnboardingHeader'
import { StepProgressBar } from '@/src/components/onboarding/StepProgressBar'
import { OnboardingEyebrow } from '@/src/components/onboarding/OnboardingEyebrow'
import { PrimaryButton } from '@/src/components/shared/PrimaryButton'
import { useOnboardingStore } from '@/src/store/onboardingStore'
import { useClerkSupabase } from '@/src/hooks/useClerkSupabase'
import { validateImageAsset } from '@/src/lib/imageValidation'
import { validateImageContent } from '@/src/services/imageValidation.service'
import { tokens } from '@/src/theme/tokens'
import type { PropertyPreference } from '@/src/types/onboarding.types'

const { color, space, radius, font, size } = tokens

// ─── Constants ────────────────────────────────────────────────────────────────

const NEPAL_CITIES = [
  'Kathmandu', 'Lalitpur', 'Bhaktapur', 'Pokhara',
  'Biratnagar', 'Birgunj', 'Butwal', 'Dharan',
  'Hetauda', 'Itahari', 'Janakpur', 'Nepalgunj',
  'Dhangadhi', 'Bharatpur', 'Siddharthanagar',
] as const

const PREFERENCES: { id: PropertyPreference; label: string }[] = [
  { id: 'ROOM', label: 'Room' },
  { id: 'APARTMENT', label: 'Apartment' },
  { id: 'HOUSE', label: 'House' },
  { id: 'OFFICE', label: 'Office' },
  { id: 'FLAT', label: 'Flat' },
]

// ─── Validation ───────────────────────────────────────────────────────────────

const profileSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  city: z.string().min(1, 'Please select your city'),
})
type ProfileFormValues = z.infer<typeof profileSchema>

// ─── Avatar Picker ────────────────────────────────────────────────────────────

const compressImage = async (uri: string): Promise<string> => {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 400, height: 400 } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
  )
  return result.uri
}

const useAvatarPicker = () => {
  const { setAvatar, profile } = useOnboardingStore()
  const supabase = useClerkSupabase()
  const [isValidating, setIsValidating] = useState(false)

  // Technical checks → compress → AI face gate → store. Runs at pick time
  // so the user gets instant feedback before anything is saved.
  const processAsset = async (
    asset: ImagePicker.ImagePickerAsset,
  ): Promise<void> => {
    const check = validateImageAsset(asset, 'avatar')
    if (!check.ok) {
      Alert.alert('Invalid photo', check.message)
      return
    }
    try {
      setIsValidating(true)
      const compressed = await compressImage(asset.uri)
      const verdict = await validateImageContent(compressed, 'avatar', supabase)
      if (!verdict.success || !verdict.data.valid) {
        Alert.alert(
          'Photo not suitable',
          verdict.success ? verdict.data.reason ?? '' : '',
        )
        return
      }
      setAvatar(compressed)
    } catch {
      Alert.alert('Image error', 'Could not process the selected image.')
    } finally {
      setIsValidating(false)
    }
  }

  const pickFromGallery = async () => {
    if (isValidating) return
    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      Alert.alert(
        'Permission Required',
        'Please allow photo library access in your settings to set a profile photo.'
      )
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    })
    if (!result.canceled && result.assets[0]) {
      await processAsset(result.assets[0])
    }
  }

  const pickFromCamera = async () => {
    if (isValidating) return
    const permission = await ImagePicker.requestCameraPermissionsAsync()
    if (!permission.granted) {
      Alert.alert(
        'Permission Required',
        'Please allow camera access in your settings to take a profile photo.'
      )
      return
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    })
    if (!result.canceled && result.assets[0]) {
      await processAsset(result.assets[0])
    }
  }

  const showOptions = () => {
    if (isValidating) return
    Alert.alert('Profile Photo', 'Choose an option', [
      { text: 'Take Photo', onPress: pickFromCamera },
      { text: 'Choose from Library', onPress: pickFromGallery },
      ...(profile.avatarUri
        ? [{ text: 'Remove Photo', style: 'destructive' as const, onPress: () => setAvatar(null) }]
        : []),
      { text: 'Cancel', style: 'cancel' },
    ])
  }

  return { showOptions, avatarUri: profile.avatarUri, isValidating }
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ProfileSetupScreen() {
  const router = useRouter()

  const {
    profile,
    setFullName,
    setCity,
    togglePreference,
  } = useOnboardingStore()

  const { roles } = useOnboardingStore.getState()
  const isLandlord = roles.includes('landlord')

  const { showOptions, avatarUri, isValidating } = useAvatarPicker()
  const citySheetRef = useRef<BottomSheet>(null)

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: profile.fullName,
      city: profile.city,
    },
    mode: 'onChange',
  })

  const { field: nameField } = useController({
    control,
    name: 'fullName',
  })

  const handleCitySelect = useCallback(
    async (city: string) => {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      setCity(city)
      setValue('city', city, { shouldValidate: true })
      citySheetRef.current?.close()
    },
    [setCity, setValue]
  )

  const openCitySheet = () => {
    Keyboard.dismiss()
    citySheetRef.current?.expand()
  }

  const onSubmit = (values: ProfileFormValues) => {
    setFullName(values.fullName)
    setCity(values.city)

    if (isLandlord) {
      router.push('/(auth)/kyc-landlord')
    } else {
      router.push('/(auth)/kyc-tenant')
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <OnboardingHeader />
      <StepProgressBar currentStep={2} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <OnboardingEyebrow text="Step 2 · Your Profile" />

        <Text style={styles.headline}>Tell us about{'\n'}yourself</Text>

        {/* Role-specific subtitle */}
        <Text style={styles.body}>
          {isLandlord
            ? 'Set up your profile so tenants can see who you are\nbefore they request a visit.'
            : 'This helps landlords know who you are before\napproving your visit requests.'}
        </Text>

        {/* Avatar Picker */}
        <TouchableOpacity
          style={styles.avatarWrapper}
          onPress={showOptions}
          disabled={isValidating}
          accessibilityLabel="Add profile photo"
          accessibilityRole="button"
        >
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Camera size={24} color={color.ink3} strokeWidth={1.5} />
              <Text style={styles.avatarLabel}>Add photo</Text>
            </View>
          )}
          {isValidating && (
            <View style={styles.avatarCheckingOverlay} pointerEvents="none">
              <ActivityIndicator color={color.bg} />
            </View>
          )}
        </TouchableOpacity>

        {/* Full Name */}
        <View style={styles.fieldWrapper}>
          <Text style={styles.fieldLabel}>
            Full name <Text style={styles.required}>*</Text>
          </Text>
          <View
            style={[
              styles.inputContainer,
              errors.fullName && styles.inputError,
            ]}
          >
            <TextInput
              style={styles.input}
              placeholder="Your full name"
              placeholderTextColor={color.placeholder}
              value={nameField.value}
              onChangeText={(text) => {
                nameField.onChange(text)
                setFullName(text)
              }}
              returnKeyType="done"
              autoCapitalize="words"
              autoCorrect={false}
              accessibilityLabel="Full name"
            />
            {nameField.value.length >= 2 && !errors.fullName && (
              <Check
                size={16}
                color={color.brand}
                strokeWidth={2.5}
              />
            )}
          </View>
          {errors.fullName && (
            <Text style={styles.errorText}>{errors.fullName.message}</Text>
          )}
        </View>

        {/* City Picker */}
        <View style={styles.fieldWrapper}>
          <Text style={styles.fieldLabel}>
            Your city <Text style={styles.required}>*</Text>
          </Text>
          <TouchableOpacity
            style={[
              styles.inputContainer,
              styles.inputTouchable,
              errors.city && styles.inputError,
            ]}
            onPress={openCitySheet}
            accessibilityLabel="Select your city"
            accessibilityRole="button"
          >
            <Text
              style={[
                styles.input,
                !profile.city && styles.inputPlaceholder,
              ]}
            >
              {profile.city || 'Select your city'}
            </Text>
            <ChevronDown
              size={16}
              color={color.ink2}
              strokeWidth={2}
            />
          </TouchableOpacity>
          {errors.city && (
            <Text style={styles.errorText}>{errors.city.message}</Text>
          )}
        </View>

        {/* Preferences */}
        <View style={styles.preferencesSection}>
          <Text style={styles.preferencesLabel}>
            QUICK PREFERENCES (OPTIONAL)
          </Text>
          <View style={styles.chips}>
            {PREFERENCES.map((pref) => {
              const active = profile.preferences.includes(pref.id)
              return (
                <TouchableOpacity
                  key={pref.id}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={async () => {
                    await Haptics.impactAsync(
                      Haptics.ImpactFeedbackStyle.Light
                    )
                    togglePreference(pref.id)
                  }}
                  accessibilityRole="checkbox"
                  accessibilityLabel={pref.label}
                  accessibilityState={{ checked: active }}
                >
                  <Text
                    style={[
                      styles.chipText,
                      active && styles.chipTextActive,
                    ]}
                  >
                    {pref.label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>
      </ScrollView>

      {/* CTA */}
      <View style={styles.bottomArea}>
        <PrimaryButton
          label="Continue →"
          onPress={handleSubmit(onSubmit)}
        />
        <Text style={styles.stepNote}>Step 2 of 3  ·  Almost there</Text>
      </View>

      {/* City Bottom Sheet */}
      <BottomSheet
        ref={citySheetRef}
        index={-1}
        snapPoints={['60%']}
        enablePanDownToClose
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.sheetHandle}
      >
        <Text style={styles.sheetTitle}>Select Your City</Text>
        <BottomSheetScrollView contentContainerStyle={styles.sheetContent}>
          {NEPAL_CITIES.map((city) => (
            <TouchableOpacity
              key={city}
              style={[
                styles.cityRow,
                profile.city === city && styles.cityRowActive,
              ]}
              onPress={() => handleCitySelect(city)}
              accessibilityRole="menuitem"
              accessibilityLabel={city}
            >
              <Text
                style={[
                  styles.cityText,
                  profile.city === city && styles.cityTextActive,
                ]}
              >
                {city}
              </Text>
              {profile.city === city && (
                <Check size={16} color={color.brand} strokeWidth={2.5} />
              )}
            </TouchableOpacity>
          ))}
        </BottomSheetScrollView>
      </BottomSheet>
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: color.bg },
  scroll: { flex: 1 },
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
    fontSize: size.bodySm,
    color: color.ink2,
    lineHeight: 20,
    marginBottom: 32,
  },

  // Avatar
  avatarWrapper: {
    alignSelf: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 999,
  },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 999,
    backgroundColor: color.canvas,
    borderWidth: 1.5,
    borderColor: color.line,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  avatarCheckingOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLabel: {
    fontFamily: font.sans,
    fontSize: size.caption,
    color: color.ink3,
  },

  // Fields
  fieldWrapper: { marginBottom: space.cardPad },
  fieldLabel: {
    fontFamily: font.medium,
    fontSize: size.caption,
    color: color.ink2,
    marginBottom: 4,
  },
  required: { color: color.danger },
  inputContainer: {
    height: space.inputH,
    borderRadius: radius.card,
    backgroundColor: color.input,
    borderWidth: 1.5,
    borderColor: color.line,
    paddingHorizontal: space.cardPad,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputTouchable: { justifyContent: 'space-between' },
  inputError: { borderColor: color.danger },
  input: {
    flex: 1,
    fontFamily: font.sans,
    fontSize: size.body,
    color: color.ink,
  },
  inputPlaceholder: { color: color.placeholder },
  errorText: {
    fontFamily: font.sans,
    fontSize: size.caption,
    color: color.danger,
    marginTop: 4,
  },

  // Preferences
  preferencesSection: { marginTop: 4 },
  preferencesLabel: {
    fontFamily: font.semibold,
    fontSize: size.label,
    color: color.ink3,
    letterSpacing: 1,
    marginBottom: 12,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    height: 38,
    paddingHorizontal: space.cardPad,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: color.line,
    backgroundColor: color.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: color.ink,
    borderColor: color.ink,
  },
  chipText: {
    fontFamily: font.medium,
    fontSize: size.bodySm,
    color: color.ink2,
  },
  chipTextActive: { color: color.bg },

  // Bottom
  bottomArea: {
    paddingBottom: space.cardPad,
    gap: 8,
  },
  stepNote: {
    fontFamily: font.sans,
    fontSize: size.caption,
    color: color.ink3,
    textAlign: 'center',
  },

  // Bottom sheet
  sheetBackground: { backgroundColor: color.bg },
  sheetHandle: { backgroundColor: color.line, width: 40 },
  sheetTitle: {
    fontFamily: font.semibold,
    fontSize: size.h3,
    color: color.ink,
    paddingHorizontal: space.screenH,
    paddingVertical: space.cardPad,
  },
  sheetContent: { paddingBottom: 40 },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.screenH,
    paddingVertical: space.cardPad,
    borderBottomWidth: 1,
    borderBottomColor: color.line,
  },
  cityRowActive: { backgroundColor: color.brandLight },
  cityText: {
    fontFamily: font.sans,
    fontSize: size.body,
    color: color.ink,
  },
  cityTextActive: {
    fontFamily: font.semibold,
    color: color.brand,
  },
})
