/**
 * `Skeleton`, `SkeletonRow`, `SkeletonText` — placeholder shapes for
 * loading states. Pulses opacity 0.5 → 1.0 → 0.5 over 1200ms via the
 * legacy RN `Animated` API (Reanimated is overkill for a 1s opacity
 * blink, and the JS-thread cost is negligible at the call rates we
 * expect — a handful of rows on screen at most).
 *
 * Usage
 *   <Skeleton className="h-4 w-32" />                       // a bar
 *   <SkeletonText className="w-48" />                       // pre-shaped line
 *   <SkeletonRow />                                         // pre-shaped card row
 *
 * The `className` prop on each component is forwarded so callers can
 * fine-tune the size without rewriting the component.
 */
import { useEffect, useRef } from "react";
import { Animated, Easing, View, type ViewProps } from "react-native";

/**
 * A single pulsing rectangle. The base fill comes from the
 * `bg-surface-muted` token (existing palette — never override).
 */
export function Skeleton({ className = "", style, ...rest }: ViewProps) {
  const opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.6,
          duration: 600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      // eslint-disable-next-line react-native/no-inline-styles
      style={[{ opacity }, style]}
      className={`bg-surface-muted rounded-md ${className}`}
      {...rest}
    />
  );
}

/**
 * A short horizontal text placeholder. Defaults to 14h × full-width;
 * callers can override with `className` (e.g. `className="w-2/3"`).
 */
export function SkeletonText({ className = "" }: { className?: string }) {
  return <Skeleton className={`h-3.5 w-full ${className}`} />;
}

/**
 * A card-row placeholder: 96h hero bar + 2 text lines below, matching
 * the rough shape of the tutor / request cards the lists will eventually
 * render.
 */
export function SkeletonRow({ className = "" }: { className?: string }) {
  return (
    <View
      className={`rounded-card bg-surface border border-border overflow-hidden p-4 gap-3 ${className}`}
    >
      <Skeleton className="h-24 w-full rounded-md" />
      <View className="gap-2">
        <SkeletonText className="w-2/3" />
        <SkeletonText className="w-1/2" />
      </View>
    </View>
  );
}
