import { useSharedValue, type SharedValue } from 'react-native-reanimated';

/**
 * Minimal dock animation state.
 *
 * Individual tab animations (scale, circle spring) live inside `DockTab`
 * so each tab manages its own isolated shared values. This hook is kept as
 * a lightweight, stable export so future cross-tab coordination logic
 * (e.g. a shared indicator that slides between tabs) can be added here
 * without changing call sites.
 */
export interface DockAnimationState {
  /**
   * A shared value that ticks upward on every tab change. Consumers can
   * derive per-tab animations from this if needed. Currently unused by
   * `DockTab`, which handles its own lifecycle independently.
   */
  tabChangeTick: SharedValue<number>;
}

export function useDockState(activeKey: string): DockAnimationState {
  const tabChangeTick = useSharedValue(0);

  // Increment the tick on every active key change so derived animations
  // can react without knowing the key value.
  // NOTE: This runs on the JS thread and is intentionally lightweight.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  tabChangeTick.value += 1;

  return { tabChangeTick };
}
