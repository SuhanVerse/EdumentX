import { create } from 'zustand';
import { useRouter } from 'expo-router';
import { useUserStore } from '@/src/store/userStore';

/**
 * Global state for the Pro-gate modal.
 *
 * The modal itself is rendered as an Expo Router modal screen (`/(tenant)/_modal/pro-gate`)
 * mounted in the tenant root layout. This store is the in-memory channel between
 * any tenant surface that wants to gate a feature and that screen.
 *
 * Why a separate store (not userStore):
 *  - The modal is presentation-only — its visibility is ephemeral UI state, not user data.
 *  - Avoids polluting the user store with cross-cutting concerns.
 */

interface ProGateState {
  visible: boolean;
  open: () => void;
  close: () => void;
}

export const useProGateStore = create<ProGateState>((set) => ({
  visible: false,
  open: () => set({ visible: true }),
  close: () => set({ visible: false }),
}));

/**
 * `useProGate` — the single hook any Pro-locked surface should use.
 *
 * Returns:
 *  - `isPro`: whether the current user has an active Pro subscription.
 *  - `requireProOrModal(action)`: runs `action()` if the user is Pro,
 *      otherwise opens the gate modal and skips the action. Returns the
 *      boolean the caller might want for chaining.
 *
 * Usage:
 *   const { isPro, requireProOrModal } = useProGate();
 *   <MenuRow onPress={() => requireProOrModal(() => router.push('/...'))} />
 */
export const useProGate = () => {
  const router = useRouter();
  const isPro = useUserStore((s) => s.profile.pro.active);
  const open = useProGateStore((s) => s.open);

  const requireProOrModal = <T,>(action: () => T): boolean => {
    if (isPro) {
      action();
      return true;
    }
    open();
    // Navigate to the Pro gate modal screen so the user can upgrade.
    router.push('/(tenant)/_modal/pro-gate' as any);
    return false;
  };

  return { isPro, requireProOrModal };
};
