import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

/**
 * EdumentX — keyboard inset hook (edge-to-edge safe)
 *
 * Returns the current keyboard height in dp — `0` when the keyboard is
 * closed. Screens apply it as `paddingBottom` on the container that
 * must stay visible above the keyboard.
 *
 * WHY THIS EXISTS: the app runs edge-to-edge (`edgeToEdgeEnabled: true`
 * in app.json, enforced on Android 15 / targetSdk 35). Under
 * edge-to-edge, Android never resizes the window for the IME, so:
 *   - relying on the OS `adjustResize` does nothing, and
 *   - React Native's built-in `KeyboardAvoidingView` is unreliable on
 *     Android (a known SDK 53/54 regression under edge-to-edge +
 *     New Architecture).
 * The raw `keyboardDidShow` / `keyboardDidHide` events still fire with
 * correct coordinates in both situations, so measuring them directly is
 * the one avoidance mechanism that keeps working.
 */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    // iOS fires the `will` variants; Android only guarantees `did`.
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const show = Keyboard.addListener(showEvent, (e) => {
      setInset(e.endCoordinates?.height ?? 0);
    });
    const hide = Keyboard.addListener("keyboardDidHide", () => {
      setInset(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return inset;
}
