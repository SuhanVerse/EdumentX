import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Plus } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/constants/colors";
import { Avatar } from "@/components/ui/Avatar";
import { TutorBottomBar } from "@/components/domain/TutorBottomBar";
import { ActivePill } from "@/components/motion";
import {
  ScreenLayout,
  ScreenHeader,
  ScreenScroll,
} from "@/components/shared/ScreenLayout";

import { getBatchesRepository } from "@/services/batches/dataSource";
import type { Batch, RosterStudent } from "@/services/batches/types";
import {
  DAY_KEYS,
  DAY_LABELS,
  MAX_BATCH_MEMBERS,
  TIME_SLOT_LABELS,
  parseSlotKey,
} from "@/services/enrollments/types";
import { useAuthStore } from "@/store/authStore";

/** Derive a display label from a canonical slot key ("mon:5-7" →
 *  "Mon · 5–7 PM"). Mirrors the shared `formatSlotKey` in
 *  `WeeklyAvailabilityGrid` — kept local so this screen doesn't
 *  import a component just for formatting. */
function formatSlotKey(slotKey: string): string {
  const parsed = parseSlotKey(slotKey);
  if (!parsed) return slotKey;
  return `${DAY_LABELS[parsed.day]} · ${TIME_SLOT_LABELS[parsed.slot]}`;
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

const COMMON_SUBJECTS = ["Mathematics", "Science", "English", "Physics", "Chemistry", "Computer Science"];

/** Enforce the "Select 2-6 enrolled students" contract from the UI copy.
 *  The cap is the shared `MAX_BATCH_MEMBERS` (see types.ts). */
const MIN_MEMBERS = 2;

export function BatchesScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const tutorUid = user?.uid ?? "";
  const router = useRouter();
  const repo = useMemo(() => getBatchesRepository(), []);

  // ── Live batches + per-batch members ──
  const [batches, setBatches] = useState<Batch[]>([]);
  const [batchesLoading, setBatchesLoading] = useState(true);
  const [membersByBatch, setMembersByBatch] = useState<Record<string, unknown[]>>({});
  // Active / Ended segmented control. Ended classes stay viewable
  // here (the repo returns both — the tabs just filter them).
  const [tab, setTab] = useState<"active" | "ended">("active");
  const [tabsWidth, setTabsWidth] = useState(0);
  const visibleBatches = useMemo(
    () => batches.filter((b) => b.status === tab),
    [batches, tab],
  );
  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [rosterLoading, setRosterLoading] = useState(true);

  useEffect(() => {
    if (!tutorUid) return;
    let disposed = false;
    const subs: (() => void)[] = [];

    const unsubBatches = repo.subscribeBatches(
      tutorUid,
      (list) => {
        if (disposed) return;
        setBatches(list);
        setBatchesLoading(false);
      },
      (err) => {
        console.warn("Batches: subscribeBatches failed", err);
        if (!disposed) setBatchesLoading(false);
      },
    );
    subs.push(unsubBatches);

    const unsubRoster = repo.subscribeRoster(
      tutorUid,
      (students) => {
        if (disposed) return;
        setRoster(students);
        setRosterLoading(false);
      },
      (err) => {
        console.warn("Batches: subscribeRoster failed", err);
        if (!disposed) setRosterLoading(false);
      },
    );
    subs.push(unsubRoster);

    return () => {
      disposed = true;
      subs.forEach((u) => u());
    };
  }, [repo, tutorUid]);

  // ── Per-batch member subscriptions (keyed by batchId) ──
  useEffect(() => {
    if (!tutorUid) return;
    const subs: (() => void)[] = [];
    for (const b of batches) {
      const unsub = repo.subscribeBatchMembers(tutorUid, b.batchId, (members) => {
        setMembersByBatch((prev) => ({ ...prev, [b.batchId]: members }));
      });
      subs.push(unsub);
    }
    return () => subs.forEach((u) => u());
  }, [repo, tutorUid, batches]);

  // ── Creation wizard state ──
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [selectedEnrollments, setSelectedEnrollments] = useState<string[]>([]);
  const [batchName, setBatchName] = useState("");
  const [batchSubject, setBatchSubject] = useState("");
  const [customSubject, setCustomSubject] = useState("");
  const [feeText, setFeeText] = useState("");
  const [slotKeys, setSlotKeys] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  const openWizard = () => {
    setWizardStep(1);
    setSelectedEnrollments([]);
    setWizardOpen(true);
  };

  const closeWizard = () => {
    if (creating) return;
    setWizardOpen(false);
  };

  const toggleStudent = (enrollmentId: string) => {
    setSelectedEnrollments((prev) =>
      prev.includes(enrollmentId)
        ? prev.filter((id) => id !== enrollmentId)
        : prev.length >= MAX_BATCH_MEMBERS
          ? prev
          : [...prev, enrollmentId],
    );
  };

  const selectedStudents = useMemo(
    () => roster.filter((s) => selectedEnrollments.includes(s.enrollmentId)),
    [roster, selectedEnrollments],
  );

  const canContinueToDetails = selectedStudents.length >= MIN_MEMBERS;

  const canSubmit =
    batchName.trim().length >= 2 &&
    (batchSubject !== "__other" ? batchSubject.length > 0 : customSubject.trim().length >= 2) &&
    Number(feeText) > 0 &&
    slotKeys.length > 0;

  // Slots already claimed by the tutor's active enrollments or
  // another ACTIVE batch. A new batch must not double-book them —
  // `computeBookedMap` lets enrollments win on overlap, which would
  // silently break batch members' bookings.
  const occupiedSlots = useMemo(() => {
    const set = new Set<string>();
    for (const s of roster) if (s.slotKey) set.add(s.slotKey);
    for (const b of batches) {
      if (b.status !== "active") continue;
      for (const k of b.slotKeys) set.add(k);
    }
    return set;
  }, [roster, batches]);

  const conflictingSlots = useMemo(
    () => slotKeys.filter((k) => occupiedSlots.has(k)),
    [slotKeys, occupiedSlots],
  );

  const finalSubject = batchSubject === "__other" ? customSubject.trim() : batchSubject;

  const handleCreate = async () => {
    if (!tutorUid) return;
    if (!canSubmit) return;
    // Hard block: the batch must not claim slots already held by an
    // active enrollment or another active batch.
    if (conflictingSlots.length > 0) {
      Alert.alert(
        "Slot conflict",
        `${conflictingSlots.map(formatSlotKey).join(", ")} ${
          conflictingSlots.length === 1 ? "is" : "are"
        } already booked. Pick different days for this batch.`,
      );
      return;
    }
    setCreating(true);
    try {
      await repo.createBatch({
        tutorUid,
        authorUid: tutorUid,
        name: batchName.trim(),
        subject: finalSubject,
        monthlyRateNpr: Math.round(Number(feeText)),
        slotKeys,
        startDate: new Date().toISOString().slice(0, 10),
        endDate: null,
        members: selectedStudents.map((s) => ({
          enrollmentId: s.enrollmentId,
          studentUid: s.studentUid,
          studentName: s.studentName,
          studentAvatar: s.studentAvatar,
        })),
      });
      setWizardOpen(false);
      setCreating(false);
      // Reset the wizard for next time.
      setWizardStep(1);
      setSelectedEnrollments([]);
      setBatchName("");
      setBatchSubject("");
      setCustomSubject("");
      setFeeText("");
      setSlotKeys([]);
    } catch (err) {
      setCreating(false);
      Alert.alert(
        "Couldn't create batch",
        err instanceof Error ? err.message : "Unknown error",
      );
    }
  };

  const handleRemoveMember = (batch: Batch, memberId: string) => {
    Alert.alert(
      "Remove student from batch?",
      "They'll no longer be part of this batch.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            repo
              .removeBatchMember(tutorUid, batch.batchId, memberId)
              .catch((err) => console.warn("Batches: removeMember failed", err));
          },
        },
      ],
    );
  };

  return (
    <ScreenLayout variant="background">
      <ScreenHeader variant="light">
        <Text className="text-2xl font-bold text-text-primary">Group Batches</Text>
        <Text className="text-text-secondary mt-1">
          Combine students into shared batches
        </Text>
      </ScreenHeader>

      <ScreenScroll className="flex-1">
        <Pressable
          onPress={openWizard}
          className="bg-ai rounded-card py-4 px-6 flex-row items-center justify-center gap-2 active:opacity-90 mb-8"
        >
          <Plus size={20} color={colors.text.inverse} strokeWidth={3} />
          <Text className="text-white font-semibold text-base">
            Create New Batch
          </Text>
        </Pressable>

        {/* Active / Ended segmented control */}
        <View
          className="flex-row bg-sand rounded-card relative h-11 overflow-hidden mb-4"
          onLayout={(e) => setTabsWidth(e.nativeEvent.layout.width)}
        >
          {tabsWidth > 0 && (
            <ActivePill
              count={2}
              activeIndex={tab === "active" ? 0 : 1}
              itemWidth={tabsWidth / 2}
              pillClassName="absolute top-1 bottom-1 bg-primary rounded-lg"
              style={{ width: tabsWidth / 2, borderRadius: 10 }}
            />
          )}
          {(["active", "ended"] as const).map((t, i) => {
            const isActive = t === tab;
            const count = batches.filter((b) => b.status === t).length;
            return (
              <Pressable
                key={t}
                accessibilityRole="tab"
                accessibilityLabel={`${t} batches`}
                accessibilityState={{ selected: isActive }}
                onPress={() => setTab(t)}
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

        {/* Batches (filtered by tab) */}
        <View className="mb-6">
          <Text className="text-text-primary font-semibold text-lg mb-4">
            {tab === "active" ? "Active Batches" : "Ended Batches"}
          </Text>

          {batchesLoading ? (
            <View className="items-center py-8">
              <ActivityIndicator color={colors.brand.ai} />
            </View>
          ) : visibleBatches.length === 0 ? (
            <View className="bg-surface border border-border rounded-card p-6 items-center">
              <Text className="text-text-secondary text-center">
                {batches.length === 0
                  ? "No batches yet. Create one to combine students into a shared class."
                  : tab === "active"
                    ? "No active batches right now."
                    : "No ended batches yet. Ended classes will appear here."}
              </Text>
            </View>
          ) : (
            visibleBatches.map((batch) => {
              const members = (membersByBatch[batch.batchId] ?? []) as {
                memberId: string;
                studentName: string;
                studentAvatar: string | null;
              }[];
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
                  className="bg-surface border border-border rounded-card p-5 mb-4 active:opacity-80"
                >
                  {/* Header row */}
                  <View className="flex-row justify-between items-start mb-3">
                    <View className="flex-1 pr-3">
                      <Text className="text-text-primary font-semibold text-lg">
                        {batch.name}
                      </Text>
                      <Text className="text-text-secondary">
                        {batch.subject} • Rs {batch.monthlyRateNpr.toLocaleString()}/student/mo
                      </Text>
                      {batch.status === "ended" && batch.endedAt ? (
                        <Text className="text-text-muted text-xs mt-0.5">
                          Ended {formatEnded(batch.endedAt)}
                        </Text>
                      ) : null}
                    </View>
                    {batch.status === "active" ? (
                      <View className="bg-success/10 px-3 py-1 rounded-pill">
                        <Text className="text-success text-xs font-medium">Active</Text>
                      </View>
                    ) : (
                      <View className="bg-text-muted/10 px-3 py-1 rounded-pill">
                        <Text className="text-text-muted text-xs font-medium">Ended</Text>
                      </View>
                    )}
                  </View>

                  {/* Seats / members */}
                  <View className="mb-4">
                    <View className="flex-row justify-between mb-1.5">
                      <Text className="text-text-secondary text-xs">Students</Text>
                      <Text className="text-text-primary text-xs">
                        {members.length} in batch
                      </Text>
                    </View>
                    <View className="h-1.5 bg-border rounded-pill overflow-hidden">
                      <View
                        className="h-1.5 bg-ai rounded-pill"
                        style={{ width: `${Math.min(100, (members.length / MAX_BATCH_MEMBERS) * 100)}%` }}
                      />
                    </View>
                  </View>

                  {/* Days */}
                  <View className="flex-row gap-2 mb-4 flex-wrap">
                    {batch.slotKeys.map((slotKey) => (
                      <View
                        key={slotKey}
                        className="bg-background px-3 py-1 rounded-pill"
                      >
                        <Text className="text-text-secondary text-xs">
                          {formatSlotKey(slotKey)}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {/* Students */}
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <View className="flex-row -space-x-2">
                        {members.slice(0, 3).map((member) => (
                          <View
                            key={member.memberId}
                            className="w-8 h-8 rounded-pill border-2 border-surface overflow-hidden"
                          >
                            <Avatar
                              name={member.studentName}
                              imageUri={member.studentAvatar}
                              size={32}
                            />
                          </View>
                        ))}
                      </View>
                      {members.length > 3 && (
                        <Text className="text-text-secondary text-sm ml-3">
                          +{members.length - 3}
                        </Text>
                      )}
                    </View>
                    {members.length > 0 && batch.status === "active" && (
                      <Pressable
                        onPress={() => handleRemoveMember(batch, members[0].memberId)}
                        className="px-2 py-1 active:opacity-70"
                      >
                        <Text className="text-danger text-xs">Remove</Text>
                      </Pressable>
                    )}
                  </View>
                </Pressable>
              );
            })
          )}
        </View>
      </ScreenScroll>

      <TutorBottomBar />

      {/* ── Creation wizard (bottom sheet) ── */}
      {wizardOpen && (
        <View className="absolute inset-0 bg-black/70 justify-end">
          <View
            className="bg-surface rounded-t-xl h-[85%] px-6 pt-6"
            style={{ paddingBottom: 24 + insets.bottom }}
          >
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-semibold text-text-primary">
                {wizardStep === 1 ? "Pick students" : wizardStep === 2 ? "Batch details" : "Review & create"}
              </Text>
              <Pressable onPress={closeWizard}>
                <Text className="text-ai">Cancel</Text>
              </Pressable>
            </View>

            {/* Step indicator */}
            <View className="flex-row gap-1.5 mb-5">
              {[1, 2, 3].map((step) => (
                <View
                  key={step}
                  className={`h-1 flex-1 rounded-pill ${wizardStep >= step ? "bg-accent" : "bg-border"}`}
                />
              ))}
            </View>

            {wizardStep === 1 && (
              <>
                <Text className="text-text-secondary mb-1">
                  Step 1 of 3 — select {MIN_MEMBERS}-{MAX_BATCH_MEMBERS} enrolled students.
                </Text>
                <Text className="text-text-muted text-xs mb-4">
                  {selectedStudents.length}/{MAX_BATCH_MEMBERS} selected
                </Text>

                <ScrollView className="flex-1">
                  {rosterLoading ? (
                    <View className="items-center py-10">
                      <ActivityIndicator color={colors.brand.ai} />
                    </View>
                  ) : roster.length === 0 ? (
                    <View className="bg-background rounded-card p-6 items-center">
                      <Text className="text-text-secondary text-center">
                        No active students yet. Accept enrollment requests from your inbox first.
                      </Text>
                    </View>
                  ) : (
                    roster.map((student) => {
                      const selected = selectedEnrollments.includes(student.enrollmentId);
                      const atCap = !selected && selectedEnrollments.length >= MAX_BATCH_MEMBERS;
                      return (
                        <Pressable
                          key={student.enrollmentId}
                          onPress={() => toggleStudent(student.enrollmentId)}
                          disabled={atCap}
                          className={`flex-row items-center gap-3 p-3 rounded-card mb-2 border ${
                            selected
                              ? "border-accent bg-accent-light"
                              : "border-border bg-background"
                          } ${atCap ? "opacity-50" : ""}`}
                        >
                          <Avatar
                            name={student.studentName}
                            imageUri={student.studentAvatar}
                            size={36}
                          />
                          <View className="flex-1 min-w-0">
                            <Text className="text-text-primary font-medium">
                              {student.studentName}
                            </Text>
                            <Text className="text-text-muted text-xs" numberOfLines={1}>
                              {student.studentGrade} · {student.subjects.slice(0, 2).join(", ")}
                              {student.slotKey ? ` · ${formatSlotKey(student.slotKey)}` : ""}
                            </Text>
                          </View>
                          <View
                            className={`w-6 h-6 rounded-pill border-2 items-center justify-center ${
                              selected ? "bg-accent border-accent" : "border-text-muted"
                            }`}
                          >
                            {selected && <Text className="text-white text-xs">✓</Text>}
                          </View>
                        </Pressable>
                      );
                    })
                  )}
                </ScrollView>

                <Pressable
                  onPress={() => setWizardStep(2)}
                  disabled={!canContinueToDetails}
                  className={`py-4 rounded-card mt-4 items-center ${
                    canContinueToDetails ? "bg-ai" : "bg-text-muted/20"
                  }`}
                >
                  <Text className="text-white font-semibold">
                    Continue ({selectedStudents.length})
                  </Text>
                </Pressable>
              </>
            )}

            {wizardStep === 2 && (
              <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
                <Text className="text-text-secondary mb-4">
                  Step 2 of 3 — name, subject, fee & schedule.
                </Text>

                <Text className="text-text-muted text-xs mb-1">Batch name</Text>
                <TextInput
                  value={batchName}
                  onChangeText={setBatchName}
                  placeholder="e.g. Grade 10 Maths Batch A"
                  placeholderTextColor={colors.text.muted}
                  className="bg-background border border-border rounded-card px-4 py-3 text-text-primary mb-4"
                />

                <Text className="text-text-muted text-xs mb-1">Subject</Text>
                <View className="flex-row flex-wrap gap-2 mb-3">
                  {COMMON_SUBJECTS.map((subject) => {
                    const selected = batchSubject === subject;
                    return (
                      <Pressable
                        key={subject}
                        onPress={() => setBatchSubject(subject)}
                        className={`px-3 py-1.5 rounded-pill border ${
                          selected ? "bg-accent border-accent" : "border-border bg-background"
                        }`}
                      >
                        <Text className={selected ? "text-white text-xs" : "text-text-secondary text-xs"}>
                          {subject}
                        </Text>
                      </Pressable>
                    );
                  })}
                  <Pressable
                    onPress={() => setBatchSubject("__other")}
                    className={`px-3 py-1.5 rounded-pill border ${
                      batchSubject === "__other" ? "bg-accent border-accent" : "border-border bg-background"
                    }`}
                  >
                    <Text className={batchSubject === "__other" ? "text-white text-xs" : "text-text-secondary text-xs"}>
                      Other…
                    </Text>
                  </Pressable>
                </View>
                {batchSubject === "__other" && (
                  <TextInput
                    value={customSubject}
                    onChangeText={setCustomSubject}
                    placeholder="Custom subject"
                    placeholderTextColor={colors.text.muted}
                    className="bg-background border border-border rounded-card px-4 py-3 text-text-primary mb-3"
                  />
                )}

                <Text className="text-text-muted text-xs mb-1">Monthly fee (NPR / student)</Text>
                <TextInput
                  value={feeText}
                  onChangeText={setFeeText}
                  placeholder="e.g. 2200"
                  placeholderTextColor={colors.text.muted}
                  keyboardType="numeric"
                  className="bg-background border border-border rounded-card px-4 py-3 text-text-primary mb-4"
                />

                <Text className="text-text-muted text-xs mb-1">Schedule (days)</Text>
                <View className="flex-row flex-wrap gap-2 mb-6">
                  {DAY_KEYS.map((day) => {
                    const selected = slotKeys.some((k) => k.startsWith(`${day}:`));
                    return (
                      <Pressable
                        key={day}
                        onPress={() => {
                          const existing = slotKeys.filter((k) => !k.startsWith(`${day}:`));
                          if (selected) {
                            setSlotKeys(existing);
                          } else {
                            setSlotKeys([...existing, `${day}:5-7`]);
                          }
                        }}
                        className={`px-4 py-2 rounded-pill border ${
                          selected ? "bg-accent border-accent" : "border-border bg-background"
                        }`}
                      >
                        <Text className={selected ? "text-white text-xs font-medium" : "text-text-secondary text-xs font-medium"}>
                          {DAY_LABELS[day]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                {slotKeys.length > 0 && (
                  <View className="flex-row flex-wrap gap-2 mb-2">
                    {slotKeys.map((k) => (
                      <View key={k} className="bg-ai/10 px-2 py-0.5 rounded-pill">
                        <Text className="text-ai text-xs">{formatSlotKey(k)}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {conflictingSlots.length > 0 && (
                  <View className="bg-danger/10 border border-danger/30 rounded-card p-3 flex-row items-start gap-2 mb-2">
                    <Ionicons name="warning-outline" size={16} color={colors.semantic.danger} />
                    <Text className="flex-1 text-xs text-danger leading-relaxed">
                      {conflictingSlots.map(formatSlotKey).join(", ")}{" "}
                      {conflictingSlots.length === 1 ? "overlaps" : "overlap"} a slot
                      that&apos;s already booked. Pick different days.
                    </Text>
                  </View>
                )}
              </ScrollView>
            )}

            {wizardStep === 3 && (
              <ScrollView className="flex-1">
                <Text className="text-text-secondary mb-4">
                  Step 3 of 3 — confirm the batch.
                </Text>
                <View className="bg-background rounded-card p-4 gap-2 mb-4">
                  <Text className="text-text-primary font-semibold">{batchName.trim()}</Text>
                  <Text className="text-text-secondary">
                    {finalSubject} · Rs {Number(feeText).toLocaleString()}/student/mo
                  </Text>
                  <View className="flex-row flex-wrap gap-1.5 mt-1">
                    {slotKeys.map((k) => (
                      <View key={k} className="bg-surface border border-border px-2 py-0.5 rounded-pill">
                        <Text className="text-text-secondary text-xs">{formatSlotKey(k)}</Text>
                      </View>
                    ))}
                  </View>
                  <Text className="text-text-muted text-xs mt-2">
                    {selectedStudents.length} student{selectedStudents.length === 1 ? "" : "s"}:
                    {" "}
                    {selectedStudents.map((s) => s.studentName).join(", ")}
                  </Text>
                  {conflictingSlots.length > 0 && (
                    <Text className="text-danger text-xs mt-2">
                      ⚠ {conflictingSlots.map(formatSlotKey).join(", ")}{" "}
                      {conflictingSlots.length === 1 ? "overlaps" : "overlap"} a
                      booked slot — this batch can&apos;t be saved yet.
                    </Text>
                  )}
                </View>
                <Pressable
                  onPress={() => setWizardStep(2)}
                  className="py-3 items-center active:opacity-70"
                >
                  <Text className="text-ai">← Edit details</Text>
                </Pressable>
              </ScrollView>
            )}

            {/* Footer actions */}
            {wizardStep === 2 && (
              <View className="flex-row gap-3 mt-4">
                <Pressable
                  onPress={() => setWizardStep(1)}
                  className="flex-1 py-4 rounded-card items-center bg-background border border-border active:opacity-70"
                >
                  <Text className="text-text-primary font-semibold">Back</Text>
                </Pressable>
                <Pressable
                  onPress={() => setWizardStep(3)}
                  disabled={!canSubmit}
                  className={`flex-1 py-4 rounded-card items-center ${
                    canSubmit ? "bg-ai" : "bg-text-muted/20"
                  }`}
                >
                  <Text className="text-white font-semibold">Review</Text>
                </Pressable>
              </View>
            )}
            {wizardStep === 3 && (
              <View className="mt-4">
                <Pressable
                  onPress={() => void handleCreate()}
                  disabled={creating}
                  className={`py-4 rounded-card items-center ${
                    creating ? "bg-text-muted/30" : "bg-accent"
                  }`}
                >
                  {creating ? (
                    <ActivityIndicator color={colors.text.inverse} />
                  ) : (
                    <Text className="text-white font-semibold">Save Batch</Text>
                  )}
                </Pressable>
              </View>
            )}
          </View>
        </View>
      )}
    </ScreenLayout>
  );
}
