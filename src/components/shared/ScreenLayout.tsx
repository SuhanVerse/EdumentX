import { StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import React, { type ReactNode } from "react";
import { ScrollView, View, type ScrollViewProps } from "react-native";

import { theme } from "@/constants/theme";

/**
 * EdumentX — Reusable Screen Layout
 *
 * Centralizes SafeAreaView + StatusBar (both expo for barStyle
 * and React Native for backgroundColor) into one component.
 *
 * Every screen should use this instead of manually repeating
 * SafeAreaView + StatusBar imports and JSX.
 *
 * On Android with edge-to-edge (Expo SDK 52+ default), the status
 * bar area is transparent. Without explicit `backgroundColor`,
 * Android's system scrim (default: white on light theme) shows
 * through — creating the "white outline" at the top of screens.
 * This component sets the correct `backgroundColor` on the native
 * status bar to match the screen's background color, completely
 * eliminating the outline.
 */
export type ScreenVariant = "night" | "background" | "surface" | "splash";

const VARIANT_CONFIG: Record<
  ScreenVariant,
  { bgClass: string; expoStyle: "light" | "dark"; bgHex: string }
> = {
  // bgHex mirrors the Tailwind class's value via `theme` tokens so the
  // native status-bar color and the view background can never disagree.
  night: {
    bgClass: "bg-night",
    expoStyle: "light",
    bgHex: theme.colors.ink,
  },
  background: {
    bgClass: "bg-background",
    expoStyle: "dark",
    bgHex: theme.colors.background,
  },
  surface: {
    bgClass: "bg-surface",
    expoStyle: "dark",
    bgHex: theme.colors.surface,
  },
  splash: {
    bgClass: "bg-splash",
    expoStyle: "light",
    bgHex: theme.colors.splash,
  },
};

type ScreenLayoutProps = {
  children: ReactNode;
  variant: ScreenVariant;
};

export function ScreenLayout({ children, variant }: ScreenLayoutProps) {
  const config = VARIANT_CONFIG[variant];

  return (
    <SafeAreaView className={`flex-1 ${config.bgClass}`}>
      <ExpoStatusBar style={config.expoStyle} />
      <StatusBar backgroundColor={config.bgHex} />
      {children}
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Standardized layout primitives
// ═══════════════════════════════════════════════════════════════════════════
//
// These are the canonical spacing values every tab screen uses so content
// starts at the same vertical position on every screen (no more jumping
// when switching bottom tabs). `ScreenLayout` handles the safe area + status
// bar; `ScreenHeader` and `ScreenScroll` standardize the header and body.
// The structure every tab screen follows:
//
//   <ScreenLayout variant="...">
//     <ScreenHeader>{...title block...}</ScreenHeader>   // fixed hero
//     <ScreenScroll className="flex-1 bg-background">   // scrollable body
//       ...
//     </ScreenScroll>
//     <BottomNav />                                      // in-flow, never overlaps
//   </ScreenLayout>
//
// All values come from the 8px spacing grid (Phase 2 “double
// whitespace” pass): screen gutters are px-6 (24) like BasoBas, hero
// cushion pb-8 (32), body top pt-8 (32), end-of-scroll pb-12 (48).

/**
 * Dark hero header (matches the "slate" surface used by every
 * student / tutor / admin tab). Fixed (non-scrolling), `shrink-0` so
 * the scroll body can't squeeze it, and the top inset is provided by
 * `ScreenLayout`'s `SafeAreaView` — screens must NOT add their own
 * `pt-*` on top.
 */
export const SCREEN_HERO_CLASSES = "bg-night px-6 pb-8 shrink-0";

/**
 * Light header variant for surfaces that sit on a light background
 * (e.g. the tutor inbox, the batches screen) — same dimensions, no
 * dark fill, bottom hairline instead.
 */
export const SCREEN_HERO_LIGHT_CLASSES =
  "px-6 pb-8 shrink-0 bg-surface border-b border-border";

/**
 * Canonical scroll-body padding: `px-6` (24) gutters, `pt-8` (32)
 * below the header, `pb-12` (48) end-of-scroll cushion (Phase 2
 * “double whitespace”). The bottom nav is an in-flow sibling (never
 * overlapping), so no nav-height padding is needed here.
 */
export const SCREEN_CONTENT_CLASSES = "px-6 pt-8 pb-12";

/**
 * Fixed header slot. Renders the standard hero wrapper and the
 * standard 8px top gap (`pt-2`) beneath the status bar. `variant`
 * picks the dark fill (night) or the light hairline treatment.
 *
 * Screens pass their own title block as children; the children should
 * NOT add `mt-2` / `pt-*` — the 8px gap is baked in here.
 */
export function ScreenHeader({
  variant = "dark",
  children,
}: {
  variant?: "dark" | "light";
  children: ReactNode;
}) {
  return (
    <View
      className={
        variant === "dark" ? SCREEN_HERO_CLASSES : SCREEN_HERO_LIGHT_CLASSES
      }
    >
      <View className="pt-2">{children}</View>
    </View>
  );
}

/**
 * Light sheet body — the premium "dark hero → light sheet" seam.
 *
 * Screens with a dark (`bg-night`) hero and a light body used to have
 * a hard color edge where the hero ended. This wrapper is the shared
 * fix: the light content overlaps the dark hero by 16px (`-mt-4`)
 * with a `rounded-t-3xl` top, so the hero reads as a backdrop behind
 * a floating sheet instead of two stacked rectangles. `overflow-hidden`
 * makes the rounded corners actually clip the first child (tab bars,
 * cards, etc.).
 *
 * Structure:
 *
 *   <ScreenLayout variant="night">
 *     <ScreenHeader>…dark hero…</ScreenHeader>
 *     <ScreenSheet>{…light content…}</ScreenSheet>
 *     <BottomNav />
 *   </ScreenLayout>
 */
export function ScreenSheet({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <View
      className={`bg-background rounded-t-3xl -mt-4 flex-1 overflow-hidden ${className ?? ""}`}
    >
      {children}
    </View>
  );
}

/**
 * Canonical scroll body. A `ScrollView` preconfigured with the
 * standard content spacing (`SCREEN_CONTENT_CLASSES`), no scroll
 * indicator, and `keyboardShouldPersistTaps="handled"`.
 *
 * Override `contentContainerClassName` for the rare screen that needs
 * different body spacing (e.g. the AI chat's tighter bubble gutters).
 * `className` defaults to `flex-1`; pass `flex-1 bg-background` when
 * the body must sit on the light page color (common when the screen
 * variant is `night`).
 */
export const ScreenScroll = React.forwardRef<ScrollView, ScrollViewProps>(
  function ScreenScroll(
    { children, className, contentContainerClassName, ...rest },
    ref,
  ) {
    return (
      <ScrollView
        ref={ref}
        className={className ?? "flex-1"}
        contentContainerClassName={
          contentContainerClassName ?? SCREEN_CONTENT_CLASSES
        }
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        {...rest}
      >
        {children}
      </ScrollView>
    );
  },
);
