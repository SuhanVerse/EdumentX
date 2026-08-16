/**
 * EdumentX — Batch Detail (shared tutor / student)
 *
 * One screen, two views, driven by who is looking:
 *
 *   TUTOR (current user owns the batch):
 *     - Live batch doc + full member roster (the members
 *       subcollection is tutor-gated in firestore.rules).
 *     - Per-member Remove action — the full `removeEnrollment`
 *       cascade via the shared `RemoveEnrollmentDialog`: soft-delete
 *       the roster enrollment by direct path, decrement capacity,
 *       delete the batch member doc (member docs are keyed by
 *       `enrollmentId`), and notify the student. This is a strict
 *       superset of the old batch-only `removeBatchMember` — a
 *       student can never stay orphaned in the roster after being
 *       removed from a batch.
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

import { getApp } from "@react-native-firebase/app";
import { doc, getDoc, getFirestore } from "@react-native-firebase/firestore";

import { RemoveEnrollmentDialog } from "@/components/domain/RemoveEnrollmentDialog";
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
  // Full remove-student flow — same RemoveEnrollmentDialog as the
  // dashboard / capacity / inbox roster. `removeTarget` holds the
  // member row the tutor tapped; the dialog collects the reason and
  // `removeEnrollment` cascades to the roster + member docs.
  const [removeTarget, setRemoveTarget] = useState<BatchMember | null>(null);
  const [removing, setRemoving] = useState(false);
  // End-batch write in flight — disables the button + swaps in a
  // spinner so the destructive action gives feedback while the
  // batch doc flips to `ended`.
  const [ending, setEnding] = useState(false);

  const batchesRepo = useMemo(() => getBatchesRepository(), []);
  const enrollRepo = useMemo(() => getEnrollmentRepository(), []);

  // Batch doc — read by DIRECT PATH so ended batches still render
  // (the student marketplace feed filters to `active`, which made
  // any closed batch opened from My Enrollments show "not found").
  useEffect(() => {
    if (!tutorUid || !batchId) return;
    let disposed = false;
    const unsub = batchesRepo.subscribeBatch(
      tutorUid,
      batchId,
      (b) => {
        if (disposed) return;
        setBatch(b);
        setLoaded(true);
      },
      () => {
        if (!disposed) setLoaded(true);
      },
    );
    return () => {
      disposed = true;
      unsub();
    };
  }, [batchesRepo, tutorUid, batchId]);

  // Student-side tutor attribution — the direct-path batch doc
  // doesn't carry the tutor's display info (the marketplace feed
  // enriched it), so resolve it from the public tutor profile once.
  useEffect(() => {
    if (isTutor || !tutorUid) return;
    let cancelled = false;
    (async () => {
      try {
        const db = getFirestore(getApp());
        const snap = await getDoc(
          doc(db, "users", tutorUid, "tutorProfile", "default"),
        );
        const d = snap.data() as
          | { fullName?: unknown; photoUrl?: unknown }
          | undefined;
        if (cancelled) return;
        const name =
          typeof d?.fullName === "string" && d.fullName.length > 0
            ? d.fullName
            : `Tutor ${tutorUid.slice(0, 6)}`;
        const avatar =
          typeof d?.photoUrl === "string" && d.photoUrl.length > 0
            ? d.photoUrl
            : null;
        setBatch((cur) => (cur ? { ...cur, tutorName: name, tutorAvatar: avatar } : cur));
      } catch {
        // Non-tutor peer or unreadable — the attribution row is
        // optional; the card still renders without it.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isTutor, tutorUid]);

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
    // Name the students who keep their one-to-one slots so the
    // tutor can see exactly who remains on the roster after the
    // class closes. Ending a batch only hides it from the
    // marketplace — member enrollments stay `active`, their weekly
    // slots stay booked, and they keep counting toward capacity
    // until removed (via the roster remove flow) or expired.
    const memberNames = members.map((m) => m.studentName);
    const memberLine =
      memberNames.length === 0
        ? "There are no members in this batch right now."
        : `These students stay enrolled for one-to-one sessions and keep their weekly slots: ${memberNames.join(", ")}.`;
    Alert.alert(
      "End this batch?",
      `"${batch?.name ?? "This batch"}" will close. Students will no longer see it on the marketplace, and the \u201cRequest to join\u201d button disappears. ${memberLine}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "End batch",
          style: "destructive",
          onPress: () => {
            void doEndBatch();
          },
        },
      ],
    );
  }

  async function doEndBatch() {
    if (!tutorUid || !batchId || ending) return;
    setEnding(true);
    try {
      await batchesRepo.endBatch(tutorUid, batchId);
      // The batch doc flips to `ended` live and the button unmounts
      // (it only renders while `status === "active"`).
    } catch (err) {
      console.warn("BatchDetail: endBatch failed", err);
      Alert.alert(
        "Couldn't end batch",
        "We couldn't close this batch. Try again in a moment.",
      );
    } finally {
      setEnding(false);
    }
  }

  function handleRemove(member: BatchMember) {
    setRemoveTarget(member);
  }

  async function handleRemoveEnrollment(reason: string) {
    if (!tutorUid || !removeTarget || removing) return;
    setRemoving(true);
    try {
      // Member docs are keyed by `enrollmentId`, so the cascade
      // deletes this exact member doc + decrements memberCount as
      // part of the enrollment removal — no orphaned roster rows.
      await enrollRepo.removeEnrollment(
        tutorUid,
        removeTarget.enrollmentId,
        reason,
      );
      // The member + batch subscriptions re-emit and the row drops
      // off automatically; close the dialog on success.
      setRemoveTarget(null);
    } catch (err) {
      console.warn("BatchDetail: removeEnrollment failed", err);
      Alert.alert(
        "Couldn't remove",
        "We couldn't remove this student. Try again in a moment.",
      );
    } finally {
      setRemoving(false);
    }
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
              <View className="h-1.5 bg-sand rounded-pill overflow-hidden">
                <View
                  className={`h-full rounded-pill ${
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

            {/* ── Ended banner — ending a batch only hides it from
                the marketplace; member enrollments stay `active` and
                their weekly slots stay booked. The tutor sees the
                exact students who remain one-to-one; students see a
                count (the members subcollection is tutor-gated). ── */}
            {batch.status === "ended" && (
              <View className="bg-ai-light border border-ai-border rounded-card p-4">
                <View className="flex-row items-start gap-2.5">
                  <View className="w-8 h-8 rounded-pill bg-ai items-center justify-center">
                    <Ionicons
                      name="flag-outline"
                      size={16}
                      color={colors.text.inverse}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-card-title font-semibold text-text-primary">
                      Batch ended
                    </Text>
                    <Text className="text-body-sm text-text-secondary mt-0.5">
                      {isTutor
                        ? members.length === 0
                          ? "No students are enrolled — everyone was removed when the batch closed."
                          : "These students remain enrolled one-to-one and keep their weekly slots:"
                        : memberCount === 0
                          ? "This batch has ended — no students remain enrolled."
                          : `${memberCount} ${memberCount === 1 ? "student stays" : "students stay"} enrolled one-to-one with the tutor.`}
                    </Text>
                    {isTutor && members.length > 0 && (
                      <View className="flex-row flex-wrap gap-1.5 mt-2.5">
                        {members.map((member) => (
                          <View
                            key={member.memberId}
                            className="bg-surface border border-border rounded-pill px-2.5 py-1"
                          >
                            <Text className="text-micro text-text-primary">
                              {member.studentName}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              </View>
            )}

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
                            className="px-2.5 py-1.5 active:opacity-70"
                          >
                            <Text className="text-micro font-medium text-danger">
                              Remove
                            </Text>
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
                accessibilityLabel={
                  ending ? "Ending batch" : `End ${batch.name}`
                }
                accessibilityState={{ disabled: ending, busy: ending }}
                onPress={handleEndBatch}
                disabled={ending}
                className="min-h-btn rounded-card border border-danger/30 bg-danger/5 flex-row items-center justify-center gap-2 active:opacity-80 disabled:opacity-60"
              >
                {ending ? (
                  <ActivityIndicator size="small" color={colors.semantic.danger} />
                ) : (
                  <Ionicons
                    name="close-circle-outline"
                    size={18}
                    color={colors.semantic.danger}
                  />
                )}
                <Text className="text-button font-medium text-danger">
                  {ending ? "Ending…" : "End batch"}
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
      <RemoveEnrollmentDialog
        visible={removeTarget !== null}
        studentName={removeTarget?.studentName ?? ""}
        loading={removing}
        onConfirm={(reason) => void handleRemoveEnrollment(reason)}
        onCancel={() => setRemoveTarget(null)}
      />
    </ScreenLayout>
  );
}
