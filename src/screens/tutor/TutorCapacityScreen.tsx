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
 *   - `optimisticSlot` is a local override for the cell that the
 *     tutor just tapped. It persists across the Firestore
 *     round-trip so the cell flips immediately and only reverts
 *     if the server rejects the write.
 */

import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { Alert, Text, View } from "react-native";

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
  type SlotStatus,
  MAX_CAPACITY,
  DEFAULT_AVAILABILITY,
} from "@/services/enrollments/types";
import { computeBookedMap, countAvailabilityCells } from "@/services/enrollments/derived";
import { useAuthStore } from "@/store/authStore";

type OptimisticSlot = {
  day: DayKey;
  slot: TimeSlotKey;
  status: SlotStatus;
} | null;

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

  const [optimisticSlot, setOptimisticSlot] = useState<OptimisticSlot>(null);

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

  // Counts for the legend + hero caption. Applied AFTER the
  // optimistic slot overlay so the legend reflects the user's tap
  // immediately.
  const effectiveAvailability = useMemo(() => {
    const base = availability ?? DEFAULT_AVAILABILITY;
    if (!optimisticSlot) return base;
    return {
      ...base,
      [optimisticSlot.day]: {
        ...base[optimisticSlot.day],
        [optimisticSlot.slot]: optimisticSlot.status,
      },
    };
  }, [availability, optimisticSlot]);

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

  async function handleCellTap({
    day,
    slot,
    currentStatus,
  }: {
    day: DayKey;
    slot: TimeSlotKey;
    currentStatus: "off" | "available" | "booked";
  }) {
    if (!tutorUid) return;
    if (currentStatus === "booked") return; // disabled in the cell itself
    const next: SlotStatus = currentStatus === "off" ? "available" : "off";
    setOptimisticSlot({ day, slot, status: next });
    try {
      await repo.setSlotStatus(tutorUid, day, slot, next);
    } catch (err) {
      console.warn("TutorCapacity: setSlotStatus failed", err);
      Alert.alert(
        "Couldn't save",
        "We couldn't update your availability. Try again in a moment.",
      );
      setOptimisticSlot(null);
    }
  }

  // Clear the optimistic slot once the Firestore snapshot echoes
  // the new value (avoids a stale local override sticking around).
  useEffect(() => {
    if (!optimisticSlot) return;
    const { day, slot, status } = optimisticSlot;
    if (availability && availability[day][slot] === status) {
      setOptimisticSlot(null);
    }
  }, [availability, optimisticSlot]);

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
            Tap a slot to cycle: Off → Available → Off.
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
