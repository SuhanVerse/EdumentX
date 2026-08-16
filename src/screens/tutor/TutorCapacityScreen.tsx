/**
 * EdumentX — Tutor Capacity & Schedule screen
 *
 * The centrepiece of Phase 5 (tutor enrollment management). Reached
 * from BOTH entry points:
 *   - The dashboard's "Student capacity" card (the hub hero
 *     surfaces today's capacity utilization).
 *   - The profile's "More" section → "Capacity & schedule" `MenuRow`.
 *
 * Layout:
 *   ┌─ light hero header ───────────────────────────────────
 *   │  "Manage your" + "Capacity & schedule" (underlined)
 *   │  enrolledCount / max(studentCapacity, MAX_CAPACITY) filled
 *   │  availableCount slots available
 *   ├──────────────────────────────────────────────────────
 *   │  Capacity progress card (filled bar + amber > 80%)
 *   │  Weekly availability grid (Mon–Sun × 6 slots vertical)
 *   │  Info banner (one student per slot, batch in slot)
 *   │  Legend (Available / Booked / Off)
 *   └──────────────────────────────────────────────────────
 *   TutorBottomBar
 *
 * State machine:
 *   - `availability` comes from `subscribeAvailability`. The
 *     subscription emits `{ availability, enrolledCount,
 *     studentCapacity }` every time the profile subdoc changes.
 *   - `enrollments` comes from `subscribeEnrollments`. Auto-expiry
 *     sweep runs inside the repo.
 *   - `batches` comes from `subscribeBatches`.
 *   - `bookedMap` is derived at render time via `computeBookedMap`.
 *   - `draft` is a local-only copy of the grid that accumulates
 *     cell taps until "Save changes" flushes it in one bulk write
 *     (`saveAvailability`). Nothing reaches Firestore per-tap.
 */

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  Text,
  View,
} from "react-native";

import {
  ScreenLayout,
  ScreenHeader,
  ScreenScroll,
} from "@/components/shared/ScreenLayout";
import { RemoveEnrollmentDialog } from "@/components/domain/RemoveEnrollmentDialog";
import { SeatsRing } from "@/components/domain/SeatsRing";
import { colors } from "@/constants/colors";
import { TutorBottomBar } from "@/components/domain/TutorBottomBar";
import { WeeklyAvailabilityGrid } from "@/components/domain/WeeklyAvailabilityGrid";
import { ActivePill } from "@/components/motion";
import { Skeleton, SkeletonText } from "@/components/motion/Skeleton";
import { getEnrollmentRepository } from "@/services/enrollments/dataSource";
import {
  type AvailabilitySnapshot,
  type Batch,
  type Enrollment,
  type WeeklyAvailability,
  type DayKey,
  type TimeSlotKey,
  DAY_LABELS,
  parseSlotKey,
  TIME_SLOT_LABELS,
  MAX_BATCH_MEMBERS,
  MAX_CAPACITY,
  DEFAULT_AVAILABILITY,
} from "@/services/enrollments/types";
import {
  cloneAvailability,
  computeBookedMap,
  countAvailabilityCells,
  countAvailabilityChanges,
} from "@/services/enrollments/derived";
import { useAuthStore } from "@/store/authStore";

const PROGRESS_AMBER_THRESHOLD = 0.8;

/** Format a `day:slot` key as a short schedule fragment. */
function formatSlotKey(key: string): string {
  const parsed = parseSlotKey(key);
  if (!parsed) return key;
  return `${DAY_LABELS[parsed.day]} ${TIME_SLOT_LABELS[parsed.slot]}`;
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

export function TutorCapacityScreen() {
  const tutorUid = useAuthStore((s) => s.user?.uid ?? null);
  const router = useRouter();

  const repo = getEnrollmentRepository();

  // Live state.
  const [availability, setAvailability] = useState<WeeklyAvailability | null>(
    null,
  );
  const [enrolledCount, setEnrolledCount] = useState(0);
  const [studentCapacity, setStudentCapacity] = useState(MAX_CAPACITY);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  // Active / Ended tabs on the batch section — ended classes are
  // listed for visibility and free their grid slots automatically
  // (`computeBookedMap` skips non-active batches).
  const [batchTab, setBatchTab] = useState<"active" | "ended">("active");
  const [batchTabsWidth, setBatchTabsWidth] = useState(0);
  const visibleBatches = useMemo(
    () => batches.filter((b) => b.status === batchTab),
    [batches, batchTab],
  );

  // Per-source "hasLoaded" — drives the initial skeleton. We render
  // as soon as the availability snapshot arrives; the enrollments
  // and batches streams re-emit on every change so the booked map
  // settles within a few hundred ms.
  const [availabilityLoaded, setAvailabilityLoaded] = useState(false);

  // Local draft of the availability grid. `null` = no unsaved edits;
  // once the tutor taps a cell it snapshots the live availability and
  // accumulates changes until "Save changes" flushes it in one write.
  const [draft, setDraft] = useState<WeeklyAvailability | null>(null);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  // Active-students removal — same RemoveEnrollmentDialog entry as
  // the dashboard. Soft-deletes the enrollment by direct path,
  // frees the capacity slot, and cascades to the batch member doc.
  const [removeTarget, setRemoveTarget] = useState<Enrollment | null>(null);
  const [removing, setRemoving] = useState(false);

  // Subscribe to availability.
  useEffect(() => {
    if (!tutorUid) return;
    const unsub = repo.subscribeAvailability(
      tutorUid,
      (snap: AvailabilitySnapshot) => {
        setAvailability(snap.availability ?? DEFAULT_AVAILABILITY);
        setEnrolledCount(snap.enrolledCount);
        setStudentCapacity(snap.studentCapacity);
        setAvailabilityLoaded(true);
      },
      (err) => console.warn("TutorCapacity: availability error", err),
    );
    return unsub;
  }, [tutorUid, repo]);

  // Subscribe to enrollments (also runs the auto-expiry sweep).
  useEffect(() => {
    if (!tutorUid) return;
    const unsub = repo.subscribeEnrollments(
      tutorUid,
      (list) => {
        setEnrollments(list);
        setEnrolledCount(list.filter((e) => e.status === "active").length);
      },
      (err) => console.warn("TutorCapacity: enrollments error", err),
    );
    return unsub;
  }, [tutorUid, repo]);

  // Subscribe to batches.
  useEffect(() => {
    if (!tutorUid) return;
    const unsub = repo.subscribeBatches(
      tutorUid,
      (list) => setBatches(list),
      (err) => console.warn("TutorCapacity: batches error", err),
    );
    return unsub;
  }, [tutorUid, repo]);

  // Build the booked map. We pass `today` from the moment of render
  // so the helper stays consistent within a single render pass.
  const bookedMap = useMemo(
    () => computeBookedMap(enrollments, batches),
    [enrollments, batches],
  );

  // The rendered grid = the local draft while edits are pending,
  // otherwise the live availability. Counts follow the same source so
  // the legend reflects the tutor's taps immediately.
  const effectiveAvailability = draft ?? availability ?? DEFAULT_AVAILABILITY;
  const changes = useMemo(
    () =>
      draft && availability
        ? countAvailabilityChanges(availability, draft)
        : 0,
    [draft, availability],
  );

  const counts = useMemo(
    () => countAvailabilityCells(effectiveAvailability, bookedMap),
    [effectiveAvailability, bookedMap],
  );

  const cap = Math.max(studentCapacity, MAX_CAPACITY);
  const fillPct = cap > 0 ? enrolledCount / cap : 0;
  const barColor =
    fillPct >= 1
      ? "bg-danger"
      : fillPct >= PROGRESS_AMBER_THRESHOLD
        ? "bg-amber"
        : "bg-verification";

  // Local edit — never touches Firestore. Seeds the draft from the
  // live availability on the first tap, then flips the cell. Booked
  // cells never reach here (the grid disables them).
  function handleCellTap({
    day,
    slot,
    currentStatus,
  }: {
    day: DayKey;
    slot: TimeSlotKey;
    currentStatus: "off" | "available" | "booked";
  }) {
    if (currentStatus === "booked") return; // disabled in the cell itself
    setDraft((current) => {
      const base = cloneAvailability(
        current ?? availability ?? DEFAULT_AVAILABILITY,
      );
      base[day][slot] = currentStatus === "off" ? "available" : "off";
      return base;
    });
  }

  // Bulk flush — one write for the whole draft, then a transient
  // "saved" confirmation and the bar disappears.
  async function handleSave() {
    if (!tutorUid || !draft || saving) return;
    setSaving(true);
    try {
      await repo.saveAvailability(tutorUid, draft);
      setDraft(null);
      setJustSaved(true);
      // Auto-hide the "Saved" chip after a beat.
      setTimeout(() => setJustSaved(false), 2200);
    } catch (err) {
      console.warn("TutorCapacity: saveAvailability failed", err);
      Alert.alert(
        "Couldn't save",
        "We couldn't update your availability. Try again in a moment.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveEnrollment(reason: string) {
    if (!tutorUid || !removeTarget || removing) return;
    setRemoving(true);
    try {
      await repo.removeEnrollment(tutorUid, removeTarget.enrollmentId, reason);
      // The roster snapshot re-emits and the row drops off
      // automatically; close the dialog on success.
      setRemoveTarget(null);
    } catch (err) {
      console.warn("TutorCapacity: removeEnrollment failed", err);
      Alert.alert(
        "Couldn't remove",
        "We couldn't remove this student. Try again in a moment.",
      );
    } finally {
      setRemoving(false);
    }
  }

  // ── Rendering ────────────────────────────────────────────────────────────

  return (
    <ScreenLayout variant="background">
      <ScreenHeader variant="light">
        <Text className="text-body text-text-secondary mb-0.5">Manage your</Text>
        <View className="self-start border-b-2 border-accent pb-0.5">
          <Text className="text-display text-text-primary">Capacity & schedule</Text>
        </View>
        <Text className="text-body text-text-secondary mt-1.5">
          {enrolledCount} / {cap} filled · {counts.available} slots available
        </Text>
      </ScreenHeader>

      <ScreenScroll className="flex-1">
        {/* Capacity progress card */}
        <View className="bg-surface border border-border rounded-card p-4 mb-3.5">
          <View className="flex-row items-center gap-2 mb-2.5">
            <Ionicons name="people" size={16} color={colors.brand.primary} />
            <Text className="flex-1 text-button-sm font-medium text-text-primary">
              Student capacity
            </Text>
            <Text className="text-button-sm font-medium text-verification">
              {enrolledCount} / {cap} filled
            </Text>
          </View>
          <View className="h-2 rounded-pill bg-background overflow-hidden">
            <View
              className={`h-full rounded-pill ${barColor}`}
              style={{ width: `${Math.min(fillPct * 100, 100)}%` }}
            />
          </View>
        </View>

        {/* Weekly availability grid */}
        <View className="bg-surface border border-border rounded-card p-4 mb-3.5">
          <Text className="text-card-title font-medium text-text-primary mb-1">
            Weekly availability
          </Text>
          <Text className="text-caption text-text-muted mb-3">
            Tap slots to edit, then save your changes.
          </Text>
          {!availabilityLoaded ? (
            <GridSkeleton />
          ) : (
            <WeeklyAvailabilityGrid
              availability={effectiveAvailability}
              bookedMap={bookedMap}
              variant="editable"
              onCellTap={handleCellTap}
            />
          )}
        </View>

        {/* Info banner */}
        <View className="bg-ai-light border border-ai-border rounded-card p-3.5 flex-row gap-2.5 mb-3.5">
          <Ionicons name="information-circle-outline" size={18} color={colors.brand.ai} />
          <Text className="flex-1 text-caption text-ai leading-relaxed">
            One student per 1-to-1 slot. Group batches occupy a full slot
            for all members. Students can request only your{" "}
            <Text className="font-semibold">Available</Text> slots — conflicts
            are blocked automatically. Ended batches release their slots
            automatically.
          </Text>
        </View>

        {/* Active students — the live roster with per-row removal.
            Removing frees the capacity slot and cascades to the
            batch member doc when the enrollment is in a batch. */}
        <View className="mb-2">
          <Text className="text-card-title font-medium text-text-primary mb-3">
            Active students
          </Text>
          {enrollments.filter((e) => e.status === "active").length === 0 ? (
            <View className="bg-surface border border-border rounded-card p-6 items-center">
              <View className="w-12 h-12 rounded-pill bg-background border border-border items-center justify-center mb-3">
                <Ionicons name="person-outline" size={22} color={colors.text.muted} />
              </View>
              <Text className="text-card-title font-medium text-text-primary text-center">
                No active students yet
              </Text>
              <Text className="text-body text-text-secondary text-center mt-1.5">
                Students you accept from the inbox appear here.
              </Text>
            </View>
          ) : (
            <View className="flex-col gap-3">
              {enrollments
                .filter((e) => e.status === "active")
                .map((e) => (
                  <View
                    key={e.enrollmentId}
                    className="bg-surface border border-border rounded-card p-3.5 flex-row items-center gap-3"
                  >
                    <RosterAvatar uri={e.studentAvatar} name={e.studentName} />
                    <View className="flex-1">
                      <Text
                        className="text-card-title font-medium text-text-primary"
                        numberOfLines={1}
                      >
                        {e.studentName}
                      </Text>
                      <Text className="text-caption text-text-muted mt-0.5">
                        {e.studentGrade} · {formatSlotKey(e.slotKey)}
                      </Text>
                      <View className="flex-row items-center gap-2 mt-1">
                        {e.batchId ? (
                          <View className="px-2 py-0.5 rounded-sm bg-ai-light">
                            <Text className="text-micro font-medium text-ai">
                              In batch
                            </Text>
                          </View>
                        ) : null}
                        <Text className="text-micro text-text-muted">
                          From {e.startDate}
                        </Text>
                      </View>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${e.studentName}`}
                      onPress={() => setRemoveTarget(e)}
                      // 36px visual — hitSlop 8 → 52px effective touch
                      // area (iOS 44 / Android 48 minimum).
                      hitSlop={8}
                      className="w-9 h-9 rounded-pill bg-danger-bg items-center justify-center active:opacity-70"
                    >
                      <Ionicons name="close" size={18} color={colors.semantic.danger} />
                    </Pressable>
                  </View>
                ))}
            </View>
          )}
        </View>

        {/* ── Batches — Active / Ended tabs. Ended classes stay
            listed for visibility; `computeBookedMap` already skips
            non-active batches so their slots show as available. ── */}
        <View className="mb-2">
          <Text className="text-card-title font-medium text-text-primary mb-3">
            Batches &amp; capacity
          </Text>

          {/* Segmented control */}
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
                  ? "Group classes you create appear here."
                  : batchTab === "active"
                    ? "Active batches hold their slots until they end."
                    : "Ended classes appear here with their slots freed."}
              </Text>
            </View>
          ) : (
            <View className="flex-col gap-3.5">
              {visibleBatches.map((batch) => {
                const memberCount = batch.memberCount ?? 0;
                return (
                  <Pressable
                    key={batch.batchId}
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${batch.name} details`}
                    onPress={() =>
                      tutorUid &&
                      router.push({
                        pathname: `/batch/${batch.tutorUid}/${batch.batchId}`,
                      } as never)
                    }
                    className="bg-surface border border-border rounded-card p-4 active:opacity-80"
                  >
                    <View className="flex-row justify-between items-center mb-2">
                      <View className="flex-1 pr-3">
                        <Text
                          className="text-card-title font-medium text-text-primary"
                          numberOfLines={1}
                        >
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
                            {memberCount}/{MAX_BATCH_MEMBERS}
                          </Text>
                          <SeatsRing
                            seatsLeft={Math.max(
                              0,
                              MAX_BATCH_MEMBERS - memberCount,
                            )}
                            max={MAX_BATCH_MEMBERS}
                          />
                        </View>
                      )}
                    </View>

                    {batch.slotKeys.length > 0 && (
                      <View>
                        <View className="flex-row gap-1.5 flex-wrap">
                          {batch.slotKeys.map((slotKey) => {
                            // Who currently holds this slot in the
                            // weekly grid? Active batches own their
                            // slots unless a 1-to-1 enrollment
                            // overlaps (enrollment wins).
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
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </ScreenScroll>

      {/* Sticky save bar — appears only while there are unsaved
          edits. Amber is the single high-priority CTA on this
          screen (per the design system). */}
      {draft !== null && (
        <View className="px-4 pt-3 pb-2 border-t border-border bg-background">
          <View className="flex-row items-center gap-3">
            <View className="flex-1">
              <Text className="text-button-sm font-medium text-text-primary">
                {justSaved ? "Availability saved" : "Unsaved changes"}
              </Text>
              <Text className="text-caption text-text-muted mt-0.5">
                {justSaved ? "Your schedule is live." : `${changes} slot${changes === 1 ? "" : "s"} changed`}
              </Text>
            </View>
            {!justSaved && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Discard availability changes"
                onPress={() => setDraft(null)}
                disabled={saving}
                className="h-11 px-3 rounded-card items-center justify-center active:opacity-70"
              >
                <Text className="text-button text-text-secondary">Discard</Text>
              </Pressable>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Save availability changes"
              onPress={() => void handleSave()}
              disabled={saving || changes === 0}
              className={`h-11 px-6 rounded-card items-center justify-center ${
                saving || changes === 0 ? "bg-surface-muted" : "bg-accent active:opacity-90"
              }`}
            >
              {saving ? (
                <ActivityIndicator size="small" color={colors.text.inverse} />
              ) : (
                <Text
                  className={`text-button font-semibold ${
                    changes === 0 ? "text-text-muted" : "text-text-inverse"
                  }`}
                >
                  {justSaved ? "Saved" : `Save changes${changes > 0 ? ` (${changes})` : ""}`}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      )}

      <RemoveEnrollmentDialog
        visible={removeTarget !== null}
        studentName={removeTarget?.studentName ?? ""}
        loading={removing}
        onConfirm={(reason) => void handleRemoveEnrollment(reason)}
        onCancel={() => setRemoveTarget(null)}
      />
      <TutorBottomBar />
    </ScreenLayout>
  );
}

/** Roster avatar with initial fallback (mirrors the dashboard's
 *  `AvatarCircle` — the truthy guard is required because
 *  `<Image source={{ uri: "" }}>` throws on Android). */
function RosterAvatar({ uri, name }: { uri?: string | null; name?: string }) {
  const hasImage = typeof uri === "string" && uri.length > 0;
  const initial = (name?.charAt(0) ?? "?").toUpperCase();
  if (!hasImage) {
    return (
      <View className="w-10 h-10 rounded-pill bg-background border border-border items-center justify-center">
        <Text className="text-card-title font-medium text-text-muted">
          {initial}
        </Text>
      </View>
    );
  }
  return (
    <Image
      source={{ uri }}
      className="w-10 h-10 rounded-pill bg-background border border-border"
    />
  );
}

function GridSkeleton() {
  return (
    <View>
      <View className="flex-row mb-2 ml-14">
        {Array.from({ length: 6 }).map((_, i) => (
          <View key={i} className="flex-1 px-0.5">
            <SkeletonText className="w-full" />
          </View>
        ))}
      </View>
      {Array.from({ length: 7 }).map((_, day) => (
        <View key={day} className="flex-row items-center mb-1.5">
          <View className="w-12 pr-1.5">
            <SkeletonText className="w-8" />
          </View>
          <View className="flex-1 flex-row gap-1.5">
            {Array.from({ length: 6 }).map((__, slot) => (
              <View key={slot} className="flex-1">
                <Skeleton className="h-12 rounded-md" />
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}
