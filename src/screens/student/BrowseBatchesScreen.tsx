/**
 * EdumentX — Browse Open Batches (student, S-15 Figma upgrade)
 *
 * Student-facing marketplace list of every tutor's ACTIVE group
 * batches. Matches the Figma "Browse open batches" screen:
 *   - Search bar (subject / tutor / area free-text)
 *   - Batch cards: subject chip, "with {tutor}", schedule (from
 *     slotKeys), capacity meter, X/Y students, price per student,
 *     "Request to join" CTA
 *   - Live data via `BatchesRepository.subscribePublicBatches`
 *     (collectionGroup over `classes`, enriched with the tutor's
 *     display name + avatar; member counts come from the
 *     denormalized `memberCount` on the batch doc).
 *
 * "Request to join" pushes the S-12 enrollment form with the batch's
 * tutor — the student picks one-to-one or session-code mode there.
 */

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, Pressable, Text, TextInput, View } from "react-native";

import { SeatsRing } from "@/components/domain/SeatsRing";
import {
  ScreenLayout,
  ScreenHeader,
  ScreenScroll,
} from "@/components/shared/ScreenLayout";
import { colors } from "@/constants/colors";
import { getBatchesRepository } from "@/services/batches/dataSource";
import { getEnrollmentRepository } from "@/services/enrollments/dataSource";
import { sortBatchesForBrowse } from "@/services/enrollments/derived";
import {
  DAY_LABELS,
  MAX_BATCH_MEMBERS,
  parseSlotKey,
  TIME_SLOT_LABELS,
} from "@/services/enrollments/types";
import { useAuthStore } from "@/store/authStore";
import type { Batch } from "@/services/batches/types";

/** Format a `day:slot` key as a short schedule fragment. */
function formatSlotKey(key: string): string {
  const parsed = parseSlotKey(key);
  if (!parsed) return key;
  return `${DAY_LABELS[parsed.day]} ${TIME_SLOT_LABELS[parsed.slot]}`;
}

export function BrowseBatchesScreen() {
  const router = useRouter();
  const studentUid = useAuthStore((s) => s.user?.uid ?? null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState("");

  // Zero-trust contextual filtering: a student only sees open
  // batches from tutors they are CURRENTLY enrolled with. The
  // enrollments subscription resolves the tutor set; the batches
  // subscription then runs a Firestore `in` query scoped to those
  // tutors — the marketplace never fetches unrelated tutors' batches.
  useEffect(() => {
    if (!studentUid) {
      setBatches([]);
      setLoaded(true);
      return;
    }
    const enrRepo = getEnrollmentRepository();
    const batchRepo = getBatchesRepository();
    let batchUnsub: (() => void) | null = null;
    const enrUnsub = enrRepo.subscribeEnrollmentsByStudent(
      studentUid,
      (enrollments) => {
        // Only ACTIVE enrollments count — removed/expired students
        // lose access to that tutor's batches too.
        const tutorUids = [
          ...new Set(
            enrollments
              .filter((e) => e.status === "active")
              .map((e) => e.tutorUid),
          ),
        ];
        batchUnsub?.();
        batchUnsub = batchRepo.subscribePublicBatches(
          (list) => {
            setBatches(list);
            setLoaded(true);
          },
          (err) => {
            console.warn("BrowseBatchesScreen: subscribePublicBatches failed", err);
            setLoaded(true);
          },
          tutorUids,
        );
      },
      (err) => {
        console.warn("BrowseBatchesScreen: enrollments subscribe failed", err);
        setLoaded(true);
      },
    );
    return () => {
      enrUnsub();
      batchUnsub?.();
    };
  }, [studentUid]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? batches.filter((b) =>
          [b.subject, b.name, b.tutorName ?? "", b.tutorUid]
            .join(" ")
            .toLowerCase()
            .includes(q),
        )
      : batches;
    // Search filter first, then the seats-first sort (extracted to
    // `sortBatchesForBrowse` so it's unit-tested in testDerived.ts).
    return sortBatchesForBrowse(base);
  }, [batches, query]);

  return (
    <ScreenLayout variant="background">
      <ScreenHeader variant="light">
        <Text className="text-body text-text-secondary mb-0.5">Browse open batches</Text>
        <Text className="text-screen-title font-medium text-text-primary">
          Join a group class
        </Text>
      </ScreenHeader>

      {/* Search */}
      <View className="px-5 pb-2">
        <View className="flex-row items-center gap-2.5 bg-surface border border-border rounded-card h-12 px-3.5">
          <Ionicons name="search-outline" size={16} color={colors.text.muted} />
          <TextInput
            accessibilityLabel="Search batches"
            value={query}
            onChangeText={setQuery}
            placeholder="Search subject, tutor, area"
            placeholderTextColor={colors.text.muted}
            className="flex-1 text-body text-text-primary"
          />
        </View>
      </View>

      <ScreenScroll>
        {!loaded ? (
          <View className="items-center justify-center pt-16">
            <ActivityIndicator size="small" color={colors.brand.primary} />
            <Text className="text-caption text-text-muted mt-3">Loading batches…</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View className="items-center justify-center pt-16 px-6">
            <View className="w-14 h-14 rounded-pill bg-ai-light items-center justify-center mb-3">
              <Ionicons name="people-outline" size={26} color={colors.brand.ai} />
            </View>
            <Text className="text-card-title font-medium text-text-primary text-center">
              {query ? "No matching batches" : "No open batches yet"}
            </Text>
            <Text className="text-body text-text-secondary text-center mt-1.5">
              {query
                ? "Try a different subject or tutor name."
                : "Batches from your enrolled tutors appear here. Enroll with a tutor to see their open group classes."}
            </Text>
          </View>
        ) : (
          <View className="px-5 pb-6 gap-3">
            {filtered.map((b) => {
              const pct = Math.min(
                100,
                Math.round(((b.memberCount ?? 0) / MAX_BATCH_MEMBERS) * 100),
              );
              const seatsLeft = MAX_BATCH_MEMBERS - (b.memberCount ?? 0);
              return (
                <Pressable
                  key={`${b.tutorUid}-${b.batchId}`}
                  accessibilityRole="button"
                  accessibilityLabel={`View ${b.subject} batch details`}
                  onPress={() =>
                    router.push({
                      pathname: `/batch/${b.tutorUid}/${b.batchId}`,
                    } as never)
                  }
                  className="bg-surface border border-border rounded-card p-4 active:opacity-80"
                >
                  {/* Top row: subject chip + seats left */}
                  <View className="flex-row items-center justify-between mb-2">
                    <View className="bg-ai-light px-2 py-1 rounded-sm">
                      <Text className="text-micro text-ai font-medium">
                        {b.subject}
                      </Text>
                    </View>
                    {/* Seats-remaining ring */}
                    <SeatsRing seatsLeft={seatsLeft} max={MAX_BATCH_MEMBERS} />
                  </View>

                  {/* Tutor row */}
                  <View className="flex-row items-center gap-2 mb-2">
                    <View className="w-6 h-6 rounded-pill bg-surface-muted items-center justify-center overflow-hidden">
                      {b.tutorAvatar ? (
                        <Image source={{ uri: b.tutorAvatar }} className="w-full h-full" />
                      ) : (
                        <Ionicons name="person" size={13} color={colors.text.muted} />
                      )}
                    </View>
                    <Text className="text-body-sm font-medium text-text-primary flex-1">
                      with {b.tutorName ?? `Tutor ${b.tutorUid.slice(0, 6)}`}
                    </Text>
                  </View>

                  {/* Meta: schedule */}
                  <View className="flex-row items-center gap-1.5 mb-2">
                    <Ionicons name="time-outline" size={12} color={colors.text.muted} />
                    <Text className="text-caption text-text-muted flex-1">
                      {b.slotKeys.length > 0
                        ? b.slotKeys.map(formatSlotKey).join(" · ")
                        : b.startDate}
                    </Text>
                  </View>

                  {/* Capacity meter */}
                  <View className="h-1.5 rounded-pill bg-sand overflow-hidden mb-2">
                    <View
                      className={`h-full rounded-pill ${
                        pct >= 80 ? "bg-accent" : "bg-verification"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </View>

                  {/* Students + price */}
                  <View className="flex-row items-center justify-between">
                    <Text className="text-caption text-text-muted">
                      {b.memberCount ?? 0}/{MAX_BATCH_MEMBERS} students
                    </Text>
                    <Text className="text-body-sm font-medium text-text-primary">
                      Rs {b.monthlyRateNpr.toLocaleString()}/mo each
                    </Text>
                  </View>

                  {/* Request to join */}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Request to join ${b.subject} batch`}
                    onPress={() =>
                      router.push({
                        pathname: "/enroll",
                        params: {
                          tutorId: b.tutorUid,
                          batchId: b.batchId,
                        },
                      } as never)
                    }
                    className="w-full h-11 mt-3 rounded-card bg-primary items-center justify-center active:opacity-80"
                  >
                    <Text className="text-button-sm font-semibold text-white">
                      Request to join
                    </Text>
                  </Pressable>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScreenScroll>
    </ScreenLayout>
  );
}
