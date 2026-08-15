/**
 * EdumentX — Batch Detail (shared tutor / student)
 *
 * One screen, two views, driven by who is looking:
 *
 *   TUTOR (current user owns the batch):
 *     - Live batch doc + full member roster (the members
 *       subcollection is tutor-gated in firestore.rules).
 *     - Per-member Remove action — writes via
 *       `BatchesRepository.removeBatchMember` (deletes the member
 *       doc + decrements the denormalized `memberCount`).
 *
 *   STUDENT (any other signed-in user):
 *     - Live batch doc via the public active-batches feed (the
 *       `{prefix=**}/classes` carve-out). Members are NOT readable
 *       by students, so the roster is replaced by the denormalized
 *       `memberCount` capacity meter + seats-left.
 *     - "Request to join" pushes the S-12 enrollment form with the
 *       batch id; if the student is already in an active enrollment
 *       for this batch, the CTA flips to a joined state.
 *
 * Route: `/batch/{tutorUid}/{batchId}`.
 */

import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  Text,
  View,
} from "react-native";

import { SeatsRing } from "@/components/domain/SeatsRing";
import {
  ScreenLayout,
  ScreenHeader,
  ScreenScroll,
} from "@/components/shared/ScreenLayout";
import { colors } from "@/constants/colors";
import { getBatchesRepository } from "@/services/batches/dataSource";
import { getEnrollmentRepository } from "@/services/enrollments/dataSource";
import {
  DAY_LABELS,
  MAX_BATCH_MEMBERS,
  parseSlotKey,
  TIME_SLOT_LABELS,
  type Batch,
  type BatchMember,
  type Enrollment,
} from "@/services/enrollments/types";
import { useAuthStore } from "@/store/authStore";

/** Format a `day:slot` key as a short schedule fragment. */
function formatSlotKey(key: string): string {
  const parsed = parseSlotKey(key);
  if (!parsed) return key;
  return `${DAY_LABELS[parsed.day]} ${TIME_SLOT_LABELS[parsed.slot]}`;
}

/** Join timestamps → "Aug 15" short label. */
function formatJoined(ts: number): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Epoch ms → "Aug 15, 2026" — when the tutor ended the batch. */
function formatEnded(ts: number): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function BatchDetailScreen() {
  const router = useRouter();
  const { tutorUid, batchId } = useLocalSearchParams<{
    tutorUid: string;
    batchId: string;
  }>();
  const user = useAuthStore((s) => s.user);
  const isTutor = !!tutorUid && !!user && user.uid === tutorUid;

  const [batch, setBatch] = useState<Batch | null>(null);
  const [loaded, setLoaded] = useState(false);
  // Tutor-only — students can't read the members subcollection.
  const [members, setMembers] = useState<BatchMember[]>([]);
  // Student-only — detect whether the viewer already joined.
  const [myEnrollments, setMyEnrollments] = useState<Enrollment[]>([]);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const batchesRepo = useMemo(() => getBatchesRepository(), []);
  const enrollRepo = useMemo(() => getEnrollmentRepository(), []);

  // Batch doc — the tutor reads their own list; the student reads
  // the public active-batches feed (enriched with tutor display).
  useEffect(() => {
    if (!tutorUid || !batchId) return;
    let disposed = false;
    const onData = (list: Batch[]) => {
      if (disposed) return;
      setBatch(list.find((b) => b.batchId === batchId) ?? null);
      setLoaded(true);
    };
    const onError = () => {
      if (!disposed) setLoaded(true);
    };
    const unsub = isTutor
      ? batchesRepo.subscribeBatches(tutorUid, onData, onError)
      : batchesRepo.subscribePublicBatches(onData, onError);
    return () => {
      disposed = true;
      unsub();
    };
  }, [batchesRepo, isTutor, tutorUid, batchId]);

  // Members — tutor only (rules gate the subcollection to the
  // owning tutor; students see memberCount on the batch doc).
  useEffect(() => {
    if (!isTutor || !tutorUid || !batchId) return;
    const unsub = batchesRepo.subscribeBatchMembers(
      tutorUid,
      batchId,
      setMembers,
      (err) => console.warn("BatchDetail: members failed", err),
    );
    return unsub;
  }, [batchesRepo, isTutor, tutorUid, batchId]);

  // Student side — own enrollments to detect the joined state.
  useEffect(() => {
    if (isTutor || !user?.uid) return;
    const unsub = enrollRepo.subscribeEnrollmentsByStudent(
      user.uid,
      setMyEnrollments,
      (err) => console.warn("BatchDetail: enrollments failed", err),
    );
    return unsub;
  }, [enrollRepo, isTutor, user?.uid]);

  const joined = useMemo(() => {
    if (!batchId) return false;
    return myEnrollments.some(
      (e) => e.batchId === batchId && e.status === "active",
    );
  }, [myEnrollments, batchId]);

  const memberCount = batch?.memberCount ?? members.length;
  const pct = Math.min(
    100,
    Math.round((memberCount / MAX_BATCH_MEMBERS) * 100),
  );
  const seatsLeft = Math.max(0, MAX_BATCH_MEMBERS - memberCount);

  function handleEndBatch() {
    if (!tutorUid || !batchId) return;
    Alert.alert(
      "End this batch?",
      `"${batch?.name ?? "This batch"}" will close. Students will no longer see it on the marketplace, and the \u201cRequest to join\u201d button disappears. Existing members stay enrolled for one-to-one sessions.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "End batch",
          style: "destructive",
          onPress: () => {
            batchesRepo
              .endBatch(tutorUid, batchId)
              .catch((err) =>
                console.warn("BatchDetail: endBatch failed", err),
              );
          },
        },
      ],
    );
  }

  function handleRemove(member: BatchMember) {
    Alert.alert(
      "Remove student from batch?",
      `${member.studentName} will leave "${batch?.name ?? "this batch"}". They stay enrolled for one-to-one sessions.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            if (!tutorUid || !batchId) return;
            setRemovingId(member.memberId);
            batchesRepo
              .removeBatchMember(tutorUid, batchId, member.memberId)
              .catch((err) =>
                console.warn("BatchDetail: removeBatchMember failed", err),
              )
              .finally(() => setRemovingId(null));
          },
        },
      ],
    );
  }

  return (
    <ScreenLayout variant="background">
      <ScreenHeader variant="light">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={12}
          onPress={() => router.back()}
          className="self-start flex-row items-center gap-1 min-h-touch"
        >
          <Ionicons
            name="chevron-back"
            size={18}
            color={colors.brand.primary}
          />
          <Text className="text-body text-text-primary">Back</Text>
        </Pressable>
        <View className="self-start border-b-2 border-accent pb-0.5 mt-1">
          <Text className="text-display text-text-primary">
            Batch details
          </Text>
        </View>
        <Text className="text-body text-text-secondary mt-0.5">
          {isTutor ? "Manage this group class" : "Group class on EdumentX"}
        </Text>
      </ScreenHeader>

      <ScreenScroll className="flex-1">
        {!loaded ? (
          <View className="items-center justify-center pt-16">
            <ActivityIndicator size="small" color={colors.brand.ai} />
            <Text className="text-caption text-text-muted mt-3">
              Loading batch…
            </Text>
          </View>
        ) : !batch ? (
          <View className="items-center justify-center pt-16 px-6">
            <View className="w-14 h-14 rounded-pill bg-ai-light items-center justify-center mb-3">
              <Ionicons name="people-outline" size={26} color={colors.brand.ai} />
            </View>
            <Text className="text-card-title font-medium text-text-primary text-center">
              Batch not found
            </Text>
            <Text className="text-body text-text-secondary text-center mt-1.5">
              {isTutor
                ? "This batch no longer exists."
                : "This batch may have ended or was removed."}
            </Text>
          </View>
        ) : (
          <View className="flex-col gap-3.5">
            {/* ── Overview card ── */}
            <View className="bg-surface border border-border rounded-card p-4">
              <View className="flex-row justify-between items-start mb-3">
                <View className="flex-1 pr-3">
                  <Text
                    className="text-section-title font-semibold text-text-primary"
                    numberOfLines={1}
                  >
                    {batch.name}
                  </Text>
                  <Text className="text-caption text-text-muted mt-1">
                    {batch.subject} · Rs{" "}
                    {batch.monthlyRateNpr.toLocaleString()}/student/mo
                  </Text>
                  {batch.status === "ended" && batch.endedAt ? (
                    <Text className="text-caption text-text-muted mt-0.5">
                      Ended {formatEnded(batch.endedAt)}
                    </Text>
                  ) : null}
                </View>
                <View
                  className={`px-2.5 py-1 rounded-pill ${
                    batch.status === "active"
                      ? "bg-ai-light"
                      : "bg-surface-muted"
                  }`}
                >
                  <Text
                    className={`text-micro font-medium ${
                      batch.status === "active" ? "text-ai" : "text-text-muted"
                    }`}
                  >
                    {batch.status === "active" ? "Active" : "Ended"}
                  </Text>
                </View>
              </View>

              {/* Schedule */}
              {batch.slotKeys.length > 0 ? (
                <View className="flex-row gap-1.5 flex-wrap mb-4">
                  {batch.slotKeys.map((slotKey) => (
                    <View
                      key={slotKey}
                      className="bg-background px-2.5 py-1 rounded-pill"
                    >
                      <Text className="text-micro text-text-secondary">
                        {formatSlotKey(slotKey)}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <View className="flex-row items-center gap-1.5 mb-4">
                  <Ionicons
                    name="calendar-outline"
                    size={12}
                    color={colors.text.muted}
                  />
                  <Text className="text-caption text-text-muted">
                    Starts {batch.startDate}
                  </Text>
                </View>
              )}

              {/* Capacity — the ring shows seats remaining, so the
                  text keeps just the fill fraction. */}
              <View className="flex-row items-center justify-between mb-1.5">
                <Text className="text-caption text-text-muted">
                  {isTutor ? "Students" : "Capacity"}
                </Text>
                <View className="flex-row items-center gap-2">
                  <Text className="text-caption font-medium text-text-primary">
                    {memberCount}/{MAX_BATCH_MEMBERS}
                    {!isTutor && (
                      <Text className="text-text-muted"> filled</Text>
                    )}
                  </Text>
                  <SeatsRing seatsLeft={seatsLeft} max={MAX_BATCH_MEMBERS} />
                </View>
              </View>
              <View className="h-1.5 bg-sand rounded-full overflow-hidden">
                <View
                  className={`h-full rounded-full ${
                    pct >= 80 ? "bg-accent" : "bg-verification"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </View>

              {/* Tutor attribution for students */}
              {!isTutor && batch.tutorName && (
                <View className="flex-row items-center gap-2 mt-4">
                  <View className="w-7 h-7 rounded-pill bg-surface-muted items-center justify-center overflow-hidden">
                    {batch.tutorAvatar ? (
                      <Image
                        source={{ uri: batch.tutorAvatar }}
                        className="w-full h-full"
                      />
                    ) : (
                      <Ionicons
                        name="person"
                        size={14}
                        color={colors.text.muted}
                      />
                    )}
                  </View>
                  <Text className="text-body-sm font-medium text-text-primary">
                    with {batch.tutorName}
                  </Text>
                </View>
              )}
            </View>

            {/* ── Members (tutor) / seats (student) ── */}
            <View className="bg-surface border border-border rounded-card p-4">
              <Text className="text-card-title font-medium text-text-primary mb-3">
                {isTutor ? "Students in this batch" : "Who's in this batch"}
              </Text>

              {isTutor ? (
                members.length === 0 ? (
                  <Text className="text-caption text-text-muted">
                    No students joined yet — accept a batch-join request to
                    add them here.
                  </Text>
                ) : (
                  <View className="flex-col border-t border-border">
                    {members.map((member, i) => (
                      <View
                        key={member.memberId}
                        className={`flex-row items-center py-2.5 ${
                          i < members.length - 1 ? "border-b border-border" : ""
                        }`}
                      >
                        <View className="w-9 h-9 rounded-pill bg-ai-light border border-ai-border items-center justify-center overflow-hidden">
                          {member.studentAvatar ? (
                            <Image
                              source={{ uri: member.studentAvatar }}
                              className="w-full h-full"
                            />
                          ) : (
                            <Text className="text-button font-semibold text-ai">
                              {member.studentName.slice(0, 1)}
                            </Text>
                          )}
                        </View>
                        <View className="flex-1 ml-3 min-w-0">
                          <Text
                            className="text-body font-medium text-text-primary"
                            numberOfLines={1}
                          >
                            {member.studentName}
                          </Text>
                          <Text className="text-micro text-text-muted">
                            Joined {formatJoined(member.joinedAt) || "recently"}
                          </Text>
                        </View>
                        {batch.status === "active" && (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Remove ${member.studentName} from batch`}
                            onPress={() => handleRemove(member)}
                            disabled={removingId === member.memberId}
                            className="px-2.5 py-1.5 active:opacity-70"
                          >
                            {removingId === member.memberId ? (
                              <ActivityIndicator size="small" color="#C0392B" />
                            ) : (
                              <Text className="text-micro font-medium text-danger">
                                Remove
                              </Text>
                            )}
                          </Pressable>
                        )}
                      </View>
                    ))}
                  </View>
                )
              ) : (
                <>
                  <Text className="text-body text-text-secondary">
                    {memberCount} of {MAX_BATCH_MEMBERS} seats filled. Students
                    see this batch on the marketplace while seats are open.
                  </Text>
                  {joined && (
                    <View className="flex-row items-center gap-2 mt-3 bg-verification/10 border border-verification/30 rounded-md px-3 py-2.5">
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color={colors.semantic.success}
                      />
                      <Text className="text-body-sm font-medium text-verification">
                        You&apos;re in this batch
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>

            {/* ── Tutor: end batch (destructive) ── */}
            {isTutor && batch.status === "active" && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`End ${batch.name}`}
                onPress={handleEndBatch}
                className="min-h-btn rounded-card border border-danger/30 bg-danger/5 flex-row items-center justify-center gap-2 active:opacity-80"
              >
                <Ionicons
                  name="close-circle-outline"
                  size={18}
                  color={colors.semantic.danger}
                />
                <Text className="text-button font-medium text-danger">
                  End batch
                </Text>
              </Pressable>
            )}

            {/* ── Student CTA — seats on the button, disabled when
                full (the enrollment form blocks the request too, but
                the tutor should never be sent there to be turned
                away). ── */}
            {!isTutor && !joined &&
              (seatsLeft > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Request to join ${batch.subject} batch — ${seatsLeft} ${seatsLeft === 1 ? "seat" : "seats"} left`}
                  onPress={() =>
                    router.push({
                      pathname: "/enroll",
                      params: {
                        tutorId: batch.tutorUid,
                        batchId: batch.batchId,
                      },
                    } as never)
                  }
                  className="min-h-btn rounded-card bg-accent flex-row items-center justify-center gap-2 active:opacity-80"
                >
                  <Text className="text-button font-semibold text-white">
                    Request to join
                  </Text>
                  <View className="px-2 py-0.5 rounded-pill bg-white/20">
                    <Text className="text-micro font-semibold text-white">
                      {seatsLeft} {seatsLeft === 1 ? "seat" : "seats"} left
                    </Text>
                  </View>
                </Pressable>
              ) : (
                <View className="min-h-btn rounded-card bg-surface-muted border border-border flex-row items-center justify-center gap-2">
                  <Ionicons name="lock-closed" size={16} color={colors.text.muted} />
                  <Text className="text-button font-medium text-text-muted">
                    Batch full
                  </Text>
                </View>
              ))}
          </View>
        )}
      </ScreenScroll>
    </ScreenLayout>
  );
}
