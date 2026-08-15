/**
 * EdumentX — Review Modal
 *
 * Bottom-sheet modal that captures a student's review of a tutor.
 * Surfaces:
 *   - 5-star overall rating picker (required)
 *   - 4 sub-axis sliders: Teaching, Punctuality, Communication,
 *     Knowledge (each 1–5)
 *   - Free-text comment (optional, max 500 chars)
 *   - Submit button
 *
 * On submit, calls `ReviewRepository.submitReview` which writes the
 * review + atomically aggregates the tutor's rating counters via
 * `runTransaction` (see `FirebaseReviewRepository.submitReview`).
 */

import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
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
import { getReviewRepository } from "@/services/enrollments/reviewDataSource";
import type { CategoryRatings } from "@/lib/tutor/types";

const COMMENT_MAX = 500;

const SUB_AXES: { key: keyof CategoryRatings; label: string }[] = [
  { key: "teaching", label: "Teaching" },
  { key: "punctuality", label: "Punctuality" },
  { key: "communication", label: "Communication" },
  { key: "knowledge", label: "Knowledge" },
];

type Props = {
  visible: boolean;
  tutorUid: string;
  tutorName: string;
  onClose: () => void;
  onSubmitted: () => void;
};

export function ReviewModal({
  visible,
  tutorUid,
  tutorName,
  onClose,
  onSubmitted,
}: Props) {
  const studentUid = useAuthStore((s) => s.user?.uid ?? null);
  const studentName = useAuthStore((s) => s.user?.displayName ?? "");
  const studentAvatar = useAuthStore((s) => s.user?.photoURL ?? null);

  const [score, setScore] = useState(0);
  const [categoryRatings, setCategoryRatings] = useState<CategoryRatings>({
    teaching: 0,
    punctuality: 0,
    communication: 0,
    knowledge: 0,
    overall: 0,
  });
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    if (submitting) return false;
    if (!studentUid) return false;
    if (score < 1 || score > 5) return false;
    // Sub-axes default to 0 if untouched; that's a valid choice
    // (we still capture the overall). We do require the user to
    // either rate the sub-axes OR leave them alone — they don't
    // have to touch every slider.
    return true;
  }, [submitting, studentUid, score]);

  function setSubAxis(key: keyof CategoryRatings, value: number) {
    setCategoryRatings((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const repo = getReviewRepository();
      await repo.submitReview({
        tutorUid,
        studentUid: studentUid!,
        studentName,
        studentAvatar,
        score,
        categoryRatings: { ...categoryRatings, overall: score },
        comment: comment.trim(),
      });
      onSubmitted();
    } catch (err) {
      console.warn("ReviewModal: submitReview failed", err);
      setError(
        err instanceof Error
          ? err.message
          : "Couldn't submit your review. Try again.",
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
          <View className="items-center pt-2 pb-1">
            <View className="w-10 h-1 rounded-pill bg-border" />
          </View>

          <View className="px-5 pt-2 pb-3 flex-row items-start justify-between">
            <View className="flex-1 min-w-0">
              <Text className="text-section-title font-semibold text-text-primary">
                Rate & review
              </Text>
              <Text className="text-caption text-text-muted mt-1">
                How was your experience with {tutorName.split(" ")[0]}?
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onClose}
              className="w-9 h-9 rounded-pill bg-surface border border-border items-center justify-center"
              disabled={submitting}
            >
              <Ionicons name="close" size={18} color={colors.text.muted} />
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            className="px-5"
            contentContainerStyle={{ paddingBottom: 24 }}
          >
            {/* Overall stars */}
            <Text className="text-card-title font-medium text-text-primary mb-2">
              Overall rating
            </Text>
            <View className="flex-row items-center gap-2 mb-4">
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable
                  key={n}
                  accessibilityRole="button"
                  accessibilityLabel={`${n} star${n > 1 ? "s" : ""}`}
                  onPress={() => setScore(n)}
                  disabled={submitting}
                  className="p-1"
                >
                  <Ionicons
                    name={n <= score ? "star" : "star-outline"}
                    size={32}
                    color={
                      n <= score ? colors.brand.accent : colors.text.muted
                    }
                  />
                </Pressable>
              ))}
              {score > 0 ? (
                <Text className="text-caption text-text-muted ml-1">
                  {score}/5
                </Text>
              ) : (
                <Text className="text-caption text-text-muted ml-1">
                  Tap a star
                </Text>
              )}
            </View>

            {/* Sub-axis sliders */}
            <Text className="text-card-title font-medium text-text-primary mt-2 mb-2">
              Sub-scores (optional)
            </Text>
            <View className="bg-surface border border-border rounded-card p-3 gap-3 mb-4">
              {SUB_AXES.map(({ key, label }) => (
                <SubAxisRow
                  key={key}
                  label={label}
                  value={categoryRatings[key]}
                  onChange={(v) => setSubAxis(key, v)}
                  disabled={submitting}
                />
              ))}
            </View>

            {/* Comment */}
            <Text className="text-card-title font-medium text-text-primary mb-2">
              Comment (optional)
            </Text>
            <TextInput
              accessibilityLabel="Comment"
              value={comment}
              onChangeText={setComment}
              placeholder="Share what you liked or what could be better…"
              placeholderTextColor={colors.text.muted}
              multiline
              maxLength={COMMENT_MAX}
              className="min-h-[100px] bg-surface border border-border rounded-card px-4 py-3 text-body text-text-primary"
              editable={!submitting}
            />
            <Text className="text-micro text-text-muted mt-1 self-end">
              {comment.length}/{COMMENT_MAX}
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

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Submit review"
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
                <Text
                  className={`text-button font-semibold ${
                    canSubmit ? "text-text-inverse" : "text-text-muted"
                  }`}
                >
                  Submit review
                </Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function SubAxisRow({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  disabled: boolean;
}) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-body-sm text-text-secondary flex-1">{label}</Text>
      <View className="flex-row items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable
            key={n}
            accessibilityRole="button"
            accessibilityLabel={`${label} ${n}`}
            onPress={() => onChange(n)}
            disabled={disabled}
            hitSlop={6}
          >
            <Ionicons
              name={n <= value ? "star" : "star-outline"}
              size={20}
              color={n <= value ? colors.brand.accent : colors.text.muted}
            />
          </Pressable>
        ))}
      </View>
    </View>
  );
}