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
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { AvailabilityTimeList } from "@/components/domain/AvailabilityTimeList";
import { EnrollmentRequestCard } from "@/components/domain/EnrollmentRequestCard";
import { TutorBottomBar } from "@/components/domain/TutorBottomBar";
import {
  ScreenLayout,
  ScreenHeader,
  ScreenScroll,
} from "@/components/shared/ScreenLayout";
import { computeBookedMap } from "@/services/enrollments/derived";
import { getEnrollmentRepository } from "@/services/enrollments/dataSource";
import {
  CapacityExceededError,
  DEFAULT_AVAILABILITY,
  RequestAlreadyDecidedError,
  type Batch,
  type Enrollment,
  type EnrollmentRequest,
  type WeeklyAvailability,
} from "@/services/enrollments/types";
import { useAuthStore } from "@/store/authStore";

export function EnrollmentInbox() {
  const user = useAuthStore((state) => state.user);
  const tutorUid = user?.uid ?? null;
  const repo = getEnrollmentRepository();

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
    setSelectedSlotKey(null);
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
      });
      setSlotPickerFor(null);
      setSelectedSlotKey(null);
    } catch (err) {
      console.warn("EnrollmentInbox: acceptRequest failed", err);
      if (err instanceof CapacityExceededError) {
        Alert.alert("Capacity full", err.message);
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
            <ActivityIndicator size="small" color="#2F5D50" />
            <Text className="text-caption text-text-muted mt-3">
              Loading requests…
            </Text>
          </View>
        ) : pending.length === 0 ? (
          <View className="items-center justify-center pt-16 px-6">
            <View className="w-14 h-14 rounded-pill bg-accent-light items-center justify-center mb-3">
              <Ionicons name="mail-open-outline" size={26} color="#E5A03B" />
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
      </ScreenScroll>

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
          <View className="bg-surface rounded-t-3xl max-h-[88%]">
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
            <View className="px-5 pt-4 pb-6 border-t border-border">
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
                  <ActivityIndicator size="small" color="#FFFFFF" />
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
