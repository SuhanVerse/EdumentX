import { StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import type { ReactNode } from "react";

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
  night: { bgClass: "bg-night", expoStyle: "light", bgHex: "#26302B" },
  background: {
    bgClass: "bg-background",
    expoStyle: "dark",
    bgHex: "#FBF8F2",
  },
  surface: { bgClass: "bg-surface", expoStyle: "dark", bgHex: "#FFFFFF" },
  splash: { bgClass: "bg-splash", expoStyle: "light", bgHex: "#2F5D50" },
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
