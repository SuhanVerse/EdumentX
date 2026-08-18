/**
 * EdumentX — Pro Tutor Upgrade route
 *
 * Thin routed shell over `ProUpgradeScreen` (the screen owns the
 * plan picker + eSewa WebView flow). Exists so expo-router can
 * resolve `/pro-upgrade` as a deep link from the tutor dashboard /
 * profile "Go Pro" CTAs.
 */

import { ProUpgradeScreen } from "@/screens/tutor/ProUpgradeScreen";

export default function ProUpgradeRoute() {
  return <ProUpgradeScreen />;
}
