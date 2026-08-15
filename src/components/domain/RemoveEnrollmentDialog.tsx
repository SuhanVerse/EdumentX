/**
 * EdumentX — Remove Enrollment Dialog
 *
 * A small wrapper around the existing `ConfirmDialog` that adds a
 * required textarea for the removal reason. The reason is captured
 * locally (parent owns `reason` state) and passed to the
 * `removeEnrollment` repository call. The Confirm button is
 * disabled when the reason is empty.
 *
 * `RemoveEnrollmentDialog` is screen-scoped — the confirmation flow
 * lives inline in `tutor_home.tsx` (the dashboard's active-students
 * row) and in `tutor_capacity.tsx`. This component is the
 * "shared parts" extraction so the two call sites stay in sync.
 */

import { useState } from "react";
import { Text, TextInput, View } from "react-native";

import { ConfirmDialog } from "@/components/forms/ConfirmDialog";

export type RemoveEnrollmentDialogProps = {
  visible: boolean;
  studentName: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  loading?: boolean;
};

export function RemoveEnrollmentDialog({
  visible,
  studentName,
  onConfirm,
  onCancel,
  loading,
}: RemoveEnrollmentDialogProps) {
  const [reason, setReason] = useState("");

  // Reset the reason on cancel so the next open doesn't carry over
  // stale text. Done on every cancel/close, not on confirm, because
  // the parent closes the dialog after the confirm handler
  // resolves.
  function handleCancel() {
    setReason("");
    onCancel();
  }

  function handleConfirm() {
    if (reason.trim().length === 0) return;
    onConfirm(reason.trim());
    setReason("");
  }

  return (
    <ConfirmDialog
      visible={visible}
      title={`Remove ${studentName}?`}
      message={
        <View>
          <Text className="text-body text-text-secondary text-center">
            The student will be notified and their slot will reopen. This
            can&apos;t be undone.
          </Text>
          <View className="mt-3">
            <Text className="text-label text-text-muted mb-1.5 uppercase tracking-wider">
              Reason
            </Text>
            <TextInput
              accessibilityLabel="Removal reason"
              value={reason}
              onChangeText={setReason}
              placeholder="e.g. Class ended early"
              placeholderTextColor="#6B7268"
              multiline
              numberOfLines={3}
              className="bg-background border border-border rounded-md px-3 py-2 text-body text-text-primary"
              editable={!loading}
              style={{ minHeight: 76, textAlignVertical: "top" }}
            />
          </View>
        </View>
      }
      confirmLabel={loading ? "Removing…" : "Remove student"}
      cancelLabel="Cancel"
      destructive
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  );
}
