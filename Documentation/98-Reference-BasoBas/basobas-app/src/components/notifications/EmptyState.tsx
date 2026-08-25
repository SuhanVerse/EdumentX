import { View, Text } from 'react-native';
import { Bell } from 'lucide-react-native';

/**
 * Empty state shown when the user has no notifications to display.
 *
 * Used by all three notification screens (tenant deep, landlord deep,
 * landlord tab). Renders a dimmed Bell glyph plus copy — matches the
 * existing aesthetic of `EmptyState`-style placeholders elsewhere in
 * the app (see e.g. `app/(tenant)/saved.tsx`).
 *
 * Touch target is intentionally inert; tapping the empty state does
 * nothing — the action lives on the dock badge or other entrances.
 */
export const NotificationsEmptyState = () => (
  <View className="flex-1 items-center justify-center px-[24px] py-[64px]">
    <View className="mb-5 h-[64px] w-[64px] items-center justify-center rounded-pill bg-canvas">
      <Bell size={26} color="#AAAAAA" strokeWidth={1.6} />
    </View>
    <Text className="mb-2 font-semibold text-h3 text-ink">No notifications yet</Text>
    <Text className="text-center font-sans text-body-sm text-ink2">
      You&apos;ll see updates about visits, requests, and listings here.
    </Text>
  </View>
);
