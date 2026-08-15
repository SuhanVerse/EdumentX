/**
 * EdumentX — Enrollment Form (S-12 Figma upgrade)
 *
 * Full-screen replacement for the old `RequestEnrollmentSheet`
 * bottom sheet. Matches the Figma "Request to enroll" screen:
 *
 *   - Mode selector: One-to-one vs Join private batch (session code)
 *   - One-to-one: plan duration picker (1/3/6/12 mo), slot-grid
 *     multi-select from the tutor's live availability, start date,
 *     teaching address, trial-week toggle, green cost summary
 *   - Session-code: monospace uppercase code input + hint
 *   - Sticky CTA whose label + color change with the mode
 *   - Success screen ("Request sent" → View my enrollments)
 *
 * Submits through `EnrollmentRepository.writeEnrollmentRequest`
 * with the new S-12 fields (mode, planMonths, pickedSlotKeys,
 * address, trial, sessionCode, costNpr). The `schedule` string is
 * derived from the picked slots so the tutor's inbox card renders
 * naturally without a card change.
 */

import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenLayout, ScreenHeader } from "@/components/shared/ScreenLayout";
import { CalendarDatePicker } from "@/components/domain/CalendarDatePicker";
import { StudentAvailabilityGrid } from "@/components/domain/StudentAvailabilityGrid";
import { colors } from "@/constants/colors";
import { useAuthStore } from "@/store/authStore";
import { getBatchesRepository } from "@/services/batches/dataSource";
import { fetchTutorProfile } from "@/services/tutors/dataSource";
import { getEnrollmentRepository } from "@/services/enrollments/dataSource";
import {
  DAY_LABELS,
  TIME_SLOT_LABELS,
  DEFAULT_AVAILABILITY,
  MAX_BATCH_MEMBERS,
  parseSlotKey,
  type WeeklyAvailability,
  type Batch,
  type Enrollment,
} from "@/services/enrollments/types";
import {
  computeBookedMap,
  todayIsoInKtm,
} from "@/services/enrollments/derived";
import type { TutorProfile } from "@/lib/tutor/types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PLANS = [
  { label: "1 month", value: 1 },
  { label: "3 months", value: 3, popular: true },
  { label: "6 months", value: 6 },
  { label: "12 months", value: 12 },
];

/** Format a `day:slot` key as a human schedule fragment ("Mon 6–9 AM"). */
function formatSlotKey(key: string): string {
  const parsed = parseSlotKey(key);
  if (!parsed) return key;
  return `${DAY_LABELS[parsed.day]} ${TIME_SLOT_LABELS[parsed.slot]}`;
}

/** Add `months` calendar months to a YYYY-MM-DD date string. */
function addMonthsIso(iso: string, months: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, (m ?? 1) - 1 + months, d ?? 1, 12));
  const yy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export function EnrollmentFormScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tutorId, batchId } = useLocalSearchParams<{
    tutorId: string;
    batchId?: string;
  }>();
  const studentUid = useAuthStore((s) => s.user?.uid ?? null);

  const [tutor, setTutor] = useState<TutorProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Mode. When arriving from Browse Batches "Request to join" the
  // target batch rides along (`batchId`) and the form opens in
  // session-code mode — the join path that maps to a real batch.
  const [mode, setMode] = useState<"one-to-one" | "session-code">(
    batchId ? "session-code" : "one-to-one",
  );
  const [sessionCode, setSessionCode] = useState("");

  // One-to-one fields
  const [plan, setPlan] = useState(3);
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(() => new Set());
  const [startDate, setStartDate] = useState(() => todayIsoInKtm());
  const [address, setAddress] = useState("");
  const [trial, setTrial] = useState(false);

  // Live availability + booked map (same sources as TutorDetailsScreen)
  const repo = getEnrollmentRepository();
  const [availability, setAvailability] = useState<WeeklyAvailability>(
    DEFAULT_AVAILABILITY,
  );
  const [bookedMap, setBookedMap] = useState<ReturnType<
    typeof computeBookedMap
  > | null>(null);

  // Target batch when joining via session code (`batchId` rides
  // along from Browse Batches). Live memberCount drives the
  // full-batch guard — the microcopy below promises automatic
  // blocking when the class is full.
  const [targetBatch, setTargetBatch] = useState<Batch | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!tutorId) {
      setTutor(null);
      setLoading(false);
      return;
    }
    fetchTutorProfile(tutorId)
      .then(setTutor)
      .catch((err) => {
        console.warn("EnrollmentForm: profile fetch failed", err);
        setTutor(null);
      })
      .finally(() => setLoading(false));
  }, [tutorId]);

  useEffect(() => {
    if (!tutorId) return;
    const unsubA = repo.subscribeAvailability(
      tutorId,
      (snap) => setAvailability(snap.availability ?? DEFAULT_AVAILABILITY),
      (err) => console.warn("EnrollmentForm: availability subscribe failed", err),
    );
    let latestEnrollments: Enrollment[] = [];
    let latestBatches: Batch[] = [];
    const recompute = () =>
      setBookedMap(computeBookedMap(latestEnrollments, latestBatches));
    const unsubE = repo.subscribeEnrollments(
      tutorId,
      (list) => {
        latestEnrollments = list;
        recompute();
      },
      (err) => console.warn("EnrollmentForm: enrollments subscribe failed", err),
    );
    const unsubB = repo.subscribeBatches(
      tutorId,
      (list) => {
        latestBatches = list;
        recompute();
      },
      (err) => console.warn("EnrollmentForm: batches subscribe failed", err),
    );
    return () => {
      unsubA();
      unsubE();
      unsubB();
    };
  }, [tutorId, repo]);

  // Live target batch for session-code joins — the public feed is
  // the only source students can read (members is tutor-gated), and
  // its denormalized memberCount drives the full-batch guard.
  useEffect(() => {
    if (!batchId || mode !== "session-code") return;
    const unsub = getBatchesRepository().subscribePublicBatches(
      (list) =>
        setTargetBatch(list.find((b) => b.batchId === batchId) ?? null),
      (err) => console.warn("EnrollmentForm: batch subscribe failed", err),
    );
    return unsub;
  }, [batchId, mode]);

  const toggleSlot = useCallback(
    (key: string) => {
      // Defense in depth: never add a key that's booked (a slot held
      // by an enrollment OR a batch) or off in the tutor's schedule.
      // The grid already prevents tapping these, but the guard makes
      // the selection state itself conflict-proof (e.g. a slot that
      // became booked between renders).
      if (bookedMap?.has(key)) return;
      const parsed = parseSlotKey(key);
      if (parsed && availability[parsed.day][parsed.slot] === "off") return;
      setSelectedSlots((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      });
    },
    [bookedMap, availability],
  );

  const monthlyTotal = useMemo(() => {
    if (!tutor) return 0;
    return Math.round(tutor.monthlyRateNpr * plan * (trial ? 0.5 : 1));
  }, [tutor, plan, trial]);

  const codeValid = sessionCode.trim().length >= 6;
  // Full-batch guard: when the join target is known (batchId came
  // from Browse Batches), the CTA disables once the live
  // memberCount hits the seat cap.
  const batchFull = useMemo(
    () => (targetBatch ? (targetBatch.memberCount ?? 0) >= MAX_BATCH_MEMBERS : false),
    [targetBatch],
  );
  const canSubmit = useMemo(() => {
    if (submitting) return false;
    if (!studentUid) return false;
    if (mode === "session-code") return codeValid && !batchFull;
    return selectedSlots.size > 0 && startDate.length > 0;
  }, [submitting, studentUid, mode, codeValid, batchFull, selectedSlots.size, startDate]);

  async function handleSubmit() {
    if (!canSubmit || !studentUid || !tutorId) return;
    setSubmitting(true);
    setError(null);
    try {
      const picked = [...selectedSlots];
      const schedule =
        mode === "session-code"
          ? `Join private batch · code ${sessionCode.trim().toUpperCase()}`
          : picked.length > 0
            ? picked.map(formatSlotKey).join(" · ")
            : "";
      const endDate = mode === "one-to-one" ? addMonthsIso(startDate, plan) : startDate;

      const repoInst = getEnrollmentRepository();
      await repoInst.writeEnrollmentRequest({
        tutorUid: tutorId,
        studentUid,
        student: { uid: studentUid, name: "", grade: "", avatar: null },
        subjects: tutor?.subjects ?? [],
        schedule,
        startDate,
        endDate,
        message:
          mode === "session-code"
            ? "Requesting to join a private batch with this code."
            : address.trim()
              ? `Teaching address: ${address.trim()}`
              : "",
        mode,
        planMonths: mode === "one-to-one" ? plan : undefined,
        pickedSlotKeys: mode === "one-to-one" ? picked : undefined,
        address: mode === "one-to-one" ? address.trim() : undefined,
        trial: mode === "one-to-one" ? trial : undefined,
        sessionCode: mode === "session-code" ? sessionCode.trim().toUpperCase() : undefined,
        costNpr: mode === "one-to-one" ? monthlyTotal : undefined,
        batchId: mode === "session-code" ? batchId : undefined,
      });
      setSubmitted(true);
    } catch (err) {
      console.warn("EnrollmentForm: writeEnrollmentRequest failed", err);
      setError(
        err instanceof Error
          ? err.message
          : "Couldn't send the request. Try again.",
      );
      setSubmitting(false);
    }
  }

  // ── Loading ──
  if (loading) {
    return (
      <ScreenLayout variant="background">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.brand.primary ?? "#26302B"} />
          <Text className="text-body text-text-muted mt-4">Loading…</Text>
        </View>
      </ScreenLayout>
    );
  }

  // ── Guard ──
  if (!tutor || !tutorId) {
    return (
      <ScreenLayout variant="background">
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="person-outline" size={40} color={colors.text.muted} />
          <Text className="text-heading text-text-primary text-center mt-4">
            Tutor not found
          </Text>
          <Text className="text-body-sm text-text-muted text-center mt-2">
            This tutor profile could not be loaded.
          </Text>
          <Pressable
            onPress={() => router.back()}
            className="mt-5 px-6 py-3 rounded-card bg-accent active:opacity-80"
          >
            <Text className="text-button font-semibold text-text-inverse">
              Go back
            </Text>
          </Pressable>
        </View>
      </ScreenLayout>
    );
  }

  const firstName = tutor.fullName.split(" ")[0];

  // ── Success screen ──
  if (submitted) {
    return (
      <ScreenLayout variant="background">
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-20 h-20 rounded-pill bg-verification-light items-center justify-center mb-5">
            <Ionicons name="checkmark-circle" size={44} color={colors.brand.verification} />
          </View>
          <Text className="text-screen-title font-medium text-text-primary text-center">
            Request sent
          </Text>
          <Text className="text-body text-text-secondary text-center mt-3 max-w-[320px] leading-6">
            {firstName} usually responds within a day. We&apos;ll notify you the
            moment it&apos;s confirmed.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View my enrollments"
            onPress={() => router.replace("/enrollment")}
            className="w-full h-btn mt-8 rounded-card bg-primary items-center justify-center active:opacity-80"
          >
            <Text className="text-button font-semibold text-white">
              View my enrollments
            </Text>
          </Pressable>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout variant="background">
      <ScreenHeader variant="light">
        <Text className="text-body text-text-secondary mb-0.5">Request to enroll</Text>
        <Text className="text-screen-title font-medium text-text-primary">
          {tutor.fullName} · {tutor.subjects[0] ?? "Tutor"}
        </Text>
      </ScreenHeader>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingBottom: 24 + insets.bottom + 90 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Mode selector */}
        <View className="bg-surface border border-border rounded-card p-4 mb-3.5">
          <Text className="text-card-title font-medium text-text-primary mb-0.5">
            What are you requesting?
          </Text>
          <Text className="text-caption text-text-muted mb-3">
            Pick how you want to learn with this tutor.
          </Text>
          <View className="flex-row gap-2">
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: mode === "one-to-one" }}
              onPress={() => setMode("one-to-one")}
              className={`flex-1 p-3 rounded-card border ${
                mode === "one-to-one"
                  ? "border-primary bg-primary-light"
                  : "border-border bg-surface"
              }`}
            >
              <Ionicons
                name="person"
                size={18}
                color={mode === "one-to-one" ? colors.brand.primary : colors.text.muted}
              />
              <Text
                className={`text-body-sm font-medium mt-1.5 ${
                  mode === "one-to-one" ? "text-primary" : "text-text-primary"
                }`}
              >
                One-to-one
              </Text>
              <Text
                className={`text-micro mt-0.5 ${
                  mode === "one-to-one" ? "text-primary" : "text-text-muted"
                }`}
              >
                Just you with the tutor
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: mode === "session-code" }}
              onPress={() => setMode("session-code")}
              className={`flex-1 p-3 rounded-card border ${
                mode === "session-code"
                  ? "border-ai bg-ai-light"
                  : "border-border bg-surface"
              }`}
            >
              <Ionicons
                name="lock-closed"
                size={18}
                color={mode === "session-code" ? colors.brand.ai : colors.text.muted}
              />
              <Text
                className={`text-body-sm font-medium mt-1.5 ${
                  mode === "session-code" ? "text-ai" : "text-text-primary"
                }`}
              >
                Join private batch
              </Text>
              <Text
                className={`text-micro mt-0.5 ${
                  mode === "session-code" ? "text-ai" : "text-text-muted"
                }`}
              >
                You have a session code
              </Text>
            </Pressable>
          </View>
        </View>

        {mode === "session-code" ? (
          /* ── Session-code mode ── */
          <View className="bg-surface border border-border rounded-card p-4 mb-3.5">
            <Text className="text-card-title font-medium text-text-primary mb-0.5">
              Enter session code
            </Text>
            <Text className="text-caption text-text-muted mb-3">
              Ask the friend who invited you for the code (e.g. RS-PH-7K2X).
            </Text>
            <View className="flex-row items-center gap-2.5 bg-background border border-border rounded-card px-3.5 py-3">
              <Ionicons name="key-outline" size={18} color={colors.brand.ai} />
              <TextInput
                accessibilityLabel="Session code"
                value={sessionCode}
                onChangeText={(t) => setSessionCode(t.toUpperCase())}
                placeholder="XX-XX-XXXX"
                placeholderTextColor={colors.text.muted}
                autoCapitalize="characters"
                autoCorrect={false}
                className="flex-1 text-body text-text-primary tracking-widest"
                editable={!submitting}
              />
            </View>
            {batchFull && targetBatch ? (
              <View className="flex-row items-start gap-2 bg-danger-bg border border-danger/30 rounded-card p-3 mt-2.5">
                <Ionicons name="close-circle" size={16} color={colors.semantic.danger} style={{ marginTop: 1 }} />
                <Text className="flex-1 text-caption text-danger leading-5">
                  This batch is full — {targetBatch.memberCount ?? 0}/
                  {MAX_BATCH_MEMBERS} seats taken. Pick a different batch or
                  ask the tutor to open another.
                </Text>
              </View>
            ) : (
              <Text className="text-micro text-text-muted mt-2.5 leading-4">
                The tutor reviews each join request individually. If the batch is
                already full, your request will be blocked automatically.
              </Text>
            )}
          </View>
        ) : (
          /* ── One-to-one mode ── */
          <>
            {/* One-to-one info banner */}
            <View className="flex-row items-start gap-2.5 bg-primary-light border border-primary/20 rounded-card p-3 mb-3.5">
              <Ionicons name="person" size={16} color={colors.brand.primary} style={{ marginTop: 1 }} />
              <Text className="flex-1 text-caption text-text-primary leading-5">
                This is a 1-to-1 enrollment. Looking for a group class?{" "}
                <Text
                  onPress={() => router.push("/browse-batches" as never)}
                  className="text-primary font-medium underline"
                >
                  Browse open batches
                </Text>
              </Text>
            </View>

            {/* Plan duration */}
            <View className="bg-surface border border-border rounded-card p-4 mb-3.5">
              <Text className="text-card-title font-medium text-text-primary mb-3">
                Plan duration
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {PLANS.map((p) => {
                  const on = plan === p.value;
                  return (
                    <Pressable
                      key={p.value}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      onPress={() => setPlan(p.value)}
                      disabled={submitting}
                      className={`flex-1 min-w-[45%] p-3 rounded-card border relative ${
                        on
                          ? "border-primary bg-primary-light"
                          : "border-border bg-surface"
                      }`}
                    >
                      {p.popular ? (
                        <View className="absolute -top-2 right-2 px-1.5 py-0.5 rounded bg-verification">
                          <Text className="text-micro font-semibold text-white">
                            POPULAR
                          </Text>
                        </View>
                      ) : null}
                      <Text className={`text-body-sm font-medium ${on ? "text-primary" : "text-text-primary"}`}>
                        {p.label}
                      </Text>
                      <Text className={`text-caption mt-0.5 ${on ? "text-primary" : "text-text-muted"}`}>
                        Rs {(tutor.monthlyRateNpr * p.value).toLocaleString()}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Slot grid */}
            <View className="bg-surface border border-border rounded-card p-4 mb-3.5">
              <Text className="text-card-title font-medium text-text-primary mb-0.5">
                Pick your time slots
              </Text>
              <Text className="text-caption text-text-muted mb-3">
                Tap green slots — gray are unavailable.
              </Text>
              <StudentAvailabilityGrid
                availability={availability}
                bookedMap={bookedMap ?? new Map()}
                selectedSlotKeys={selectedSlots}
                onSlotToggle={toggleSlot}
              />
              <Text
                className={`text-caption font-medium mt-2 ${
                  selectedSlots.size === 0 ? "text-danger" : "text-success"
                }`}
              >
                {selectedSlots.size === 0
                  ? "Select at least 1 slot"
                  : `${selectedSlots.size} slot${selectedSlots.size > 1 ? "s" : ""} selected`}
              </Text>
            </View>

            {/* Start date */}
            <View className="bg-surface border border-border rounded-card p-4 mb-3.5">
              <View className="flex-row items-center justify-between mb-1.5">
                <Text className="text-card-title font-medium text-text-primary">
                  Start date
                </Text>
                <Text className="text-caption text-text-muted">
                  {startDate || "Pick a date"}
                </Text>
              </View>
              <CalendarDatePicker value={startDate} onChange={setStartDate} />
            </View>

            {/* Teaching address */}
            <View className="bg-surface border border-border rounded-card p-4 mb-3.5">
              <Text className="text-card-title font-medium text-text-primary mb-0.5">
                Teaching address
              </Text>
              <Text className="text-caption text-text-muted mb-2.5">
                Shared with the tutor only after they accept.
              </Text>
              <View className="flex-row gap-2 items-start">
                <Ionicons name="location-outline" size={18} color={colors.text.muted} style={{ marginTop: 10 }} />
                <TextInput
                  accessibilityLabel="Teaching address"
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Block / street / landmark in your area"
                  placeholderTextColor={colors.text.muted}
                  multiline
                  className="flex-1 min-h-[52px] bg-background border border-border rounded-card px-3.5 py-2.5 text-body text-text-primary"
                  editable={!submitting}
                />
              </View>
            </View>

            {/* Trial week toggle */}
            <View className="flex-row items-center gap-3 bg-surface border border-border rounded-card p-4 mb-3.5">
              <View className="flex-1">
                <Text className="text-card-title font-medium text-text-primary">
                  Trial week (50% off)
                </Text>
                <Text className="text-caption text-text-muted mt-0.5">
                  Try for a week before committing.
                </Text>
              </View>
              <Pressable
                accessibilityRole="switch"
                accessibilityState={{ checked: trial }}
                onPress={() => setTrial((v) => !v)}
                disabled={submitting}
                className={`w-11 h-6 rounded-pill items-center justify-start px-0.5 ${
                  trial ? "bg-verification" : "bg-border"
                }`}
              >
                <View
                  className="w-5 h-5 rounded-pill bg-white"
                  style={{ transform: [{ translateX: trial ? 18 : 0 }] }}
                />
              </Pressable>
            </View>

            {/* Cost summary */}
            <View className="flex-row items-center gap-2.5 bg-verification-light border border-verification/30 rounded-card p-4 mb-3.5">
              <Ionicons name="shield-checkmark" size={18} color={colors.brand.verification} />
              <Text className="flex-1 text-body-sm text-success">
                Total {plan} month{plan > 1 ? "s" : ""}
              </Text>
              <Text className="text-heading font-medium text-success">
                Rs {monthlyTotal.toLocaleString()}
              </Text>
            </View>
          </>
        )}

        {error ? (
          <View className="flex-row items-center gap-2 bg-danger-bg border border-danger/30 rounded-card p-3 mb-3.5">
            <Ionicons name="alert-circle-outline" size={16} color={colors.semantic.danger} />
            <Text className="text-caption text-danger flex-1">{error}</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Sticky CTA */}
      <View
        className="absolute bottom-0 left-0 right-0 bg-surface border-t border-border px-5 pt-3"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={mode === "one-to-one" ? "Send enrollment request" : "Send join request"}
          onPress={handleSubmit}
          disabled={!canSubmit}
          className={`h-btn rounded-card items-center justify-center flex-row gap-2 ${
            canSubmit
              ? mode === "one-to-one"
                ? "bg-primary active:opacity-80"
                : "bg-ai active:opacity-80"
              : "bg-surface-muted"
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
              {mode === "one-to-one" ? "Send enrollment request" : "Send join request"}
            </Text>
          )}
        </Pressable>
      </View>
    </ScreenLayout>
  );
}
