/**
 * EdumentX — Registration State Shim (Phase 1 placeholder)
 *
 * A tiny module-level store for the multi-step signup draft. The real
 * `store/registrationStore.ts` (Zustand + AsyncStorage persist) is built in
 * Phase 3 per `Documentation/06-Prompts/Claude-Code/00-MASTER-CLAUDE-CODE-PROMPT.md`
 * §7.5. Until then, this shim is enough to pass the role + draft fields
 * between PhoneEntry → OtpVerify → Password → RoleSelection → Profile* without
 * dropping data on navigation.
 *
 * Data shape is intentionally identical to the planned Phase 3 store so the
 * Phase 3 replacement is a one-file body swap.
 */

import { useSyncExternalStore } from "react";

export type Role = "student" | "tutor";

export type LocationValue = {
  neighborhood: string;
  city: string;
};

export type RegistrationState = {
  phone: string;
  countryCode: string;
  password: string;
  role: Role | null;
  profileDraft: {
    fullName: string;
    email: string;
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
    hourlyRateNpr: number;
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
    grade: null,
    subjects: [],
    location: null,
    phoneDisplay: "",
    headline: "",
    bio: "",
    gradesTeaching: [],
    yearsExperience: 0,
    hourlyRateNpr: 0,
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
 *   const phone = useRegistration((s) => s.phone);
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
