import { create } from 'zustand'
import type {
  UserRole,
  PropertyPreference,
  OnboardingProfileData,
  OnboardingKYCData,
  OnboardingPayload,
} from '@/src/types/onboarding.types'

interface OnboardingState {
  // Step 1
  roles: UserRole[]
  // Step 2
  profile: OnboardingProfileData
  // Step 3
  kyc: OnboardingKYCData
  // Submission
  isSubmitting: boolean
  submitError: string | null
  /** Set to true once the KYC screen successfully completes onboarding */
  onboardingComplete: boolean

  // Actions — Step 1
  setRole: (role: UserRole) => void
  setRoles: (roles: UserRole[]) => void

  // Actions — Step 2
  setAvatar: (uri: string | null) => void
  setFullName: (name: string) => void
  setCity: (city: string) => void
  togglePreference: (pref: PropertyPreference) => void

  // Actions — Step 3
  setFrontImage: (uri: string | null) => void
  setBackImage: (uri: string | null) => void
  setDocumentType: (type: 'CITIZENSHIP' | 'NATIONAL_ID' | null) => void
  setElectricityBill: (uri: string | null) => void
  setHomeTourVideo: (uri: string | null) => void

  // Computed
  getPayload: () => OnboardingPayload

  // Submission
  setSubmitting: (val: boolean) => void
  setSubmitError: (err: string | null) => void
  setOnboardingComplete: (val: boolean) => void

  // Reset (if user logs out mid-onboarding)
  reset: () => void
}

const initialProfile: OnboardingProfileData = {
  fullName: '',
  city: '',
  avatarUri: null,
  preferences: [],
}

const initialKYC: OnboardingKYCData = {
  documentType: null,
  frontImageUri: null,
  backImageUri: null,
  electricityBillUri: null,
  homeTourVideoUri: null,
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  roles: [],
  profile: initialProfile,
  kyc: initialKYC,
  isSubmitting: false,
  submitError: null,
  onboardingComplete: false,

  setRole: (role) => set({ roles: [role] }),

  setRoles: (roles) => set({ roles }),

  setAvatar: (uri) =>
    set((state) => ({ profile: { ...state.profile, avatarUri: uri } })),

  setFullName: (name) =>
    set((state) => ({ profile: { ...state.profile, fullName: name } })),

  setCity: (city) =>
    set((state) => ({ profile: { ...state.profile, city } })),

  togglePreference: (pref) =>
    set((state) => ({
      profile: {
        ...state.profile,
        preferences: state.profile.preferences.includes(pref)
          ? state.profile.preferences.filter((p) => p !== pref)
          : [...state.profile.preferences, pref],
      },
    })),

  setFrontImage: (uri) =>
    set((state) => ({ kyc: { ...state.kyc, frontImageUri: uri } })),

  setBackImage: (uri) =>
    set((state) => ({ kyc: { ...state.kyc, backImageUri: uri } })),

  setDocumentType: (type) =>
    set((state) => ({ kyc: { ...state.kyc, documentType: type } })),

  setElectricityBill: (uri) =>
    set((state) => ({ kyc: { ...state.kyc, electricityBillUri: uri } })),

  setHomeTourVideo: (uri) =>
    set((state) => ({ kyc: { ...state.kyc, homeTourVideoUri: uri } })),

  getPayload: (): OnboardingPayload => {
    const { roles, profile, kyc } = get()
    const kycData =
      kyc.frontImageUri && kyc.backImageUri ? kyc : null
    return { roles, profile, kyc: kycData }
  },

  setSubmitting: (val) => set({ isSubmitting: val }),
  setSubmitError: (err) => set({ submitError: err }),
  setOnboardingComplete: (val) => set({ onboardingComplete: val }),

  reset: () =>
    set({
      roles: [],
      profile: initialProfile,
      kyc: initialKYC,
      onboardingComplete: false,
    }),
}))
