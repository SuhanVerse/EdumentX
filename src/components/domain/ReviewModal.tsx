/**
 * EdumentX — Review Modal (S-14 Figma upgrade)
 *
 * Bottom-sheet modal that captures a student's review of a tutor.
 * Matches the Figma "Rate & Review" screen:
 *   - Tutor identity card (avatar, name, subjects, sessions pill)
 *   - Locked state when the student has fewer than 2 confirmed
 *     sessions with this tutor
 *   - Five required dimensions (Teaching, Punctuality,
 *     Communication, Knowledge, Overall), each with help text
 *   - Written review — min 30 chars, max 500, live counter
 *   - Optional tag pills ("Very clear explanations", …)
 *   - Optional photo (expo-image-picker → Supabase public bucket)
 *   - Success screen with a Verified Enrollment pill
 *
 * On submit, calls `ReviewRepository.submitReview` which writes the
 * review + atomically aggregates the tutor's rating counters via
 * `runTransaction` (see `FirebaseReviewRepository.submitReview`).
 * `tags` / `photoUrl` are optional fields persisted on the review
 * doc (the create rule only gates tutorUid / studentUid / status).
 */

import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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
import { uploadReviewPhoto } from "@/services/supabase/storage";
import type { CategoryRatings } from "@/lib/tutor/types";

const REVIEW_MIN = 30;
const REVIEW_MAX = 500;

const DIMENSIONS: {
  key: keyof CategoryRatings;
  label: string;
  help: string;
}[] = [
  {
    key: "teaching",
    label: "Teaching Quality",
    help: "Clarity, structure, and depth of explanations",
  },
  {
    key: "punctuality",
    label: "Punctuality",
    help: "Showed up on time and stayed for the full session",
  },
  {
    key: "communication",
    label: "Communication",
    help: "Responsiveness and patience with questions",
  },
  {
    key: "knowledge",
    label: "Subject Knowledge",
    help: "Mastery of the subject and exam patterns",
  },
  {
    key: "overall",
    label: "Overall Experience",
    help: "How would you sum up the experience?",
  },
];

const TAGS = [
  "Very clear explanations",
  "Patient with questions",
  "Always on time",
  "Great for exam prep",
  "Affordable",
  "Good for beginners",
];

type Props = {
  visible: boolean;
  tutorUid: string;
  tutorName: string;
  /** Optional display extras for the identity card. */
  tutorAvatar?: string | null;
  subjects?: string[];
  /** Number of confirmed sessions the student has with this tutor.
   *  Below 2, the review form is locked (Figma S-14 gate). */
  sessionsCompleted?: number;
  onClose: () => void;
  onSubmitted: () => void;
};

export function ReviewModal({
  visible,
  tutorUid,
  tutorName,
  tutorAvatar,
  subjects = [],
  sessionsCompleted = 0,
  onClose,
  onSubmitted,
}: Props) {
  const studentUid = useAuthStore((s) => s.user?.uid ?? null);
  const studentName = useAuthStore((s) => s.user?.displayName ?? "");
  const studentAvatar = useAuthStore((s) => s.user?.photoURL ?? null);

  const locked = sessionsCompleted < 2;

  const [ratings, setRatings] = useState<CategoryRatings>({
    teaching: 0,
    punctuality: 0,
    communication: 0,
    knowledge: 0,
    overall: 0,
  });
  const [comment, setComment] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allRated = useMemo(
    () => Object.values(ratings).every((r) => r > 0),
    [ratings],
  );
  const commentValid = comment.length >= REVIEW_MIN && comment.length <= REVIEW_MAX;
  const canSubmit =
    !submitting && !locked && allRated && commentValid && !!studentUid;

  // Reset every time the sheet opens.
  React.useEffect(() => {
    if (!visible) return;
    setRatings({ teaching: 0, punctuality: 0, communication: 0, knowledge: 0, overall: 0 });
    setComment("");
    setTags([]);
    setPhotoUri(null);
    setError(null);
    setSubmitting(false);
    setSubmitted(false);
  }, [visible]);

  function setAxis(key: keyof CategoryRatings, value: number) {
    setRatings((prev) => ({ ...prev, [key]: value }));
  }

  function toggleTag(tag: string) {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  async function pickPhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        "Photo access needed",
        "Allow photo access to attach a picture to your review.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  }

  async function handleSubmit() {
    if (!canSubmit || !studentUid) return;
    setSubmitting(true);
    setError(null);
    try {
      // Optional photo — upload first; if the bucket is unreachable we
      // degrade gracefully and submit the review without a photo.
      let photoUrl: string | null = null;
      if (photoUri) {
        try {
          const up = await uploadReviewPhoto(tutorUid, photoUri);
          photoUrl = up.publicUrl;
        } catch (err) {
          console.warn("ReviewModal: photo upload skipped", err);
        }
      }

      const repo = getReviewRepository();
      await repo.submitReview({
        tutorUid,
        studentUid,
        studentName,
        studentAvatar,
        score: ratings.overall,
        categoryRatings: ratings,
        comment: comment.trim(),
        tags,
        photoUrl,
      });
      setSubmitted(true);
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
        <View className="bg-background rounded-t-3xl max-h-[92%]">
          <View className="items-center pt-2 pb-1">
            <View className="w-10 h-1 rounded-pill bg-border" />
          </View>

          {submitted ? (
            /* ── Success screen ── */
            <View className="px-6 pt-6 pb-10 items-center">
              <View className="w-20 h-20 rounded-pill bg-verification-light items-center justify-center mb-5">
                <Ionicons name="checkmark-circle" size={44} color={colors.brand.verification} />
              </View>
              <Text className="text-screen-title font-medium text-text-primary text-center">
                Review submitted
              </Text>
              <View className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-pill bg-verification-light mt-4">
                <Ionicons name="shield-checkmark" size={13} color={colors.brand.verification} />
                <Text className="text-caption text-success font-medium">
                  Verified Enrollment
                </Text>
              </View>
              <Text className="text-body text-text-secondary text-center mt-4 max-w-[320px]">
                Thanks for sharing honest feedback — it helps other students
                make confident choices.
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Back to enrollments"
                onPress={() => {
                  setSubmitted(false);
                  onSubmitted();
                }}
                className="w-full h-btn mt-8 rounded-card bg-primary items-center justify-center active:opacity-80"
              >
                <Text className="text-button font-semibold text-white">
                  Back to enrollments
                </Text>
              </Pressable>
            </View>
          ) : (
            <>
              {/* Header */}
              <View className="px-5 pt-2 pb-3 flex-row items-start justify-between">
                <View className="flex-1 min-w-0">
                  <Text className="text-section-title font-semibold text-text-primary">
                    Rate &amp; review
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
                contentContainerStyle={{ paddingBottom: 28 }}
              >
                {/* Tutor identity card */}
                <View className="flex-row items-center gap-3 bg-surface border border-border rounded-card p-3.5 mb-4">
                  <View className="w-14 h-14 rounded-pill bg-surface-muted border border-border items-center justify-center overflow-hidden">
                    {tutorAvatar ? (
                      <Image
                        source={{ uri: tutorAvatar }}
                        className="w-full h-full"
                      />
                    ) : (
                      <Ionicons name="person-outline" size={22} color={colors.text.muted} />
                    )}
                  </View>
                  <View className="flex-1 min-w-0">
                    <Text className="text-card-title font-medium text-text-primary" numberOfLines={1}>
                      {tutorName}
                    </Text>
                    {subjects.length > 0 && (
                      <Text className="text-caption text-text-muted mt-0.5" numberOfLines={1}>
                        {subjects.slice(0, 3).join(" · ")}
                      </Text>
                    )}
                    <View className="flex-row items-center gap-1 px-2 py-0.5 rounded-pill bg-verification-light self-start mt-1.5">
                      <Ionicons name="shield-checkmark" size={11} color={colors.brand.verification} />
                      <Text className="text-micro text-success font-medium">
                        {sessionsCompleted} sessions · Verified Enrollment
                      </Text>
                    </View>
                  </View>
                </View>

                {locked ? (
                  /* ── Locked state ── */
                  <View className="bg-warning-bg border border-warning/40 rounded-card p-5 items-center">
                    <View className="w-12 h-12 rounded-pill bg-warning items-center justify-center mb-3">
                      <Ionicons name="lock-closed" size={20} color="#FFFFFF" />
                    </View>
                    <Text className="text-card-title font-medium text-warning-text text-center">
                      Review locked
                    </Text>
                    <Text className="text-body-sm text-warning-text text-center mt-1.5 leading-5">
                      You can submit a review after completing at least 2
                      confirmed sessions with this tutor.
                    </Text>
                  </View>
                ) : (
                  <>
                    {/* Multi-dimensional ratings */}
                    <View className="bg-surface border border-border rounded-card p-4 mb-4">
                      <Text className="text-card-title font-medium text-text-primary mb-0.5">
                        Rate each dimension
                      </Text>
                      <Text className="text-caption text-text-muted mb-3">
                        All five required · 1 to 5 stars
                      </Text>
                      {DIMENSIONS.map((d, i) => (
                        <View
                          key={d.key}
                          className={`py-3 ${i < DIMENSIONS.length - 1 ? "border-b border-border" : ""} ${i === 0 ? "pt-0" : ""} ${i === DIMENSIONS.length - 1 ? "pb-0" : ""}`}
                        >
                          <View className="flex-row items-center justify-between gap-3">
                            <View className="flex-1 min-w-0">
                              <Text className="text-body-sm font-medium text-text-primary">
                                {d.label}
                              </Text>
                              <Text className="text-caption text-text-muted mt-0.5">
                                {d.help}
                              </Text>
                            </View>
                            <View className="flex-row items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map((n) => (
                                <Pressable
                                  key={n}
                                  accessibilityRole="button"
                                  accessibilityLabel={`${d.label} ${n}`}
                                  onPress={() => setAxis(d.key, n)}
                                  disabled={submitting}
                                  hitSlop={6}
                                >
                                  <Ionicons
                                    name={n <= ratings[d.key] ? "star" : "star-outline"}
                                    size={22}
                                    color={n <= ratings[d.key] ? colors.brand.accent : colors.text.muted}
                                  />
                                </Pressable>
                              ))}
                            </View>
                          </View>
                        </View>
                      ))}
                    </View>

                    {/* Written review */}
                    <View className="bg-surface border border-border rounded-card p-4 mb-4">
                      <Text className="text-card-title font-medium text-text-primary mb-0.5">
                        Write a review
                      </Text>
                      <Text className="text-caption text-text-muted mb-2.5">
                        Minimum {REVIEW_MIN} characters — share what worked and
                        what could improve.
                      </Text>
                      <TextInput
                        accessibilityLabel="Review text"
                        value={comment}
                        onChangeText={(t) => setComment(t.slice(0, REVIEW_MAX))}
                        placeholder="My tutor explained calculus step by step using real exam questions…"
                        placeholderTextColor={colors.text.muted}
                        multiline
                        className="min-h-[110px] bg-background border border-border rounded-card px-3.5 py-3 text-body text-text-primary"
                        editable={!submitting}
                      />
                      <View className="flex-row justify-between mt-1.5">
                        <Text
                          className={`text-micro font-medium ${
                            comment.length === 0
                              ? "text-text-muted"
                              : comment.length < REVIEW_MIN
                                ? "text-danger"
                                : "text-success"
                          }`}
                        >
                          {comment.length === 0
                            ? `${REVIEW_MIN} characters minimum`
                            : comment.length < REVIEW_MIN
                              ? `${REVIEW_MIN - comment.length} more characters needed`
                              : "Looks good"}
                        </Text>
                        <Text className="text-micro text-text-muted">
                          {comment.length}/{REVIEW_MAX}
                        </Text>
                      </View>
                    </View>

                    {/* Tags */}
                    <View className="bg-surface border border-border rounded-card p-4 mb-4">
                      <Text className="text-card-title font-medium text-text-primary mb-0.5">
                        What stood out? (optional)
                      </Text>
                      <Text className="text-caption text-text-muted mb-3">
                        Tap any that apply.
                      </Text>
                      <View className="flex-row flex-wrap gap-2">
                        {TAGS.map((t) => {
                          const on = tags.includes(t);
                          return (
                            <Pressable
                              key={t}
                              accessibilityRole="button"
                              accessibilityState={{ selected: on }}
                              onPress={() => toggleTag(t)}
                              disabled={submitting}
                              className={`px-3.5 py-2 rounded-pill border ${
                                on
                                  ? "bg-primary-light border-primary"
                                  : "bg-surface border-border"
                              }`}
                            >
                              <Text
                                className={`text-caption font-medium ${
                                  on ? "text-primary" : "text-text-secondary"
                                }`}
                              >
                                {t}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>

                    {/* Photo (optional) */}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Add a photo (optional)"
                      onPress={pickPhoto}
                      disabled={submitting}
                      className="flex-row items-center gap-2.5 bg-surface border border-dashed border-border rounded-card px-4 py-3.5 mb-4 active:opacity-80"
                    >
                      {photoUri ? (
                        <Image
                          source={{ uri: photoUri }}
                          className="w-9 h-9 rounded-card"
                        />
                      ) : (
                        <Ionicons name="camera-outline" size={18} color={colors.text.muted} />
                      )}
                      <Text className="text-body-sm text-text-secondary flex-1">
                        {photoUri ? "Photo attached — tap to change" : "Add a photo (optional)"}
                      </Text>
                      {photoUri ? (
                        <Ionicons name="checkmark-circle" size={18} color={colors.brand.verification} />
                      ) : null}
                    </Pressable>

                    {error ? (
                      <View className="flex-row items-center gap-2 bg-danger-bg border border-danger/30 rounded-card p-3 mb-4">
                        <Ionicons name="alert-circle-outline" size={16} color={colors.semantic.danger} />
                        <Text className="text-caption text-danger flex-1">{error}</Text>
                      </View>
                    ) : null}

                    {/* Submit */}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Submit review"
                      onPress={handleSubmit}
                      disabled={!canSubmit}
                      className={`h-12 rounded-card items-center justify-center flex-row gap-2 ${
                        canSubmit ? "bg-primary active:opacity-80" : "bg-surface-muted"
                      }`}
                    >
                      {submitting ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text
                          className={`text-button font-semibold ${
                            canSubmit ? "text-white" : "text-text-muted"
                          }`}
                        >
                          Submit review
                        </Text>
                      )}
                    </Pressable>
                  </>
                )}
              </ScrollView>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
