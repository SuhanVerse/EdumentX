/**
 * EdumentX — Edit Request Sheet
 *
 * Modal sheet that lets a student edit one of their own PENDING
 * enrollment requests. The student opened the sheet from the
 * Pending tab on `My Enrollments`; the parent passes the full
 * `EnrollmentRequest` so the sheet can pre-fill the fields and
 * knows which `tutorUid` + `requestId` to write back to.
 *
 * The sheet shows:
 *   - Tutor summary (name + subjects) — read-only context
 *   - Schedule text input (free-form summary)
 *   - Start / end date inputs (real calendars, no past dates)
 *   - Optional message textarea
 *   - Save changes button
 *
 * On submit, it calls
 * `EnrollmentRepository.updateEnrollmentRequest` with the four
 * mutable fields. The repository re-asserts `status === "pending"`
 * inside a transaction so a tutor accept that lands between the
 * user opening the sheet and pressing save surfaces as
 * `RequestAlreadyDecidedError` and the UI can refresh.
 *
 * The "Remove request" button lives at the bottom of the sheet
 * for one-tap cleanup. It calls
 * `EnrollmentRepository.deleteEnrollmentRequest` after a confirm
 * Alert.
 *
 * This sheet is intentionally NOT a generic "tutor profile → new
 * request" sheet — the request is in flight, so the layout and
 * the affordances are different (no subjects to pick, no slot
 * preview, and a Remove button).
 */

import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { colors } from "@/constants/colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "@/store/authStore";
import { getEnrollmentRepository } from "@/services/enrollments/dataSource";
import {
  RequestAlreadyDecidedError,
  type EnrollmentRequest,
} from "@/services/enrollments/types";
import { todayIsoInKtm } from "@/services/enrollments/derived";
import { CalendarDatePicker } from "@/components/domain/CalendarDatePicker";

const MESSAGE_MAX = 280;

type Props = {
  visible: boolean;
  request: EnrollmentRequest | null;
  /** Resolved tutor name + subjects for the header. The request
   *  doc only carries `tutorUid`, so the parent looks these up
   *  before opening the sheet. */
  tutor: {
    name: string;
    subjects: string[];
  };
  onClose: () => void;
  onSaved: () => void;
  onRemoved: () => void;
};

export function EditRequestSheet({
  visible,
  request,
  tutor,
  onClose,
  onSaved,
  onRemoved,
}: Props) {
  const insets = useSafeAreaInsets();
  const studentUid = useAuthStore((s) => s.user?.uid ?? null);
  const [schedule, setSchedule] = useState("");
  const [startDate, setStartDate] = useState(todayIsoInKtm());
  const [endDate, setEndDate] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill on every open so the previous attempt doesn't leak
  // through. Fresh-open defaults seeded from the request payload.
  useEffect(() => {
    if (!visible || !request) return;
    setSchedule(request.schedule);
    setStartDate(request.startDate || todayIsoInKtm());
    setEndDate(request.endDate || "");
    setMessage(request.message);
    setError(null);
    setSubmitting(false);
    setRemoving(false);
  }, [visible, request]);

  const trimmedSchedule = schedule.trim();
  const canSubmit = useMemo(() => {
    if (submitting || removing) return false;
    if (!studentUid) return false;
    if (trimmedSchedule.length === 0) return false;
    if (startDate.length === 0 || endDate.length === 0) return false;
    if (startDate > endDate) return false;
    return true;
  }, [submitting, removing, studentUid, trimmedSchedule, startDate, endDate]);

  const isDirty = useMemo(() => {
    if (!request) return false;
    return (
      schedule !== request.schedule ||
      startDate !== request.startDate ||
      endDate !== request.endDate ||
      message !== request.message
    );
  }, [schedule, startDate, endDate, message, request]);

  // Early return AFTER the hooks so the hook order is stable across
  // renders. The `if (!request) return null` guard is necessary
  // because the parent keeps the sheet mounted with `visible` driven
  // by the `editingRequest !== null` check.
  if (!request) return null;

  async function handleSave() {
    if (!studentUid) {
      setError("You need to be signed in to save changes.");
      return;
    }
    if (!request) return;
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const repo = getEnrollmentRepository();
      await repo.updateEnrollmentRequest({
        studentUid,
        tutorUid: request.tutorUid,
        requestId: request.requestId,
        schedule: trimmedSchedule,
        startDate,
        endDate,
        message: message.trim(),
      });
      onSaved();
    } catch (err) {
      console.warn("EditRequestSheet: update failed", err);
      if (err instanceof RequestAlreadyDecidedError) {
        setError(
          "This request was already accepted or declined. We'll refresh the list.",
        );
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Couldn't save changes. Try again.",
        );
      }
      setSubmitting(false);
    }
  }

  function handleRemove() {
    if (!studentUid) return;
    if (removing || submitting) return;
    Alert.alert(
      "Remove this request?",
      "The tutor will no longer see this request. You can always send a new one later.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => void doRemove(),
        },
      ],
    );
  }

  async function doRemove() {
    if (!studentUid) return;
    if (!request) return;
    setRemoving(true);
    setError(null);
    try {
      const repo = getEnrollmentRepository();
      await repo.deleteEnrollmentRequest(
        studentUid,
        request.tutorUid,
        request.requestId,
      );
      onRemoved();
    } catch (err) {
      console.warn("EditRequestSheet: remove failed", err);
      if (err instanceof RequestAlreadyDecidedError) {
        setError(
          "This request was already accepted or declined. We'll refresh the list.",
        );
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Couldn't remove the request. Try again.",
        );
      }
      setRemoving(false);
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
                Edit request
              </Text>
              <Text className="text-caption text-text-muted mt-1">
                Update your request to {tutor.name.split(" ")[0]}. The tutor
                sees the most recent version.
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onClose}
              className="w-9 h-9 rounded-pill bg-surface border border-border items-center justify-center"
              disabled={submitting || removing}
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
            contentContainerStyle={{ paddingBottom: 24 + insets.bottom }}
          >
            {/* Subjects (read-only context) */}
            {tutor.subjects.length > 0 ? (
              <View className="flex-row gap-1.5 flex-wrap mb-4">
                {tutor.subjects.map((s) => (
                  <View
                    key={s}
                    className="px-2 py-1 rounded-sm bg-sand"
                  >
                    <Text className="text-micro text-text-secondary font-medium">
                      {s}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

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
              editable={!submitting && !removing}
            />

            {/* Dates */}
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
                      const d = new Date(iso);
                      d.setUTCDate(d.getUTCDate() + 30);
                      setEndDate(d.toISOString().slice(0, 10));
                    }
                  }}
                  // Pending requests already have a start date in
                  // the past (the student's already been waiting),
                  // so we don't gate by today — the tutor reads
                  // whatever the student typed.
                  minIso={undefined}
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
                  minIso={startDate || undefined}
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
              editable={!submitting && !removing}
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

            {/* Save */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Save changes"
              onPress={handleSave}
              disabled={!canSubmit || !isDirty}
              className={`mt-5 h-12 rounded-card items-center justify-center flex-row gap-2 ${
                canSubmit && isDirty
                  ? "bg-accent active:opacity-80"
                  : "bg-surface-muted"
              }`}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons
                    name="save-outline"
                    size={16}
                    color={
                      canSubmit && isDirty ? "#FFFFFF" : colors.text.muted
                    }
                  />
                  <Text
                    className={`text-button font-semibold ${
                      canSubmit && isDirty
                        ? "text-text-inverse"
                        : "text-text-muted"
                    }`}
                  >
                    {isDirty ? "Save changes" : "No changes yet"}
                  </Text>
                </>
              )}
            </Pressable>

            {/* Remove — secondary, destructive */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Remove request"
              onPress={handleRemove}
              disabled={submitting || removing}
              className="mt-3 h-12 rounded-card items-center justify-center flex-row gap-2 bg-surface border border-danger/30 active:opacity-80"
            >
              {removing ? (
                <ActivityIndicator size="small" color="#C1503D" />
              ) : (
                <>
                  <Ionicons
                    name="trash-outline"
                    size={16}
                    color={colors.semantic.danger}
                  />
                  <Text className="text-button font-medium text-danger">
                    Remove request
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
