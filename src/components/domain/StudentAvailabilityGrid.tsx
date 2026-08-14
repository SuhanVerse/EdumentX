/**
 * EdumentX — Student Availability Grid
 *
 * Student-facing read-only clone of `WeeklyAvailabilityGrid`. Mirrors
 * the tutor grid's geometry (7 days × 6 time slots, column-header
 * strip, legend dots) but owns the student-only concerns:
 *
 *   1. Multi-select state — the student can tap any number of
 *      Available cells (or Pending cells) to mark them as
 *      "candidates". Tapping a selected cell toggles it OFF. The
 *      parent owns the state machine via a `Set<string>`.
 *   2. Pending overlay — when a slot has open requests (other
 *      students asking), the cell renders a 12 px hourglass icon
 *      and a tiny bottom-right count badge. Still tap-able — the
 *      student can add it to their selection.
 *   3. Shake-on-disabled — Booked / Off taps do NOT update the
 *      selection and instead fire `onSlotDisabled` for the parent
 *      to wobble the grid.
 *
 * The grid is intentionally a sibling, not a variant prop on the
 * tutor grid. The tutor grid is a power tool (two variants,
 * optimistic updates, palette ladder for "Booked"). Merging
 * "student" concerns into it would split responsibilities and
 * drag every existing prop through a `studentMode` branch.
 *
 * **The selection is purely visual.** Nothing about the student's
 * pick is sent to the tutor — the student types their preferred
 * days/times into the `RequestEnrollmentSheet`'s `schedule` text
 * field. The grid helps them think aloud and visually mark
 * candidates; the sheet captures the human-readable intent.
 *
 * Colour contract (locked with the phase 1 plan):
 *   Available           bg-verification-light, border-verification, checkmark
 *   Selected            bg-verification-light, border-2 border-accent, checkmark
 *   Available + Pending bg-verification-light, border-verification, hourglass + count badge
 *   Booked (accepted)   bg-ai-light, border-ai, people
 *   Off                 bg-surface-muted, border-transparent, opacity 0.7
 *
 * Hex literals live in `constants/colors.ts` because react-native
 * `Ionicons` `color` props can't take tailwind classes.
 */

import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { AnimatedPressable, usePressScale } from "@/components/motion";
import { motion } from "@/lib/motion";
import { colors } from "@/constants/colors";

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
import type { PendingMap } from "@/services/enrollments/pending";

export type StudentAvailabilityGridProps = {
  availability: WeeklyAvailability;
  /** Required. Pass `new Map()` (empty) before the first snapshot
   *  lands — the parent renders a skeleton instead of the grid in
   *  that case, so the grid itself never has to handle null. */
  bookedMap: BookedMap;
  /** Optional overlay: slot keys with one or more open requests.
   *  Defaults to an empty Map (no overlay anywhere). */
  pendingMap?: PendingMap;
  /** Set of canonical slot keys currently selected by the user.
   *  The grid reflects this without owning the state. The same
   *  key can be in `selectedSlotKeys` and `pendingMap` — the
   *  pending overlay defers to the selected border. */
  selectedSlotKeys: ReadonlySet<string>;
  /** Fired when the user taps an Available (or Pending) cell.
   *  Receives the slot key. The parent toggles the key in its
   *  `selectedSlotKeys` set. */
  onSlotToggle: (slotKey: string) => void;
  /** Fired when the user taps a Booked or Off cell. Parent
   *  typically wires this to `useShake` so the whole grid wobbles. */
  onSlotDisabled?: (slotKey: string) => void;
};

type CellStatus =
  | "available"
  | "selected"
  | "pending"
  | "booked"
  | "off";

function cellStatus(
  availability: WeeklyAvailability,
  bookedMap: BookedMap,
  pendingMap: PendingMap,
  selectedSlotKeys: ReadonlySet<string>,
  day: DayKey,
  slot: TimeSlotKey,
): CellStatus {
  const key = slotKey(day, slot);
  // Booked wins over everything else. Tutor-accepted → blue.
  if (bookedMap.has(key)) return "booked";
  const base = availability[day][slot];
  if (base === "off") return "off";
  // Available. Selected wins over Pending — a slot the user has
  // explicitly picked shouldn't be cluttered with the hourglass.
  if (selectedSlotKeys.has(key)) return "selected";
  if (pendingMap.has(key)) return "pending";
  return "available";
}

const EMPTY_PENDING: PendingMap = new Map();

export function StudentAvailabilityGrid({
  availability,
  bookedMap,
  pendingMap,
  selectedSlotKeys,
  onSlotToggle,
  onSlotDisabled,
}: StudentAvailabilityGridProps) {
  const overlay = pendingMap ?? EMPTY_PENDING;

  return (
    <View>
      {/* Column header — same shape as the tutor grid */}
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

      {/* Day rows — vertically scrolling 7 × 6 grid */}
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
                const key = slotKey(day, slot);
                const status = cellStatus(
                  availability,
                  bookedMap,
                  overlay,
                  selectedSlotKeys,
                  day,
                  slot,
                );
                return (
                  <SlotCell
                    key={key}
                    day={day}
                    slot={slot}
                    status={status}
                    pendingCount={overlay.get(key) ?? 0}
                    onToggle={onSlotToggle}
                    onDisabled={onSlotDisabled}
                  />
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Legend — 4 dots, same wording +1 "Selected" */}
      <View className="flex-row justify-between mt-3.5 px-1">
        <LegendDot
          color="bg-verification-light"
          border="border-verification"
          label="Available"
        />
        <LegendDot
          color="bg-verification-light"
          border="border-accent"
          label="Selected"
          isSelectedAccent
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

function SlotCell({
  day,
  slot,
  status,
  pendingCount,
  onToggle,
  onDisabled,
}: {
  day: DayKey;
  slot: TimeSlotKey;
  status: CellStatus;
  pendingCount: number;
  onToggle?: (slotKey: string) => void;
  onDisabled?: (slotKey: string) => void;
}) {
  // Hooks must run unconditionally. We always call `usePressScale`;
  // the disabled cells just don't apply the animated style.
  const { onPressIn, onPressOut, animatedStyle } = usePressScale({
    targetScale: motion.scale.cardPressed,
  });

  const key = slotKey(day, slot);
  const palette = cellPalette(status);
  const iconColor = status === "off" ? "transparent" : palette.iconColor;
  const cellBody = (
    <View
      className={`h-12 rounded-md ${palette.bg} ${palette.borderClass} items-center justify-center relative overflow-hidden`}
      style={{ opacity: status === "off" ? 0.7 : 1 }}
    >
      {palette.icon ? (
        <Ionicons name={palette.icon} size={14} color={iconColor} />
      ) : (
        <Text className="text-text-muted text-xs">·</Text>
      )}
      {/* Pending count badge — bottom-right, only when ≥2 students
       *  are asking AND the cell renders as "Pending". */}
      {status === "pending" && pendingCount > 1 ? (
        <View
          accessibilityLabel={`${pendingCount} pending requests`}
          className="absolute bottom-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-pill bg-verification items-center justify-center"
        >
          <Text className="text-[8px] font-semibold text-white">
            {pendingCount}
          </Text>
        </View>
      ) : null}
    </View>
  );

  // Disabled cells (Booked / Off) — no press scale, but tap
  // forwards to `onDisabled` so the parent can run `useShake`.
  if (status === "booked" || status === "off") {
    return (
      <View className="flex-1">
        {cellBody}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${DAY_LABELS[day]} ${TIME_SLOT_LABELS[slot]} unavailable`}
          onPress={() => onDisabled?.(key)}
          className="absolute inset-0"
        />
      </View>
    );
  }

  // Interactive cells — Available, Pending, Selected.
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={
        status === "selected"
          ? `Clear ${DAY_LABELS[day]} ${TIME_SLOT_LABELS[slot]}`
          : `Pick ${DAY_LABELS[day]} ${TIME_SLOT_LABELS[slot]}`
      }
      onPress={() => onToggle?.(key)}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={animatedStyle}
      className="flex-1"
    >
      {cellBody}
    </AnimatedPressable>
  );
}

type CellPalette = {
  bg: string;
  borderClass: string;
  text: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor: string;
};

function cellPalette(status: CellStatus): CellPalette {
  if (status === "available") {
    return {
      bg: "bg-verification-light",
      borderClass: "border border-verification",
      text: "text-verification",
      icon: "checkmark",
      iconColor: colors.brand.verification,
    };
  }
  if (status === "selected") {
    return {
      bg: "bg-verification-light",
      // Amber border-2 on a green fill is the brand's "your pick"
      // signal — same vocabulary as the tutor grid's selection
      // convention. See `WeeklyAvailabilityGrid.tsx:201`.
      borderClass: "border-2 border-accent",
      text: "text-verification",
      icon: "checkmark",
      iconColor: colors.brand.verification,
    };
  }
  if (status === "pending") {
    return {
      bg: "bg-verification-light",
      borderClass: "border border-verification",
      text: "text-verification",
      icon: "hourglass-outline",
      iconColor: colors.brand.verification,
    };
  }
  if (status === "booked") {
    return {
      bg: "bg-ai-light",
      borderClass: "border border-ai",
      text: "text-ai",
      icon: "people",
      iconColor: colors.brand.ai,
    };
  }
  return {
    bg: "bg-surface-muted",
    borderClass: "border border-transparent",
    text: "text-text-muted",
    iconColor: "transparent",
  };
}

function LegendDot({
  color,
  border,
  label,
  isSelectedAccent,
}: {
  color: string;
  border: string;
  label: string;
  isSelectedAccent?: boolean;
}) {
  return (
    <View className="flex-row items-center gap-1.5">
      <View
        className={`w-3 h-3 rounded-sm ${color} ${
          isSelectedAccent ? "border-2" : "border"
        } ${border}`}
      />
      <Text className="text-micro text-text-secondary">{label}</Text>
    </View>
  );
}
