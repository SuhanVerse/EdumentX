/**
 * EdumentX — Calendar Date Picker
 *
 * In-house calendar for the student-facing enrollment sheet.
 * Replaces the previous "YYYY-MM-DD" free-text inputs — the
 * requirement was:
 *   - no past dates selectable (a request can't start before today)
 *   - actual visual calendar (not a text box)
 *   - "complete freedom" — pick any future date
 *   - month-by-month navigation
 *
 * Why hand-rolled, not a library:
 *   - `@react-native-community/datetimepicker` ships a native
 *     picker that's iOS- and Android-specific; its visual language
 *     doesn't match the EdumentX design tokens.
 *   - `react-native-calendars` is a strong dep but adds 200 KB
 *     and a third-party theming layer we'd have to fight.
 *   - The calendar is small (one month grid + month nav) and
 *     already fits the project's "React Native primitives +
 *     NativeWind" rule.
 *
 * Asia/Kathmandu timezone awareness — important for Nepali users
 * who are 5h45 ahead of UTC. The `today` floor uses
 * `todayIsoInKtm()` from the enrollments helpers (the source of
 * truth across the project) so the "no past dates" rule matches
 * the same midnight the rest of the app sees.
 *
 * The picker is uncontrolled-friendly: the parent owns the value
 * and the picker writes back via `onChange(isoDate)`. The picker
 * shows a month at a time; tapping a day calls `onChange`
 * immediately. There is no "OK" button — the calendar IS the
 * confirmation. The parent typically wraps this in a Modal or
 * uses it inline as the date-input replacement.
 */

import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { AnimatedPressable, usePressScale } from "@/components/motion";
import { motion } from "@/lib/motion";
import { todayIsoInKtm } from "@/services/enrollments/derived";

// ─── Helpers ───────────────────────────────────────────────────────────────

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parse a YYYY-MM-DD string into a UTC-anchored `Date`. We anchor
 * at UTC noon to avoid DST shifts moving the day backwards when
 * the result is formatted back via Asia/Kathmandu arithmetic.
 * Returns `null` for malformed input.
 */
function parseIso(iso: string): Date | null {
  if (!ISO_RE.test(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d, 12));
}

function toIso(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function daysInMonth(year: number, monthZeroIdx: number): number {
  // Day 0 of the next month = last day of the current month.
  return new Date(Date.UTC(year, monthZeroIdx + 1, 0)).getUTCDate();
}

function firstWeekday(year: number, monthZeroIdx: number): number {
  // 0 = Sunday … 6 = Saturday.
  return new Date(Date.UTC(year, monthZeroIdx, 1)).getUTCDay();
}

// ─── Component ─────────────────────────────────────────────────────────────

export type CalendarDatePickerProps = {
  /** ISO date string (YYYY-MM-DD). `null` means no selection. */
  value: string | null;
  /** Fired with the new ISO string when the user picks a date. */
  onChange: (iso: string) => void;
  /**
   * ISO date string; dates strictly before this are disabled.
   * Defaults to today in Asia/Kathmandu.
   */
  minIso?: string;
  /** Optional ISO date string; dates strictly after this are disabled. */
  maxIso?: string;
};

export function CalendarDatePicker({
  value,
  onChange,
  minIso,
  maxIso,
}: CalendarDatePickerProps) {
  const todayIso = todayIsoInKtm();
  const effectiveMin = minIso ?? todayIso;

  const [viewYear, setViewYear] = useState<number>(() => {
    if (value && parseIso(value)) {
      return parseIso(value)!.getUTCFullYear();
    }
    return parseIso(todayIso)?.getUTCFullYear() ?? new Date().getFullYear();
  });
  const [viewMonth, setViewMonth] = useState<number>(() => {
    if (value && parseIso(value)) {
      return parseIso(value)!.getUTCMonth();
    }
    return parseIso(todayIso)?.getUTCMonth() ?? new Date().getMonth();
  });

  const minDate = parseIso(effectiveMin);
  const maxDate = maxIso ? parseIso(maxIso) : null;

  const cells = useMemo(() => {
    const total = daysInMonth(viewYear, viewMonth);
    const leading = firstWeekday(viewYear, viewMonth);
    const slots: { iso: string | null }[] = [];
    for (let i = 0; i < leading; i++) slots.push({ iso: null });
    for (let day = 1; day <= total; day++) {
      const d = new Date(Date.UTC(viewYear, viewMonth, day, 12));
      slots.push({ iso: toIso(d) });
    }
    // Pad to a multiple of 7 so the grid stays rectangular.
    while (slots.length % 7 !== 0) slots.push({ iso: null });
    return slots;
  }, [viewYear, viewMonth]);

  function isDisabled(iso: string | null): boolean {
    if (!iso) return true;
    const d = parseIso(iso);
    if (!d) return true;
    if (minDate && d < minDate) return true;
    if (maxDate && d > maxDate) return true;
    return false;
  }

  function isSelected(iso: string | null): boolean {
    return !!iso && iso === value;
  }

  function isToday(iso: string | null): boolean {
    return iso === todayIso;
  }

  function goPrevMonth() {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function goNextMonth() {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  // Cap prev navigation when the previous month is entirely in the past.
  const prevBlocked = (() => {
    const lastOfThisMonth = new Date(Date.UTC(viewYear, viewMonth + 1, 0, 12));
    if (!minDate) return false;
    return lastOfThisMonth < minDate;
  })();

  return (
    <View className="bg-surface border border-border rounded-card p-3">
      {/* Header — month name + prev/next chevrons */}
      <View className="flex-row items-center justify-between mb-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          onPress={goPrevMonth}
          disabled={prevBlocked}
          className={`w-9 h-9 rounded-pill items-center justify-center ${
            prevBlocked ? "opacity-30" : "active:opacity-70"
          }`}
        >
          <Ionicons name="chevron-back" size={18} color="#26302B" />
        </Pressable>
        <Text className="text-card-title font-semibold text-text-primary">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next month"
          onPress={goNextMonth}
          className="w-9 h-9 rounded-pill items-center justify-center active:opacity-70"
        >
          <Ionicons name="chevron-forward" size={18} color="#26302B" />
        </Pressable>
      </View>

      {/* Day-of-week header row */}
      <View className="flex-row mb-1.5">
        {DAY_LABELS.map((label) => (
          <View key={label} className="flex-1 items-center">
            <Text className="text-micro font-semibold text-text-muted uppercase tracking-wider">
              {label}
            </Text>
          </View>
        ))}
      </View>

      {/* 6-row × 7-col day grid */}
      <View className="flex-row flex-wrap">
        {cells.map((cell, idx) => {
          if (!cell.iso) {
            return (
              <View
                key={`empty-${idx}`}
                style={{ width: `${100 / 7}%`, aspectRatio: 1 }}
              />
            );
          }
          const disabled = isDisabled(cell.iso);
          const selected = isSelected(cell.iso);
          const today = isToday(cell.iso);
          return (
            <DayCell
              key={cell.iso}
              iso={cell.iso}
              disabled={disabled}
              selected={selected}
              isToday={today}
              onPress={() => onChange(cell.iso!)}
            />
          );
        })}
      </View>
    </View>
  );
}

// ─── Day cell ──────────────────────────────────────────────────────────────

function DayCell({
  iso,
  disabled,
  selected,
  isToday,
  onPress,
}: {
  iso: string;
  disabled: boolean;
  selected: boolean;
  isToday: boolean;
  onPress: () => void;
}) {
  // Hooks must run unconditionally before any early return.
  const { onPressIn, onPressOut, animatedStyle } = usePressScale({
    targetScale: motion.scale.cardPressed,
  });

  const day = Number(iso.slice(8, 10));

  const baseClasses = "items-center justify-center m-0.5 rounded-pill";

  if (disabled) {
    return (
      <View
        style={{ width: `${100 / 7}%`, aspectRatio: 1 }}
        className="items-center justify-center"
      >
        <View className={`${baseClasses} bg-surface-muted opacity-40`}>
          <Text className="text-body-sm text-text-muted">{day}</Text>
        </View>
      </View>
    );
  }

  if (selected) {
    return (
      <View
        style={{ width: `${100 / 7}%`, aspectRatio: 1 }}
        className="items-center justify-center"
      >
        <AnimatedPressable
          accessibilityRole="button"
          accessibilityLabel={`Selected ${iso}`}
          onPress={onPress}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          style={animatedStyle}
          className={`${baseClasses} bg-accent`}
        >
          <Text className="text-body-sm font-semibold text-text-inverse">
            {day}
          </Text>
        </AnimatedPressable>
      </View>
    );
  }

  return (
    <View
      style={{ width: `${100 / 7}%`, aspectRatio: 1 }}
      className="items-center justify-center"
    >
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={`Pick ${iso}`}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={animatedStyle}
        className={`${baseClasses} ${
          isToday
            ? "bg-verification-light border border-verification"
            : "bg-surface"
        }`}
      >
        <Text
          className={`text-body-sm ${
            isToday ? "text-verification font-semibold" : "text-text-primary"
          }`}
        >
          {day}
        </Text>
      </AnimatedPressable>
    </View>
  );
}
