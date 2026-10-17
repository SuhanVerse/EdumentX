/**
 * EdumentX — Student Picker Sheet
 *
 * Bottom-sheet overlay used by the batch-creation flow. The parent
 * passes the tutor's ACTIVE enrollments (already filtered to
 * `status === "active"`) and the user picks 2–6 of them to seed the
 * new batch's initial member list.
 *
 * Empty state (tutor has no enrolled students): a friendly
 * illustration + "No students to add" + a back button. Hitting the
 * back button calls `onCancel`.
 *
 * Constraints (per plan §5):
 *   - min: 2 selections (smaller batches don't make sense)
 *   - max: 6 selections (the same cap on enrollment capacity)
 *   - selection toggling is reversible until the user taps Continue
 */

import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FloatingEmptyIcon } from "@/components/motion/FloatingEmptyIcon";
import { DiscoverIllustration } from "@/components/illustrations/DiscoverIllustration";
import { colors } from "@/constants/colors";

import type { Enrollment } from "@/services/enrollments/types";

export type StudentPickerSheetProps = {
  visible: boolean;
  enrolledStudents: readonly Enrollment[];
  selectedIds: ReadonlySet<string>;
  onToggle: (enrollmentId: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  minSelection?: number;
  maxSelection?: number;
};

export function StudentPickerSheet({
  visible,
  enrolledStudents,
  selectedIds,
  onToggle,
  onConfirm,
  onCancel,
  minSelection = 2,
  maxSelection = 6,
}: StudentPickerSheetProps) {
  const insets = useSafeAreaInsets();
  const hasStudents = enrolledStudents.length > 0;
  const count = selectedIds.size;
  const canContinue = count >= minSelection && count <= maxSelection;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <Pressable
        accessibilityLabel="Close student picker"
        onPress={onCancel}
        className="flex-1 bg-black/40 justify-end"
      >
        <Pressable
          onPress={() => {}}
          className="bg-surface rounded-t-xl pt-2.5 max-h-[85%]"
          style={{ paddingBottom: 12 + insets.bottom }}
          accessibilityLabel="Student picker"
        >
          {/* Handle */}
          <View className="items-center mb-3">
            <View className="w-10 h-1 rounded-pill bg-border" />
          </View>

          {/* Header */}
          <View className="flex-row items-center px-5 pb-3">
            <View className="flex-1">
              <Text className="text-section-title font-medium text-text-primary">
                Pick students
              </Text>
              <Text className="text-caption text-text-muted mt-0.5">
                Select {minSelection}–{maxSelection} enrolled students
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onCancel}
              className="w-9 h-9 items-center justify-center rounded-pill bg-sand active:opacity-70"
            >
              <Ionicons name="close" size={18} color={colors.text.muted} />
            </Pressable>
          </View>

          {hasStudents ? (
            <>
              <ScrollView
                className="px-5"
                style={{ maxHeight: 360 }}
                showsVerticalScrollIndicator={false}
              >
                {enrolledStudents.map((e) => (
                  <StudentRow
                    key={e.enrollmentId}
                    enrollment={e}
                    selected={selectedIds.has(e.enrollmentId)}
                    onToggle={() => onToggle(e.enrollmentId)}
                    disabled={
                      !selectedIds.has(e.enrollmentId) &&
                      selectedIds.size >= maxSelection
                    }
                  />
                ))}
              </ScrollView>

              <View className="px-5 pt-4 pb-6 border-t border-border bg-surface">
                <Text className="text-caption text-text-muted text-center mb-3">
                  {count} selected ·{" "}
                  {count < minSelection
                    ? `pick at least ${minSelection - count} more`
                    : count >= maxSelection
                      ? "maximum reached"
                      : "you can pick more"}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Continue"
                  onPress={onConfirm}
                  disabled={!canContinue}
                  className={`min-h-btn rounded-card flex-row items-center justify-center ${
                    canContinue ? "bg-ai active:opacity-90" : "bg-sand"
                  }`}
                >
                  <Text
                    className={`text-button font-semibold ${
                      canContinue ? "text-white" : "text-text-muted"
                    }`}
                  >
                    Continue
                  </Text>
                </Pressable>
              </View>
            </>
          ) : (
            <EmptyState onCancel={onCancel} />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function StudentRow({
  enrollment,
  selected,
  onToggle,
  disabled,
}: {
  enrollment: Enrollment;
  selected: boolean;
  onToggle: () => void;
  disabled: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected, disabled }}
      onPress={onToggle}
      disabled={disabled}
      className={`flex-row items-center gap-3 py-3 px-3 mb-1.5 rounded-md border active:opacity-80 ${
        selected
          ? "bg-ai-light border-ai"
          : "bg-surface border-border"
      } ${disabled ? "opacity-50" : ""}`}
    >
      <View
        className={`w-10 h-10 rounded-pill items-center justify-center ${
          selected ? "bg-ai" : "bg-surface-muted"
        }`}
      >
        <Text
          className={`text-card-title font-medium ${
            selected ? "text-white" : "text-text-muted"
          }`}
        >
          {(enrollment.studentName?.charAt(0) ?? "?").toUpperCase()}
        </Text>
      </View>
      <View className="flex-1 min-w-0">
        <Text
          className="text-card-title font-medium text-text-primary"
          numberOfLines={1}
        >
          {enrollment.studentName}
        </Text>
        <Text className="text-caption text-text-muted" numberOfLines={1}>
          {enrollment.studentGrade}
        </Text>
      </View>
      <View
        className={`w-6 h-6 rounded-pill items-center justify-center border-2 ${
          selected ? "bg-ai border-ai" : "border-border bg-surface"
        }`}
      >
        {selected ? <Ionicons name="checkmark" size={14} color={colors.text.inverse} /> : null}
      </View>
    </Pressable>
  );
}

function EmptyState({ onCancel }: { onCancel: () => void }) {
  return (
    <View className="px-5 pb-8 items-center">
      <View className="mb-2">
        <FloatingEmptyIcon
          iconName="calendar-outline"
          iconColor={colors.brand.accent}
          iconBgClass="bg-accent-soft"
          size={24}
          sizeClass="w-12 h-12"
        />
      </View>
      <View className="w-44 h-44">
        <DiscoverIllustration />
      </View>
      <Text className="text-card-title font-medium text-text-primary text-center mt-3">
        No students to add
      </Text>
      <Text className="text-body-sm text-text-secondary text-center mt-1.5">
        Batches are built from enrolled students. Once you accept a
        request, they&apos;ll show up here.
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        onPress={onCancel}
        className="mt-5 px-5 min-h-btn rounded-card bg-ai items-center justify-center active:opacity-90"
      >
        <Text className="text-button text-white font-semibold">Back</Text>
      </Pressable>
    </View>
  );
}
