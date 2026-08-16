/**
 * EdumentX — Enrolled Student Row
 *
 * One row in the tutor dashboard's "Active students" widget.
 * Avatar + name + slot summary + trailing trash button. The trash
 * button opens the `RemoveEnrollmentDialog` (managed by the
 * parent) — this row is purely presentational.
 *
 * The avatar guard mirrors the logic in `EnrollmentRequestCard`:
 * an empty / missing URI would crash `<Image>` on Android, so we
 * fall back to an initial-tinted tile.
 */

import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, Text, View } from "react-native";

import { colors } from "@/constants/colors";

export type EnrolledStudentRowProps = {
  enrollment: {
    enrollmentId: string;
    studentName: string;
    studentGrade: string;
    studentAvatar: string | null;
    subjects: string[];
    slotKey: string | null;
    startDate: string;
    endDate: string;
  };
  /** Optional `slotKey` formatter. The parent usually passes the
   *  shared `formatSlotKey` from `WeeklyAvailabilityGrid` so the
   *  row reads "Mon · 5–7 PM" instead of "mon:5-7". */
  formatSlotKey?: (slotKey: string) => string;
  onRemove: () => void;
  /** Pass `true` to render the row at lower opacity (e.g. while
   *  the remove confirmation is in flight). */
  pending?: boolean;
};

export function EnrolledStudentRow({
  enrollment,
  formatSlotKey,
  onRemove,
  pending,
}: EnrolledStudentRowProps) {
  const slot = enrollment.slotKey
    ? formatSlotKey
      ? formatSlotKey(enrollment.slotKey)
      : enrollment.slotKey
    : "—";

  return (
    <View
      className="flex-row items-center gap-3 bg-surface border border-border rounded-card px-3.5 py-3"
      style={{ opacity: pending ? 0.6 : 1 }}
    >
      <AvatarCircle uri={enrollment.studentAvatar} name={enrollment.studentName} />
      <View className="flex-1 min-w-0">
        <Text
          className="text-card-title font-medium text-text-primary"
          numberOfLines={1}
        >
          {enrollment.studentName}
        </Text>
        <Text
          className="text-caption text-text-muted"
          numberOfLines={1}
        >
          {enrollment.studentGrade} · {slot}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Remove ${enrollment.studentName}`}
        onPress={onRemove}
        disabled={pending}
        className="w-9 h-9 rounded-pill items-center justify-center bg-sand active:opacity-70 disabled:opacity-50"
      >
        <Ionicons name="trash-outline" size={16} color={colors.text.muted} />
      </Pressable>
    </View>
  );
}

type AvatarCircleProps = { uri?: string | null; name?: string };

function AvatarCircle({ uri, name }: AvatarCircleProps) {
  const hasImage = typeof uri === "string" && uri.length > 0;
  const initial = (name?.charAt(0) ?? "?").toUpperCase();
  if (!hasImage) {
    return (
      <View className="w-10 h-10 rounded-pill bg-surface-muted items-center justify-center">
        <Text className="text-card-title font-medium text-text-muted">{initial}</Text>
      </View>
    );
  }
  return (
    <Image
      source={{ uri: uri as string }}
      className="w-10 h-10 rounded-pill bg-surface-muted"
    />
  );
}
