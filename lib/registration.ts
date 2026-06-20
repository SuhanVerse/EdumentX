/**
 * EdumentX — Registration State Shim (Phase 1 placeholder)
 *
 * A tiny module-level store for the multi-step signup draft. The real
 * `store/registrationStore.ts` (Zustand + AsyncStorage persist) is built in
 * Phase 4 per `Documentation/06-Prompts/Claude-Code/00-MASTER-CLAUDE-CODE-PROMPT.md`
 * §7.5. Until then, this shim is enough to pass the role + draft fields
 * between PhoneEntry → OtpVerify → RoleSelection → Profile* without
 * dropping data on navigation.
 *
 * Data shape is intentionally identical to the planned Phase 3 store so the
 * Phase 3 replacement is a one-file body swap.
 *
 * **Post-Clerk pivot (June 20, 2026):** phone and password are no longer
 * part of the auth flow (Clerk handles sign-in via Email OTP and Google
 * OAuth). The `countryCode` and `password` fields are kept here as
 * type-level placeholders so the Phase 4 swap-in doesn't need to change
 * the public surface; they stay empty in practice.
 */

import { useSyncExternalStore } from "react";

export type Role = "student" | "tutor";

export type LocationValue = {
  neighborhood: string;
  city: string;
};

export type RegistrationState = {
  // Kept as type-level placeholders for Phase-4 compatibility. Always
  // empty in practice after the Clerk pivot.
  phone: string;
  countryCode: string;
  password: string;
  role: Role | null;
  profileDraft: {
    fullName: string;
    email: string;
    /** Custom username collected on the profile screens (Clerk's
     *  username requirement is OFF in the dashboard, so this lives in
     *  Firestore only). */
    username: string;
    /** Unverified phone number for parent-initiated contact (no SMS
     *  OTP — Clerk doesn't enable phone provider on the free tier). */
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
    monthlyRateNpr: number;
  };
};

const initialState: RegistrationState = {
  phone: "",
  countryCode: "+977",
  password: "",
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
  },
};

let state: RegistrationState = initialState;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function set(next: RegistrationState) {
  state = next;
  emit();
}

function update(patch: Partial<RegistrationState>) {
  set({ ...state, ...patch });
}

function updateProfile(patch: Partial<RegistrationState["profileDraft"]>) {
  set({ ...state, profileDraft: { ...state.profileDraft, ...patch } });
}

function reset() {
  set({ ...initialState, profileDraft: { ...initialState.profileDraft } });
}

function get(): RegistrationState {
  return state;
}

/**
 * Subscribe to a slice of the registration state. Re-renders the component
 * when the selected value changes (shallow equality). Backed by
 * useSyncExternalStore so concurrent React (React 19) is happy.
 *
 * Usage:
 *   const phone = useRegistration((s) => s.profileDraft.phone);
 *   const { fullName, email } = useRegistration((s) => s.profileDraft);
 */
export function useRegistration<T>(selector: (s: RegistrationState) => T): T {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => selector(state),
    () => selector(initialState),
  );
}

export const registration = {
  get,
  set,
  update,
  updateProfile,
  reset,
};
