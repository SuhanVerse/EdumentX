/**
 * EdumentX registration draft.
 *
 * This is a module-local, in-memory draft helper, not a persisted
 * Zustand registration store. It currently exposes updateProfile.
 * See Documentation/00-Overview/CODEBASE_AND_LEARNING_GUIDE.md
 * for the actual onboarding and profile-write flow.
 *
 * Identity uses native Firebase Auth (email/password or Google).
 * Phone is a profile contact field, not an SMS/login credential.
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