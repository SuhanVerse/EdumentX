/**
 * EdumentX — Request Enrollment Sheet
 *
 * Modal sheet that captures a student's intent to enroll with a
 * tutor. On submit, it calls `EnrollmentRepository.writeEnrollmentRequest`
 * with the snapshot fields needed for the tutor's inbox card.
 *
 * The sheet shows:
 *   - Tutor summary (name + subjects)
 *   - Schedule text input (free-form summary — student types any
 *     days/times they prefer; the tutor reads it on the inbox card)
 *   - Start / end date inputs (default: today + 30 days)
 *   - Optional message textarea
 *   - Submit button
 *
 * Slot-level data is intentionally NOT captured here. The student
 * already saw the tutor's full availability grid above the sheet
 * (the `StudentAvailabilityGrid` on `TutorDetailsScreen`) — any
 * multi-select is a visual aid for the student's own
 * decision-making, not a structured payload. They paste their
 * chosen days/times into the `schedule` text field (or the
 * `message` field) and the tutor reads it on the inbox card.
 *
 * The slot-level `AvailabilityTimeList` previously rendered here
 * was removed in the simplification — it forced the student to
 * pick exactly one slot from the tutor's grid, which never
 * reflected the real-world "I can do any of these three" reality.
 */

import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { colors } from "@/constants/colors";
import { useAuthStore } from "@/store/authStore";
import { getEnrollmentRepository } from "@/services/enrollments/dataSource";
import { todayIsoInKtm } from "@/services/enrollments/derived";
import { CalendarDatePicker } from "@/components/domain/CalendarDatePicker";

import type { TutorProfile } from "@/lib/tutor/types";

const MESSAGE_MAX = 280;

/**
 * Parse a YYYY-MM-DD string into a UTC-anchored Date. Used by the
 * date picker's "+30 days" bump so we don't accidentally cross a
 * Asia/Kathmandu midnight.
 */
function parseIsoUtc(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1, 12));
}

function toIsoUtc(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDaysIso(iso: string, days: number): string {
  const d = parseIsoUtc(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return toIsoUtc(d);
}

type Props = {
  visible: boolean;
  tutor: TutorProfile;
  onClose: () => void;
  onSubmitted: (requestId: string) => void;
};

export function RequestEnrollmentSheet({
  visible,
  tutor,
  onClose,
  onSubmitted,
}: Props) {
  const studentUid = useAuthStore((s) => s.user?.uid ?? null);
  const [schedule, setSchedule] = useState("");
  const [startDate, setStartDate] = useState(todayIsoInKtm());
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state every time the sheet opens so a previous attempt
  // doesn't leak through. Fresh-open defaults.
  useEffect(() => {
    if (!visible) return;
    setSchedule("");
    setStartDate(todayIsoInKtm());
    const d = new Date();
    d.setDate(d.getDate() + 30);
    setEndDate(d.toISOString().slice(0, 10));
    setMessage("");
    setError(null);
    setSubmitting(false);
  }, [visible]);

  const trimmedSchedule = schedule.trim();
  const canSubmit = useMemo(() => {
    if (submitting) return false;
    if (!studentUid) return false;
    if (trimmedSchedule.length === 0) return false;
    if (startDate.length === 0 || endDate.length === 0) return false;
    if (startDate > endDate) return false;
    return true;
  }, [submitting, studentUid, trimmedSchedule, startDate, endDate]);

  async function handleSubmit() {
    if (!studentUid) {
      setError("You need to be signed in to send a request.");
      return;
    }
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const repo = getEnrollmentRepository();
      const { requestId } = await repo.writeEnrollmentRequest({
        tutorUid: tutor.id,
        studentUid,
        student: {
          uid: studentUid,
          name: "", // filled by the repo snapshot if needed
          grade: "",
          avatar: null,
        },
        subjects: tutor.subjects,
        schedule: trimmedSchedule,
        startDate,
        endDate,
        message: message.trim(),
      });
      onSubmitted(requestId);
    } catch (err) {
      console.warn("RequestEnrollmentSheet: writeEnrollmentRequest failed", err);
      setError(
        err instanceof Error
          ? err.message
          : "Couldn't send the request. Try again.",
      );
      setSubmitting(false);
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-background rounded-t-3xl max-h-[90%]">
          {/* Drag handle */}
          <View className="items-center pt-2 pb-1">
            <View className="w-10 h-1 rounded-pill bg-border" />
          </View>

          {/* Header */}
          <View className="px-5 pt-2 pb-3 flex-row items-start justify-between">
            <View className="flex-1 min-w-0">
              <Text className="text-section-title font-semibold text-text-primary">
                Request enrollment
              </Text>
              <Text className="text-caption text-text-muted mt-1">
                Send a request to {tutor.fullName.split(" ")[0]}. They&apos;ll
                review and decide.
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onClose}
              className="w-9 h-9 rounded-pill bg-surface border border-border items-center justify-center"
              disabled={submitting}
            >
              <Ionicons
                name="close"
                size={18}
                color={colors.text.muted}
              />
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            className="px-5"
            contentContainerStyle={{ paddingBottom: 24 }}
          >
            {/* Schedule */}
            <Text className="text-card-title font-medium text-text-primary mb-1.5">
              Schedule summary
            </Text>
            <Text className="text-caption text-text-muted mb-2">
              A short description like &quot;Mon · Wed · Fri 5–7 PM&quot; or
              &quot;Flexible on weekday evenings&quot;.
            </Text>
            <TextInput
              accessibilityLabel="Schedule summary"
              value={schedule}
              onChangeText={setSchedule}
              placeholder="Mon · Wed · Fri 5–7 PM"
              placeholderTextColor={colors.text.muted}
              className="h-12 bg-surface border border-border rounded-card px-4 text-body text-text-primary"
              editable={!submitting}
            />

            {/* Dates — two real calendars stacked. Past dates are
                *  blocked by the picker's internal `minIso` (defaults
                *  to today in Asia/Kathmandu). End must be ≥ start. */}
            <View className="mt-5 gap-4">
              <View>
                <View className="flex-row items-center justify-between mb-1.5">
                  <Text className="text-card-title font-medium text-text-primary">
                    Start date
                  </Text>
                  <Text className="text-caption text-text-muted">
                    {startDate || "Pick a date"}
                  </Text>
                </View>
                <CalendarDatePicker
                  value={startDate || null}
                  onChange={(iso) => {
                    setStartDate(iso);
                    // If the new start pushes past the current end,
                    // bump the end out by at least 30 days.
                    if (endDate && iso > endDate) {
                      setEndDate(addDaysIso(iso, 30));
                    }
                  }}
                />
              </View>
              <View>
                <View className="flex-row items-center justify-between mb-1.5">
                  <Text className="text-card-title font-medium text-text-primary">
                    End date
                  </Text>
                  <Text className="text-caption text-text-muted">
                    {endDate || "Pick a date"}
                  </Text>
                </View>
                <CalendarDatePicker
                  value={endDate || null}
                  onChange={(iso) => setEndDate(iso)}
                  // End must be on or after start. minIso is the
                  // larger of (today, startDate).
                  minIso={
                    startDate && startDate > todayIsoInKtm()
                      ? startDate
                      : todayIsoInKtm()
                  }
                />
              </View>
            </View>

            {/* Message */}
            <Text className="text-card-title font-medium text-text-primary mt-5 mb-1.5">
              Message (optional)
            </Text>
            <TextInput
              accessibilityLabel="Message"
              value={message}
              onChangeText={setMessage}
              placeholder="Anything the tutor should know…"
              placeholderTextColor={colors.text.muted}
              multiline
              maxLength={MESSAGE_MAX}
              className="min-h-[88px] bg-surface border border-border rounded-card px-4 py-3 text-body text-text-primary"
              editable={!submitting}
            />
            <Text className="text-micro text-text-muted mt-1 self-end">
              {message.length}/{MESSAGE_MAX}
            </Text>

            {error ? (
              <View className="mt-4 flex-row items-center gap-2 bg-danger-bg border border-danger/30 rounded-card p-3">
                <Ionicons
                  name="alert-circle-outline"
                  size={16}
                  color={colors.semantic.danger}
                />
                <Text className="text-caption text-danger flex-1">
                  {error}
                </Text>
              </View>
            ) : null}

            {/* Submit */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Send enrollment request"
              onPress={handleSubmit}
              disabled={!canSubmit}
              className={`mt-5 h-12 rounded-card items-center justify-center flex-row gap-2 ${
                canSubmit
                  ? "bg-accent active:opacity-80"
                  : "bg-surface-muted"
              }`}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons
                    name="send"
                    size={16}
                    color={canSubmit ? "#FFFFFF" : colors.text.muted}
                  />
                  <Text
                    className={`text-button font-semibold ${
                      canSubmit ? "text-text-inverse" : "text-text-muted"
                    }`}
                  >
                    Send request
                  </Text>
                </>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
