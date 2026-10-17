export type UserRole = 'tenant' | 'landlord'

export type DocumentType = 'CITIZENSHIP' | 'NATIONAL_ID'

export type PropertyPreference =
  | 'ROOM'
  | 'APARTMENT'
  | 'HOUSE'
  | 'OFFICE'
  | 'FLAT'

export interface OnboardingProfileData {
  fullName: string
  city: string
  avatarUri: string | null
  preferences: PropertyPreference[]
}

export interface OnboardingKYCData {
  documentType: DocumentType | null
  frontImageUri: string | null
  backImageUri: string | null
  electricityBillUri: string | null
  /** Landlord-only optional home-tour walkthrough video. */
  homeTourVideoUri: string | null
}

// Shape that goes to the backend after onboarding
export interface OnboardingPayload {
  roles: UserRole[]
  profile: OnboardingProfileData
  kyc: OnboardingKYCData | null // null if tenant skipped
}
