/**
 * EdumentX — Tutor Enrollment Inbox
 *
 * Live Firestore wiring (Phase 6): subscribes to
 * `enrollmentRequests/{tutorUid}/requests` and renders each pending
 * request with the shared `EnrollmentRequestCard`. Decisions route
 * through the enrollment repository:
 *
 *   - Decline → `declineRequest(...)` — hard-deletes the request and
 *     writes a decline notification to the student. The row drops off
 *     the live subscription on the next snapshot.
 *   - Accept → a slot-picker sheet first. The enrollment model is
 *     slot-based: `acceptRequest` needs a concrete `slotKey` to book,
 *     and the request only carries free-text `schedule`. The picker
 *     shows the tutor's live weekly availability with booked cells
 *     marked so they can only pick an open slot. Confirm calls
 *     `acceptRequest(...)` — an atomic transaction that creates the
 *     enrollment, bumps capacity, flips the request to `accepted`,
 *     and notifies the student.
 *
 * Errors surface inline: `CapacityExceededError` and
 * `RequestAlreadyDecidedError` get friendly alerts and the live
 * subscription re-renders whatever the server actually persisted.
 */

import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/constants/colors";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { AvailabilityTimeList } from "@/components/domain/AvailabilityTimeList";
import { EnrollmentRequestCard } from "@/components/domain/EnrollmentRequestCard";
import { RemoveEnrollmentDialog } from "@/components/domain/RemoveEnrollmentDialog";
import { SeatsRing } from "@/components/domain/SeatsRing";
import { TutorBottomBar } from "@/components/domain/TutorBottomBar";
import { ActivePill } from "@/components/motion";
import {
  ScreenLayout,
  ScreenHeader,
  ScreenScroll,
} from "@/components/shared/ScreenLayout";
import { getBatchesRepository } from "@/services/batches/dataSource";
import { computeBookedMap } from "@/services/enrollments/derived";
import { getEnrollmentRepository } from "@/services/enrollments/dataSource";
import {
  BatchFullError,
  CapacityExceededError,
  DEFAULT_AVAILABILITY,
  DAY_LABELS,
  MAX_BATCH_MEMBERS,
  parseSlotKey,
  RequestAlreadyDecidedError,
  TIME_SLOT_LABELS,
  type Batch,
  type BatchMember,
  type Enrollment,
  type EnrollmentRequest,
  type WeeklyAvailability,
} from "@/services/enrollments/types";
import { useAuthStore } from "@/store/authStore";

/** Format a `day:slot` key as a short schedule fragment. */
function formatSlotKey(key: string): string {
  const parsed = parseSlotKey(key);
  if (!parsed) return key;
  return `${DAY_LABELS[parsed.day]} ${TIME_SLOT_LABELS[parsed.slot]}`;
}

/** "2026-08-15T..."-style join timestamps → "Aug 15" short label. */
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

export function EnrollmentInbox() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const tutorUid = user?.uid ?? null;
  const router = useRouter();
  const repo = getEnrollmentRepository();
  const batchesRepo = useMemo(() => getBatchesRepository(), []);

  // Live requests (pending + decided history). The UI filters to
  // pending so decided rows vanish from the list automatically.
  const [requests, setRequests] = useState<EnrollmentRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Collapse map — one flag per requestId. Defaults to expanded.
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // In-flight guard — blocks a second accept/decline while a write
  // is running (double-tap would issue two transactions).
  const [busyId, setBusyId] = useState<string | null>(null);

  // Slot-picker state. Accept needs a concrete weekly slot, which
  // the request doesn't carry — the tutor picks one here.
  const [slotPickerFor, setSlotPickerFor] =
    useState<EnrollmentRequest | null>(null);
  const [selectedSlotKey, setSelectedSlotKey] = useState<string | null>(null);

  // Live availability + booked map for the slot picker. Same three
  // subscriptions the capacity screen uses — the picker must only
  // offer slots that are actually open.
  const [availability, setAvailability] = useState<WeeklyAvailability | null>(
    null,
  );
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  // Per-batch member rosters, keyed by batchId — live so the tutor
  // sees who joined each class the moment a request is accepted.
  const [membersByBatch, setMembersByBatch] = useState<
    Record<string, BatchMember[]>
  >({});
  // Active / Ended tabs on the batch roster section — ended classes
  // stay viewable (the repo returns both; the tabs filter them).
  const [batchTab, setBatchTab] = useState<"active" | "ended">("active");
  const [batchTabsWidth, setBatchTabsWidth] = useState(0);

  // Full remove-student flow — same RemoveEnrollmentDialog as the
  // dashboard + capacity screens. The dialog collects a reason and
  // `removeEnrollment` soft-deletes the enrollment by direct path,
  // freeing the capacity slot and cascading to the batch member doc
  // via the roster's `batchId`.
  const [removeTarget, setRemoveTarget] = useState<BatchMember | null>(null);
  const [removing, setRemoving] = useState(false);
  const visibleBatches = useMemo(
    () => batches.filter((b) => b.status === batchTab),
    [batches, batchTab],
  );
  const bookedMap = useMemo(
    () => computeBookedMap(enrollments, batches),
    [enrollments, batches],
  );

  useEffect(() => {
    if (!tutorUid) {
      setLoading(false);
      return;
    }
    const unsub = repo.subscribeRequests(
      tutorUid,
      (list) => {
        setRequests(list);
        setLoading(false);
      },
      (err) => {
        console.warn("EnrollmentInbox: subscribeRequests failed", err);
        setLoading(false);
      },
    );
    return unsub;
  }, [tutorUid, repo]);

  useEffect(() => {
    if (!tutorUid) return;
    const unsub = repo.subscribeAvailability(
      tutorUid,
      (snap) => setAvailability(snap.availability ?? DEFAULT_AVAILABILITY),
      (err) => console.warn("EnrollmentInbox: availability failed", err),
    );
    return unsub;
  }, [tutorUid, repo]);

  useEffect(() => {
    if (!tutorUid) return;
    const unsub = repo.subscribeEnrollments(
      tutorUid,
      (list) => setEnrollments(list),
      (err) => console.warn("EnrollmentInbox: enrollments failed", err),
    );
    return unsub;
  }, [tutorUid, repo]);

  useEffect(() => {
    if (!tutorUid) return;
    const unsub = repo.subscribeBatches(
      tutorUid,
      (list) => setBatches(list),
      (err) => console.warn("EnrollmentInbox: batches failed", err),
    );
    return unsub;
  }, [tutorUid, repo]);

  // Per-batch member subscriptions — one live feed per batch
  // (active AND ended, so the Ended tab still shows who was in the
  // class; members stay readable after a batch closes — see
  // firestore.rules). Roster rows appear as soon as a session-code
  // join is accepted (the accept transaction writes the member doc
  // + bumps count).
  useEffect(() => {
    if (!tutorUid) return;
    const subs: (() => void)[] = [];
    for (const b of batches) {
      const unsub = batchesRepo.subscribeBatchMembers(
        tutorUid,
        b.batchId,
        (members) =>
          setMembersByBatch((prev) => ({ ...prev, [b.batchId]: members })),
        (err) =>
          console.warn(
            `EnrollmentInbox: members ${b.batchId} failed`,
            err,
          ),
      );
      subs.push(unsub);
    }
    return () => subs.forEach((u) => u());
  }, [tutorUid, batches, batchesRepo]);

  const pending = useMemo(
    () => requests.filter((r) => r.status === "pending"),
    [requests],
  );

  function toggleCollapsed(requestId: string) {
    setCollapsed((prev) => ({ ...prev, [requestId]: !prev[requestId] }));
  }

  // Accept opens the slot picker — the request carries no slotKey,
  // and booking into a specific weekly slot is what the enrollment
  // model requires.
  function handleAccept(req: EnrollmentRequest) {
    if (busyId) return;
    setSlotPickerFor(req);
    // Aug 25 UX: the student already picked slots in the request
    // (`pickedSlotKeys`, rendered on the card as the schedule line).
    // Preselect the first requested slot so manual approval is a
    // single confirm — the tutor can still switch before confirming.
    setSelectedSlotKey(req.pickedSlotKeys?.[0] ?? null);
  }

  async function confirmAccept() {
    const req = slotPickerFor;
    if (!req || !selectedSlotKey || busyId) return;
    if (!user) return;
    setBusyId(req.requestId);
    try {
      await repo.acceptRequest({
        tutorUid: req.tutorUid,
        authorUid: user.uid,
        requestId: req.requestId,
        student: {
          uid: req.studentUid,
          name: req.studentName,
          grade: req.studentGrade,
          avatar: req.studentAvatar,
        },
        subjects: req.subjects,
        slotKey: selectedSlotKey,
        startDate: req.startDate,
        endDate: req.endDate,
        // Session-code join requests carry the target batch — the
        // accept transaction adds the student to its members.
        batchId: req.batchId,
      });
      setSlotPickerFor(null);
      setSelectedSlotKey(null);
    } catch (err) {
      console.warn("EnrollmentInbox: acceptRequest failed", err);
      if (err instanceof CapacityExceededError) {
        Alert.alert("Capacity full", err.message);
      } else if (err instanceof BatchFullError) {
        Alert.alert(
          "Batch is full",
          err.message + " The request stays pending — you can decline it.",
        );
      } else if (err instanceof RequestAlreadyDecidedError) {
        Alert.alert(
          "Already decided",
          "This request was accepted or declined elsewhere. The list will refresh.",
        );
        setSlotPickerFor(null);
        setSelectedSlotKey(null);
      } else {
        Alert.alert(
          "Couldn't accept",
          err instanceof Error ? err.message : "Please try again.",
        );
      }
    } finally {
      setBusyId(null);
    }
  }

  function closePicker() {
    setSlotPickerFor(null);
    setSelectedSlotKey(null);
  }

  function handleDecline(req: EnrollmentRequest) {
    if (busyId) return;
    Alert.alert(
      "Decline request?",
      `${req.studentName}'s request will be removed and they'll be notified.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Decline",
          style: "destructive",
          onPress: () => {
            void doDecline(req);
          },
        },
      ],
    );
  }

  function handleRemoveMember(member: BatchMember) {
    setRemoveTarget(member);
  }

  async function handleRemoveEnrollment(reason: string) {
    if (!tutorUid || !removeTarget || removing) return;
    setRemoving(true);
    try {
      await repo.removeEnrollment(
        tutorUid,
        removeTarget.enrollmentId,
        reason,
      );
      // The member + roster subscriptions re-emit and the row drops
      // off automatically; close the dialog on success.
      setRemoveTarget(null);
    } catch (err) {
      console.warn("EnrollmentInbox: removeEnrollment failed", err);
      Alert.alert(
        "Couldn't remove",
        "We couldn't remove this student. Try again in a moment.",
      );
    } finally {
      setRemoving(false);
    }
  }

  async function doDecline(req: EnrollmentRequest) {
    if (busyId) return;
    setBusyId(req.requestId);
    try {
      await repo.declineRequest(
        req.tutorUid,
        req.requestId,
        req.studentUid,
        "Declined by the tutor.",
      );
      // The live subscription removes the row on the next snapshot.
    } catch (err) {
      console.warn("EnrollmentInbox: declineRequest failed", err);
      Alert.alert(
        "Couldn't decline",
        err instanceof Error ? err.message : "Please try again.",
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <ScreenLayout variant="surface">

      {/* Top app bar — standard light ScreenHeader slot */}
      <ScreenHeader variant="light">
        <View className="self-start border-b-2 border-accent pb-0.5">
          <Text className="text-display text-text-primary">
            Enrollment inbox
          </Text>
        </View>
        <Text className="text-body text-verification mt-0.5">
          {loading
            ? "Loading requests…"
            : `${pending.length} pending request${pending.length === 1 ? "" : "s"}`}
        </Text>
      </ScreenHeader>

      <ScreenScroll className="flex-1 bg-background">
        {loading ? (
          <View className="items-center justify-center pt-16">
            <ActivityIndicator size="small" color={colors.brand.primary} />
            <Text className="text-caption text-text-muted mt-3">
              Loading requests…
            </Text>
          </View>
        ) : pending.length === 0 ? (
          <View className="items-center justify-center pt-16 px-6">
            <View className="w-14 h-14 rounded-pill bg-accent-light items-center justify-center mb-3">
              <Ionicons name="mail-open-outline" size={26} color={colors.brand.accent} />
            </View>
            <Text className="text-card-title font-medium text-text-primary text-center">
              No pending requests
            </Text>
            <Text className="text-body text-text-secondary text-center mt-1.5">
              New enrollment requests from students will appear here.
            </Text>
          </View>
        ) : (
          <View className="flex-col gap-3.5">
            {pending.map((req) => (
              <EnrollmentRequestCard
                key={req.requestId}
                request={req}
                collapsed={!!collapsed[req.requestId]}
                accepting={busyId === req.requestId}
                onToggleCollapsed={() => toggleCollapsed(req.requestId)}
                onAccept={() => handleAccept(req)}
                onDecline={() => handleDecline(req)}
              />
            ))}
          </View>
        )}

        {/* ── Your batches — live member rosters so the tutor can
            see who joined each class and remove students. Active /
            Ended tabs keep closed classes viewable. ── */}
        <View className="mt-8">
          <Text className="text-section-title font-semibold text-text-primary mb-3">
            Your batches
          </Text>

          {/* Active / Ended segmented control */}
          <View
            className="flex-row bg-sand rounded-card relative h-11 overflow-hidden mb-4"
            onLayout={(e) => setBatchTabsWidth(e.nativeEvent.layout.width)}
          >
            {batchTabsWidth > 0 && (
              <ActivePill
                count={2}
                activeIndex={batchTab === "active" ? 0 : 1}
                itemWidth={batchTabsWidth / 2}
                pillClassName="absolute top-1 bottom-1 bg-primary rounded-lg"
                style={{ width: batchTabsWidth / 2, borderRadius: 10 }}
              />
            )}
            {(["active", "ended"] as const).map((t) => {
              const isActive = t === batchTab;
              const count = batches.filter((b) => b.status === t).length;
              return (
                <Pressable
                  key={t}
                  accessibilityRole="tab"
                  accessibilityLabel={`${t} batches`}
                  accessibilityState={{ selected: isActive }}
                  onPress={() => setBatchTab(t)}
                  className="flex-1 h-11 flex-row items-center justify-center gap-1.5 active:opacity-70 z-10"
                >
                  <Text
                    className={`text-sm font-medium ${
                      isActive ? "text-white" : "text-text-secondary"
                    }`}
                  >
                    {t === "active" ? "Active" : "Ended"}
                  </Text>
                  <View
                    className={`px-1.5 py-0.5 rounded-pill ${
                      isActive ? "bg-white/20" : "bg-surface"
                    }`}
                  >
                    <Text
                      className={`text-xs ${
                        isActive ? "text-white" : "text-text-muted"
                      }`}
                    >
                      {count}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {visibleBatches.length === 0 ? (
            <View className="bg-surface border border-border rounded-card p-6 items-center">
              <View className="w-12 h-12 rounded-pill bg-ai-light items-center justify-center mb-3">
                <Ionicons name="people-outline" size={22} color={colors.brand.ai} />
              </View>
              <Text className="text-card-title font-medium text-text-primary text-center">
                {batches.length === 0
                  ? "No batches yet"
                  : batchTab === "active"
                    ? "No active batches"
                    : "No ended batches yet"}
              </Text>
              <Text className="text-body text-text-secondary text-center mt-1.5">
                {batches.length === 0
                  ? "Students who join your private batches will appear here."
                  : batchTab === "active"
                    ? "Batches you create or accept join requests for show here."
                    : "Classes you end will appear here."}
              </Text>
            </View>
          ) : (
            <View className="flex-col gap-3.5">
              {visibleBatches.map((batch) => {
                const members = membersByBatch[batch.batchId] ?? [];
                return (
                  <Pressable
                    key={batch.batchId}
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${batch.name} details`}
                    onPress={() =>
                      router.push({
                        pathname: `/batch/${batch.tutorUid}/${batch.batchId}`,
                      } as never)
                    }
                    className="bg-surface border border-border rounded-card p-4 active:opacity-80"
                  >
                    {/* Header — active batches carry the same
                        seats-remaining ring as the student-facing
                        screens (live from the member subscription). */}
                    <View className="flex-row justify-between items-center mb-3">
                      <View className="flex-1 pr-3">
                        <Text className="text-card-title font-medium text-text-primary" numberOfLines={1}>
                          {batch.name}
                        </Text>
                        <Text className="text-caption text-text-muted mt-0.5">
                          {batch.subject} · Rs{" "}
                          {batch.monthlyRateNpr.toLocaleString()}
                          /student/mo
                        </Text>
                        {batch.status === "ended" && batch.endedAt ? (
                          <Text className="text-caption text-text-muted mt-0.5">
                            Ended {formatEnded(batch.endedAt)}
                          </Text>
                        ) : null}
                      </View>
                      {batch.status === "ended" ? (
                        <View className="px-2.5 py-1 rounded-pill bg-surface-muted">
                          <Text className="text-micro font-medium text-text-muted">
                            Ended
                          </Text>
                        </View>
                      ) : (
                        <View className="flex-row items-center gap-1.5">
                          <Text className="text-caption font-medium text-text-primary">
                            {members.length}/{MAX_BATCH_MEMBERS}
                          </Text>
                          <SeatsRing
                            seatsLeft={Math.max(
                              0,
                              MAX_BATCH_MEMBERS - members.length,
                            )}
                            max={MAX_BATCH_MEMBERS}
                          />
                        </View>
                      )}
                    </View>

                    {/* Schedule — occupancy dots mark who holds each
                        slot in the weekly grid (green = this batch,
                        amber = a 1-to-1 enrollment overlaps). */}
                    {batch.slotKeys.length > 0 && (
                      <View className="mb-3">
                        <View className="flex-row gap-1.5 flex-wrap">
                          {batch.slotKeys.map((slotKey) => {
                            const cell = bookedMap.get(slotKey);
                            const own =
                              batch.status === "active" &&
                              cell?.source === "batch" &&
                              cell.refId === batch.batchId;
                            const taken =
                              batch.status === "active" && !!cell && !own;
                            return (
                              <View
                                key={slotKey}
                                className={`flex-row items-center gap-1.5 px-2.5 py-1 rounded-pill ${
                                  batch.status === "active"
                                    ? own
                                      ? "bg-verification/10 border border-verification/30"
                                      : taken
                                        ? "bg-amber/10 border border-amber/30"
                                        : "bg-background"
                                    : "bg-background"
                                }`}
                              >
                                {batch.status === "active" && (
                                  <View
                                    className={`w-1.5 h-1.5 rounded-pill ${
                                      own
                                        ? "bg-verification"
                                        : taken
                                          ? "bg-amber"
                                          : "bg-border"
                                    }`}
                                  />
                                )}
                                <Text className="text-micro text-text-secondary">
                                  {formatSlotKey(slotKey)}
                                </Text>
                              </View>
                            );
                          })}
                        </View>
                        {batch.status === "active" && (
                          <View className="flex-row items-center gap-3 mt-1.5">
                            <View className="flex-row items-center gap-1">
                              <View className="w-1.5 h-1.5 rounded-pill bg-verification" />
                              <Text className="text-micro text-text-muted">
                                Batch slot
                              </Text>
                            </View>
                            <View className="flex-row items-center gap-1">
                              <View className="w-1.5 h-1.5 rounded-pill bg-amber" />
                              <Text className="text-micro text-text-muted">
                                Overlaps 1-to-1
                              </Text>
                            </View>
                          </View>
                        )}
                      </View>
                    )}

                    {/* Roster */}
                    {members.length === 0 ? (
                      <Text className="text-caption text-text-muted py-1">
                        {batch.status === "ended"
                          ? "This batch ended with no students."
                          : "No students joined yet — accept a batch-join request to add them here."}
                      </Text>
                    ) : (
                      <View className="flex-col border-t border-border">
                        {members.map((member, i) => (
                          <View
                            key={member.memberId}
                            className={`flex-row items-center py-2.5 ${
                              i < members.length - 1
                                ? "border-b border-border"
                                : ""
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
                                onPress={() => handleRemoveMember(member)}
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
                    )}
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </ScreenScroll>

      <RemoveEnrollmentDialog
        visible={removeTarget !== null}
        studentName={removeTarget?.studentName ?? ""}
        loading={removing}
        onConfirm={(reason) => void handleRemoveEnrollment(reason)}
        onCancel={() => setRemoveTarget(null)}
      />
      <TutorBottomBar inboxBadgeCount={pending.length} />

      {/* Slot picker — accept needs a concrete weekly slot to book.
          The grid shows live availability with booked cells disabled,
          so the tutor can only pick an open slot. */}
      <Modal
        visible={slotPickerFor !== null}
        transparent
        animationType="slide"
        onRequestClose={closePicker}
        statusBarTranslucent
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-surface rounded-t-xl max-h-[88%]">
            {/* Drag handle */}
            <View className="items-center pt-2 pb-1">
              <View className="w-10 h-1 rounded-pill bg-border" />
            </View>

            {/* Header */}
            <View className="px-5 pt-2 pb-3">
              <Text className="text-section-title font-semibold text-text-primary">
                Pick a slot
              </Text>
              <Text className="text-caption text-text-muted mt-1">
                Choose the weekly slot for{" "}
                {slotPickerFor?.studentName ?? "this student"}
                &apos;s enrollment. Booked slots are disabled.
              </Text>
            </View>

            <ScrollView
              className="px-5"
              style={{ maxHeight: 420 }}
              showsVerticalScrollIndicator={false}
            >
              <AvailabilityTimeList
                availability={availability}
                bookedMap={bookedMap}
                onSlotTap={setSelectedSlotKey}
                selectedSlotKey={selectedSlotKey}
              />
            </ScrollView>

            {/* Footer */}
            <View
              className="px-5 pt-4 border-t border-border"
              style={{ paddingBottom: 24 + insets.bottom }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Confirm slot and accept"
                onPress={() => {
                  void confirmAccept();
                }}
                disabled={!selectedSlotKey || busyId !== null}
                className={`min-h-btn rounded-card items-center justify-center ${
                  selectedSlotKey && !busyId
                    ? "bg-verification active:opacity-80"
                    : "bg-sand"
                }`}
              >
                {busyId !== null ? (
                  <ActivityIndicator size="small" color={colors.text.inverse} />
                ) : (
                  <Text
                    className={`text-button font-semibold ${
                      selectedSlotKey ? "text-white" : "text-text-muted"
                    }`}
                  >
                    {selectedSlotKey
                      ? "Accept enrollment"
                      : "Tap an available slot"}
                  </Text>
                )}
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancel"
                onPress={closePicker}
                disabled={busyId !== null}
                className="mt-2 h-10 items-center justify-center active:opacity-70"
              >
                <Text className="text-button text-text-secondary">Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenLayout>
  );
}
