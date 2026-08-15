/**
 * EdumentX — Registration State Shim (Phase 1 placeholder)
 *
 * A tiny module-level store for the multi-step signup draft. The real
 * `store/registrationStore.ts` (Zustand + AsyncStorage persist) is
 * built in Phase 4 per
 * `Documentation/06-Prompts/Claude-Code/00-MASTER-CLAUDE-CODE-PROMPT.md`
 * §7.5. Until then, this shim is enough to pass the draft fields
 * between StudentProfileScreen / TutorProfileScreen and any future
 * "Edit profile" screen without dropping data on navigation.
 *
 * Data shape is intentionally identical to the planned Phase 4 store
 * so the Phase 4 replacement is a one-file body swap.
 *
 * **Auth model (June 21, 2026):** identity lives in Firebase Auth via
 * Email + Password or Google Sign-In. Phone OTP was removed — Clerk
 * and SMS providers are not in use. The `phone` field here is for the
 * optional contact number parents can use to reach a tutor from inside
 * the app; it is NOT used for sign-in.
 */

export type Role = "student" | "tutor";

export type LocationValue = {
  neighborhood: string;
  city: string;
  /** GPS pin snapped by the location picker / "Locate Me" (Phase 5.2).
   *  Persisted with the profile so the tutor map can plot real pins.
   *  `undefined` for profiles saved before the GPS flow existed. */
  coordinates?: { latitude: number; longitude: number };
};

export type RegistrationState = {
  role: Role | null;
  profileDraft: {
    fullName: string;
    email: string;
    /** Custom username for marketplace display (3–30 chars,
     *  letters/digits/_/.). NOT used as a login credential — the user
     *  always signs in with their email. */
    username: string;
    /** Optional contact phone (digits-only). Parents can request a
     *  call from inside the app via this number; no SMS verification. */
    phone: string;
    // student-only
    grade: string | null;
    // both, multi-select
    subjects: string[];
    // both, location
    location: LocationValue | null;
    // tutor-only
    phoneDisplay: string;
    headline: string;
    bio: string;
    gradesTeaching: string[];
    yearsExperience: number;
    /** Tutor's monthly rate in NPR. NOT hourly — the marketplace
     *  presents tutor pricing as a flat monthly figure so parents can
     *  budget without doing arithmetic. */
    monthlyRateNpr: number;
    // tutor credentials (degree + institution)
    degree: string;
    institution: string;
    // Gender (Male / Female / Other — collected during tutor onboarding)
    gender: "male" | "female" | "other" | null;
  };
};

const initialState: RegistrationState = {
  role: null,
  profileDraft: {
    fullName: "",
    email: "",
    username: "",
    phone: "",
    grade: null,
    subjects: [],
    location: null,
    phoneDisplay: "",
    headline: "",
    bio: "",
    gradesTeaching: [],
    yearsExperience: 0,
    monthlyRateNpr: 0,
    degree: "",
    institution: "",
    gender: null,
  },
};

let state: RegistrationState = initialState;

/**
 * Patch a subset of the profile draft fields. Called by the profile
 * screens before their Firestore `writeBatch` so the in-flight
 * navigation can read the freshly-typed values without waiting for
 * the round-trip to complete.
 *
 * The only currently-used method on this object — `registration.reset`
 * and the rest of the planned Phase 4 surface land with the real
 * Zustand+AsyncStorage store.
 */
function updateProfile(patch: Partial<RegistrationState["profileDraft"]>) {
  state = { ...state, profileDraft: { ...state.profileDraft, ...patch } };
}

export const registration = {
  updateProfile,
};