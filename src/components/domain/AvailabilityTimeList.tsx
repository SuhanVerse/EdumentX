/**
 * EdumentX — Availability Time List (student-facing)
 *
 * The student view of a tutor's weekly availability. Shown on
 * `TutorDetailsScreen` between the Session Board and the About
 * section. The student-facing surface intentionally avoids a 5×6
 * grid — that is too dense for a profile scan. Instead we render
 * a vertical, time-only list grouped by day:
 *
 *   Mon
 *     5–7 PM                                       [Available]
 *     3–5 PM                                       [Available]
 *   Wed
 *     5–7 PM                                       [Available]
 *   Fri
 *     9 AM–12 PM                                   [Booked]
 *
 * Available slots are listed first (sorted by slot order), then
 * booked slots. Days with no available AND no booked slots are
 * hidden. Off slots are never rendered.
 *
 * If the tutor has no availability at all (the `availability` field
 * is null on the profile), the component renders a friendly empty
 * state with the `DiscoverIllustration` and a "Set your weekly
 * availability" hint.
 *
 * The list is read-only by design — tapping a row does nothing.
 * The student's "Enroll" button lives on the sticky footer and
 * remains a placeholder for the next phase.
 */

import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/constants/colors";
import { Pressable, Text, View } from "react-native";

import { FloatingEmptyIcon } from "@/components/motion/FloatingEmptyIcon";
import { DiscoverIllustration } from "@/components/illustrations/DiscoverIllustration";

import {
  DAY_KEYS,
  DAY_LABELS,
  TIME_SLOT_KEYS,
  TIME_SLOT_LABELS,
  type BookedMap,
  type TimeSlotKey,
  type WeeklyAvailability,
} from "@/services/enrollments/types";

export type AvailabilityTimeListProps = {
  availability: WeeklyAvailability | null;
  bookedMap: BookedMap;
  /**
   * Optional tap handler. When set, available rows become
   * pressable and the row matching `selectedSlotKey` gets a
   * selected highlight. Booked rows stay non-interactive (the
   * student can't pick a taken slot — but they can still see
   * them).
   */
  onSlotTap?: (slotKey: string) => void;
  /**
   * The currently-selected slot, in `"<day>:<slot>"` form. Only
   * matters when `onSlotTap` is set.
   */
  selectedSlotKey?: string | null;
};

export function AvailabilityTimeList({
  availability,
  bookedMap,
  onSlotTap,
  selectedSlotKey = null,
}: AvailabilityTimeListProps) {
  // Group rows by day so we can render the day label once.
  const rowsByDay = DAY_KEYS.map((day) => {
    const available: TimeSlotKey[] = [];
    const booked: TimeSlotKey[] = [];
    for (const slot of TIME_SLOT_KEYS) {
      const key = `${day}:${slot}`;
      if (bookedMap.has(key)) {
        booked.push(slot);
      } else if (
        availability != null &&
        availability[day][slot] === "available"
      ) {
        available.push(slot);
      }
    }
    return { day, available, booked };
  });

  const hasAnyRow = rowsByDay.some(
    (r) => r.available.length > 0 || r.booked.length > 0,
  );

  if (!hasAnyRow) {
    return <EmptyState />;
  }

  return (
    <View>
      {rowsByDay.map(({ day, available, booked }) => {
        if (available.length === 0 && booked.length === 0) return null;
        return (
          <View key={day} className="mb-2.5">
            <Text className="text-caption font-semibold text-text-muted uppercase tracking-wider mb-1.5">
              {DAY_LABELS[day]}
            </Text>
            <View className="bg-surface border border-border rounded-card overflow-hidden">
              {available.length === 0 ? null : (
                available.map((slot, i) => (
                  <Row
                    key={`${day}:${slot}`}
                    slotKey={`${day}:${slot}`}
                    slot={slot}
                    status="available"
                    showBorder={i < available.length - 1 || booked.length > 0}
                    onTap={onSlotTap}
                    selected={selectedSlotKey === `${day}:${slot}`}
                  />
                ))
              )}
              {booked.length === 0
                ? null
                : booked.map((slot, i) => (
                    <Row
                      key={`${day}:${slot}`}
                      slotKey={`${day}:${slot}`}
                      slot={slot}
                      status="booked"
                      showBorder={i < booked.length - 1}
                    />
                  ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function Row({
  slotKey,
  slot,
  status,
  showBorder,
  onTap,
  selected,
}: {
  slotKey: string;
  slot: TimeSlotKey;
  status: "available" | "booked";
  showBorder: boolean;
  onTap?: (slotKey: string) => void;
  selected?: boolean;
}) {
  const isAvailable = status === "available";
  const handlePress = onTap ? () => onTap(slotKey) : undefined;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        isAvailable ? `Pick slot ${slot}` : `Booked slot ${slot}`
      }
      disabled={!onTap || !isAvailable}
      onPress={handlePress}
      className={`flex-row items-center gap-3 px-3.5 py-2.5 ${
        showBorder ? "border-b border-border" : ""
      } ${selected ? "bg-accent-soft" : ""}`}
    >
      <Text
        className={`text-body-sm ${
          isAvailable ? "text-text-primary" : "text-text-muted"
        }`}
      >
        {TIME_SLOT_LABELS[slot]}
      </Text>
      <View className="flex-1" />
      <View
        className={`flex-row items-center gap-1 px-2 py-0.5 rounded-pill ${
          isAvailable ? "bg-verification-light" : "bg-surface-muted"
        }`}
      >
        {!isAvailable ? <Ionicons name="people" size={11} color={colors.brand.ai} /> : null}
        <Text
          className={`text-micro font-medium ${
            isAvailable ? "text-verification" : "text-ai"
          }`}
        >
          {isAvailable ? "Available" : "Booked"}
        </Text>
      </View>
    </Pressable>
  );
}

function EmptyState() {
  return (
    <View className="bg-surface border border-border rounded-card p-6 items-center">
      <FloatingEmptyIcon
        iconName="calendar-outline"
        iconColor="#E5A03B"
        iconBgClass="bg-accent-soft"
        size={24}
        sizeClass="w-12 h-12"
      />
      <View className="w-32 h-32 mt-2">
        <DiscoverIllustration />
      </View>
      <Text className="text-card-title text-text-primary text-center font-medium mt-3">
        No published schedule yet
      </Text>
      <Text className="text-body-sm text-text-secondary text-center mt-1.5">
        This tutor hasn&apos;t shared their weekly availability yet.
        Reach out from the marketplace to ask about open slots.
      </Text>
    </View>
  );
}
