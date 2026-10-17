import { create } from 'zustand';

/**
 * App readiness signals — what the splash loader actually waits on before
 * handing off to the auth flow. `fontsReady` flips when the DM Sans /
 * DM Serif faces finish loading in the root layout; `clerkReady` flips
 * when Clerk's session has loaded (AuthGate). The splash keeps its loader
 * running until both are true, so the loading UI is never ahead of the
 * app's real state.
 */
interface AppReadyState {
  fontsReady: boolean;
  clerkReady: boolean;
  setFontsReady: (ready: boolean) => void;
  setClerkReady: (ready: boolean) => void;
}

export const useAppReadyStore = create<AppReadyState>((set) => ({
  fontsReady: false,
  clerkReady: false,
  setFontsReady: (fontsReady) => set({ fontsReady }),
  setClerkReady: (clerkReady) => set({ clerkReady }),
}));
