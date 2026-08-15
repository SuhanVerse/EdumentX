/**
 * EdumentX — Weekly Availability Grid
 *
 * A vertically-scrolling 7-day × 6-slot grid that anchors the tutor's
 * "Capacity & schedule" screen and the read-only slot picker used
 * inside batch creation.
 *
 * Layout (per user feedback — vertically scrollable, full week):
 *
 *   ╭───────────────────────────────╮
 *   │ Mon                           │
 *   │   6–9 AM   9 AM–12 PM   …    │
 *   │ Tue                           │
 *   │   6–9 AM   9 AM–12 PM   …    │
 *   │   …                           │
 *   │ Sun                           │
 *   │   6–9 AM   9 AM–12 PM   …    │
 *   ╰───────────────────────────────╯
 *
 * Each day's row is a single horizontal strip of 6 cells. The
 * outer ScrollView handles the vertical scroll. This shape keeps
 * each row readable on a 360-px-wide phone (the time labels only
 * appear once per row, on the left).
 *
 * Two variants:
 *   - `"editable"` — every cell is a tap target. The parent's
 *     `onCellTap` callback receives
 *     `{ day, slot, currentStatus }` and decides the next status
 *     (typically Off → Available → Off, never "Booked"). Booked
 *     cells are disabled.
 *   - `"readonly"` — cells render the same palette but are not
 *     tappable. The parent overlays a tap-detection layer of its own
 *     (used by the batch-creation slot picker to toggle inclusion
 *     in the batch's `slotKeys`).
 *
 * Cell state ladder (in priority order):
 *   1. `bookedMap.get(slotKey)` → "Booked" (blue tint, ai border),
 *      `disabled`.
 *   2. `availability[day][slot] === "available"` → "Available"
 *      (green tint, verification border).
 *   3. Otherwise → "Off" (sand fill, no border).
 *
 * No hex literals — colors come from design tokens.
 *
 * `formatSlotKeyFromKey(key)` is exported so the
 * `EnrolledStudentRow` and the `AvailabilityTimeList` can render
 * "Mon · 5–7 PM" without re-implementing the format.
 */

import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, Text, View } from "react-native";

import {
  DAY_KEYS,
  DAY_LABELS,
  TIME_SLOT_KEYS,
  TIME_SLOT_LABELS,
  slotKey,
  type BookedMap,
  type DayKey,
  type TimeSlotKey,
  type WeeklyAvailability,
} from "@/services/enrollments/types";

export type WeeklyAvailabilityGridProps = {
  availability: WeeklyAvailability;
  bookedMap: BookedMap;
  variant: "editable" | "readonly";
  onCellTap?: (payload: {
    day: DayKey;
    slot: TimeSlotKey;
    currentStatus: "off" | "available" | "booked";
  }) => void;
  /** Set of slot keys that the parent has marked as "selected"
   *  (used by the batch-creation slot picker). When a slot key is
   *  in this set AND it's not booked, the cell renders an
   *  accent-amber overlay ring. The component is agnostic to
   *  what "selected" means; the parent applies it. */
  selectedSlotKeys?: ReadonlySet<string>;
};

/** Convenience formatter — exported because several screens need
 *  the same slug → "Mon · 5–7 PM" mapping. */
export function formatSlotKeyFromKey(key: string): string {
  const parsed = parseSlotKeyForFormat(key);
  if (!parsed) return key;
  const { day, slot } = parsed;
  return `${DAY_LABELS[day]} · ${TIME_SLOT_LABELS[slot]}`;
}

function parseSlotKeyForFormat(key: string): {
  day: DayKey;
  slot: TimeSlotKey;
} | null {
  const [d, s] = key.split(":") as [string, string];
  if (!DAY_KEYS.includes(d as DayKey)) return null;
  if (!TIME_SLOT_KEYS.includes(s as TimeSlotKey)) return null;
  return { day: d as DayKey, slot: s as TimeSlotKey };
}

function cellStatus(
  availability: WeeklyAvailability,
  bookedMap: BookedMap,
  day: DayKey,
  slot: TimeSlotKey,
): "off" | "available" | "booked" {
  const key = slotKey(day, slot);
  if (bookedMap.has(key)) return "booked";
  return availability[day][slot];
}

type CellPalette = {
  bg: string;
  borderClass: string;
  text: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor: string;
};

function cellPalette(status: "off" | "available" | "booked"): CellPalette {
  if (status === "available") {
    return {
      bg: "bg-verification-light",
      borderClass: "border border-verification",
      text: "text-verification",
      icon: "checkmark",
      iconColor: "#3F8A5A",
    };
  }
  if (status === "booked") {
    return {
      bg: "bg-ai-light",
      borderClass: "border border-ai",
      text: "text-ai",
      icon: "people",
      iconColor: "#4A7FA5",
    };
  }
  return {
    bg: "bg-surface-muted",
    borderClass: "border border-transparent",
    text: "text-text-muted",
    iconColor: "transparent",
  };
}

export function WeeklyAvailabilityGrid({
  availability,
  bookedMap,
  variant,
  onCellTap,
  selectedSlotKeys,
}: WeeklyAvailabilityGridProps) {
  return (
    <View>
      {/* Column header — time labels only. The day label sits on the
          left of each row so the user reads top-to-bottom instead of
          having to scan a row header on every day. */}
      <View className="flex-row mb-2 ml-14">
        {TIME_SLOT_KEYS.map((slot) => (
          <View key={slot} className="flex-1 px-0.5">
            <Text
              className="text-micro font-semibold text-text-muted uppercase tracking-wider text-center"
              numberOfLines={2}
            >
              {TIME_SLOT_LABELS[slot]}
            </Text>
          </View>
        ))}
      </View>

      {/* Day rows — 7 rows wrapped in a vertical ScrollView so the
          whole week (7 × 6 = 42 cells) scrolls on phones. */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ maxHeight: 460 }}
      >
        {DAY_KEYS.map((day) => (
          <View key={day} className="flex-row items-center mb-2">
            <View className="w-12 pr-1.5">
              <Text className="text-overline font-semibold text-text-primary uppercase tracking-wider">
                {DAY_LABELS[day]}
              </Text>
            </View>
            <View className="flex-1 flex-row gap-1.5">
              {TIME_SLOT_KEYS.map((slot) => {
                const status = cellStatus(availability, bookedMap, day, slot);
                const key = slotKey(day, slot);
                const selected = selectedSlotKeys?.has(key) ?? false;
                const palette = cellPalette(status);
                // `editable` → every cell taps (parent decides).
                // `readonly` → only Available cells tap (used by the
                //   batch-creation picker to add/remove a slot from
                //   the batch). Booked + Off are non-tappable.
                const isTapDisabled =
                  (variant === "readonly" && status !== "available") ||
                  status === "booked";
                const cellBody = (
                  <View
                    className={`h-12 rounded-md ${palette.bg} ${palette.borderClass} items-center justify-center ${
                      selected ? "border-2 border-accent" : ""
                    }`}
                    style={{ opacity: status === "off" ? 0.7 : 1 }}
                  >
                    {palette.icon ? (
                      <Ionicons
                        name={palette.icon}
                        size={14}
                        color={palette.iconColor}
                      />
                    ) : (
                      <Text className="text-text-muted text-xs">·</Text>
                    )}
                  </View>
                );
                if (isTapDisabled) {
                  return (
                    <View key={key} className="flex-1">
                      {cellBody}
                    </View>
                  );
                }
                return (
                  <Pressable
                    key={key}
                    accessibilityRole="button"
                    accessibilityLabel={`Toggle ${DAY_LABELS[day]} ${TIME_SLOT_LABELS[slot]}`}
                    onPress={() =>
                      onCellTap?.({ day, slot, currentStatus: status })
                    }
                    className="flex-1 active:opacity-80"
                  >
                    {cellBody}
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Legend — always rendered */}
      <View className="flex-row justify-between mt-3.5 px-1">
        <LegendDot
          color="bg-verification-light"
          border="border-verification"
          label="Available"
        />
        <LegendDot color="bg-ai-light" border="border-ai" label="Booked" />
        <LegendDot
          color="bg-surface-muted"
          border="border-transparent"
          label="Off"
        />
      </View>
    </View>
  );
}

function LegendDot({
  color,
  border,
  label,
}: {
  color: string;
  border: string;
  label: string;
}) {
  return (
    <View className="flex-row items-center gap-1.5">
      <View className={`w-3 h-3 rounded-sm ${color} ${border}`} />
      <Text className="text-micro text-text-secondary">{label}</Text>
    </View>
  );
}
