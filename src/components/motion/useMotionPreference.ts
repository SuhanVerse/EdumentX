import { useSyncExternalStore } from "react";
import { AccessibilityInfo } from "react-native";

// Start still until the asynchronous native preference is known. All motion
// consumers share one listener, including when a setting changes in-app.
let reducedMotion = true;
const listeners = new Set<() => void>();
let subscription: ReturnType<typeof AccessibilityInfo.addEventListener> | null = null;
let generation = 0;

function publish(value: boolean) {
  if (reducedMotion === value) return;
  reducedMotion = value;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!subscription) {
    const currentGeneration = ++generation;
    let receivedEvent = false;
    subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", (value) => {
      if (generation !== currentGeneration) return;
      receivedEvent = true;
      publish(value);
    });
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      // A late initial read must not overwrite a newer accessibility event.
      if (generation === currentGeneration && !receivedEvent) publish(value);
    }).catch(() => {
      // Keep the last known preference if the native read is unavailable.
    });
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      subscription?.remove();
      subscription = null;
      generation += 1;
      // The OS preference can change while nobody is listening.
      reducedMotion = true;
    }
  };
}

const getSnapshot = () => reducedMotion;
const getServerSnapshot = () => true;

export function useMotionPreference(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
