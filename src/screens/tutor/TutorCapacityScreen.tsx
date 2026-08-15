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
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";

import {
  ScreenLayout,
  ScreenHeader,
  ScreenScroll,
} from "@/components/shared/ScreenLayout";
import { TutorBottomBar } from "@/components/domain/TutorBottomBar";
import { WeeklyAvailabilityGrid } from "@/components/domain/WeeklyAvailabilityGrid";
import { Skeleton, SkeletonText } from "@/components/motion/Skeleton";
import { getEnrollmentRepository } from "@/services/enrollments/dataSource";
import {
  type AvailabilitySnapshot,
  type Batch,
  type Enrollment,
  type WeeklyAvailability,
  type DayKey,
  type TimeSlotKey,
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

export function TutorCapacityScreen() {
  const tutorUid = useAuthStore((s) => s.user?.uid ?? null);

  const repo = getEnrollmentRepository();

  // Live state.
  const [availability, setAvailability] = useState<WeeklyAvailability | null>(
    null,
  );
  const [enrolledCount, setEnrolledCount] = useState(0);
  const [studentCapacity, setStudentCapacity] = useState(MAX_CAPACITY);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);

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
            <Ionicons name="people" size={16} color="#2F5D50" />
            <Text className="flex-1 text-button-sm font-medium text-text-primary">
              Student capacity
            </Text>
            <Text className="text-button-sm font-medium text-verification">
              {enrolledCount} / {cap} filled
            </Text>
          </View>
          <View className="h-2 rounded-full bg-background overflow-hidden">
            <View
              className={`h-full rounded-full ${barColor}`}
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
          <Ionicons name="information-circle-outline" size={18} color="#4A7FA5" />
          <Text className="flex-1 text-caption text-ai leading-relaxed">
            One student per 1-to-1 slot. Group batches occupy a full slot
            for all members. Students can request only your{" "}
            <Text className="font-semibold">Available</Text> slots — conflicts
            are blocked automatically.
          </Text>
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
                <ActivityIndicator size="small" color="#FFFFFF" />
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

      <TutorBottomBar />
    </ScreenLayout>
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
