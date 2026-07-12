import { Ionicons } from "@expo/vector-icons";
import { getApp } from "@react-native-firebase/app";
import {
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  writeBatch
} from "@react-native-firebase/firestore";
import { useRouter } from "expo-router";
import { ScreenLayout } from "@/components/shared/ScreenLayout";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { ChipGroup } from "@/components/forms/ChipGroup";
import { DocumentUploader } from "@/components/forms/DocumentUploader";
import { LocationField } from "@/components/forms/LocationField";
import { colors } from "@/constants/colors";
import type { LocationValue } from "@/lib/registration";
import { TUTOR_DOC_LABEL, type TutorDocument } from "@/lib/verification/documents";
import { useAuthStore } from "@/store/authStore";

const SUBJECTS = [
  "Math",
  "Physics",
  "Chemistry",
  "Computer Science",
  "Biology",
  "Nepali",
  "English",
] as const;

const GRADES = [
  "Grade 1-5",
  "Grade 6-8",
  "Grade 9-10",
  "Grade XI (Science)",
  "Grade XI (Management)",
  "Grade XII (Science)",
  "Grade XII (Management)",
  "Test Prep",
  "Language",
] as const;

const RATE_MIN = 0;
const RATE_MAX = 200000;

type FormErrors = {
  monthlyRate?: string;
  subjects?: string;
  grades?: string;
  location?: string;
  citizenship?: string;
  certificate?: string;
};

type InitialValues = {
  subjects: string[];
  gradesTeaching: string[];
  monthlyRateNpr: number;
  location: LocationValue | null;
  documents: TutorDocument[];
  /** Current avatar URL — propagated into the `current` snapshot
   *  so the admin queue can render the tutor's profile picture
   *  on the PendingEditCard. */
  photoUrl: string | null;
};

/**
 * EdumentX — Edit teaching details (`/tutor_edit_teaching_details`).
 *
 * The high-risk half of model-B (`lib/verification/editableFields.ts`):
 * changes here are NOT applied to the live profile on save. They
 * land in a `tutorProfileUpdates/{uid}` doc with `status: "pending"`,
 * which the admin queue reviews. While the doc is pending, the
 * tutor's live profile stays as it was and the layout guard routes
 * them back to `/tutor-pending` so the rest of the dashboard is
 * blocked.
 *
 * The flow:
 *
 *   1. Tutor opens this screen from `/tutor_edit_profile`'s
 *      "Subjects, rate & location" row.
 *   2. The form hydrates from the live profile doc (NOT from any
 *      existing pending update) — the "you have a pending update,
 *      what you see is the OLD profile" mental model.
 *   3. Tutor edits the four high-risk fields + the three doc
 *      upload slots. Documents are uploaded to Supabase on
 *      "Save changes" (or the user can discard any draft
 *      re-upload by closing the picker).
 *   4. "Save changes" does a 3-way writeBatch:
 *        a. `users/{uid}/tutorProfile/default` — set
 *           `hasPendingUpdate: true` and stamp `verificationStatus:
 *           "pending"`. The tutor's dashboard's `ReviewBanner` picks
 *           this up on the next render.
 *        b. `tutorProfileUpdates/{uid}` — write the proposed
 *           values + documents list, status "pending".
 *        c. `notifications/{uid}/{id}` — admin's queue already
 *           reads from (b); we don't write a notification doc here
 *           because the admin's UI is the discoverability channel.
 *   5. "Discard" navigates back with NO writes. The local
 *      `documents` Map is in-memory only; we never persist a partial
 *      state.
 *
 * Why we also include the docs on this screen: a tutor who
 * replaces their citizenship scan mid-cycle needs the same
 * re-review path as a rate change. The admin needs to see the
 * new doc attached to the same pending-update doc so they can
 * re-vet the tutor in one pass.
 */
export function EditTeachingDetails() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [initial, setInitial] = useState<InitialValues | null>(null);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [gradesTeaching, setGradesTeaching] = useState<string[]>([]);
  const [monthlyRateNpr, setMonthlyRateNpr] = useState("");
  const [location, setLocation] = useState<LocationValue | null>(null);
  // Per-kind doc re-uploads. We start from the *current* docs
  // (so re-uploading one kind doesn't blank the others), but the
  // *proposed* list sent to the admin only includes a kind if the
  // tutor touched it this session. See `buildProposedChanges`.
  const [documents, setDocuments] = useState<Map<string, TutorDocument>>(
    () => new Map(),
  );

  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // One-shot hydrate from the live profile. We do NOT use
  // onSnapshot — this screen is the *source* of writes (a re-review
  // writeBatch), and a live mirror would re-render the inputs
  // mid-typing. If the profile changes underneath us while the
  // tutor is editing, the change shows up next time they navigate
  // in.
  useEffect(() => {
    if (!user) {
      setLoaded(true);
      return;
    }
    const db = getFirestore(getApp());
    const profileRef = doc(
      db,
      "users",
      user.uid,
      "tutorProfile",
      "default",
    );
    let cancelled = false;
    getDoc(profileRef)
      .then((snap) => {
        if (cancelled) return;
        const d = snap.data() as
          | {
              subjects?: string[];
              gradesTeaching?: string[];
              monthlyRateNpr?: number;
              location?: LocationValue | null;
              documents?: TutorDocument[];
              /** Avatar URL — included in the `current` snapshot so
               *  the admin queue's PendingEditCard can render the
               *  tutor's actual profile picture instead of a DiceBear
               *  fallback. See `screens/admin/VerificationQueue.tsx`
               *  `avatar: data.current?.photoUrl ?? dicebear`. */
              photoUrl?: string | null;
            }
          | undefined;
        const docs = Array.isArray(d?.documents) ? d!.documents : [];
        const init: InitialValues = {
          subjects: Array.isArray(d?.subjects) ? d!.subjects : [],
          gradesTeaching: Array.isArray(d?.gradesTeaching)
            ? d!.gradesTeaching
            : [],
          monthlyRateNpr:
            typeof d?.monthlyRateNpr === "number" ? d!.monthlyRateNpr : 0,
          location: d?.location ?? null,
          documents: docs,
          // Capture the current photoUrl so the `current` snapshot
          // in tutorProfileUpdates includes it for the admin queue.
          photoUrl: typeof d?.photoUrl === "string" ? d.photoUrl : null,
        };
        setInitial(init);
        setSubjects(init.subjects);
        setGradesTeaching(init.gradesTeaching);
        setMonthlyRateNpr(
          init.monthlyRateNpr > 0 ? String(init.monthlyRateNpr) : "",
        );
        setLocation(init.location);
        // Seed the in-memory `documents` Map from the existing
        // docs so the form knows which kinds already have a file.
        const map = new Map<string, TutorDocument>();
        for (const doc of docs) {
          map.set(doc.kind, doc);
        }
        setDocuments(map);
        setLoaded(true);
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn("EditTeachingDetails: read failed", err);
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  function toggleSubject(option: string) {
    setSubjects((prev) =>
      prev.includes(option)
        ? prev.filter((s) => s !== option)
        : [...prev, option],
    );
  }

  function toggleGrade(option: string) {
    setGradesTeaching((prev) =>
      prev.includes(option)
        ? prev.filter((g) => g !== option)
        : [...prev, option],
    );
  }

  const monthlyRateNumber = Number(monthlyRateNpr);
  const isValidRate =
    monthlyRateNpr.trim().length > 0 &&
    !Number.isNaN(monthlyRateNumber) &&
    monthlyRateNumber >= RATE_MIN &&
    monthlyRateNumber <= RATE_MAX;

  const citizenshipDoc = documents.get("citizenship") ?? null;
  const certificateDoc = documents.get("certificate") ?? null;
  const demoDoc = documents.get("demo") ?? null;

  // Compare the form's current values against the *original*
  // initial values. We only push a `proposed` payload if at least
  // one field actually moved — a tutor who opens the screen and
  // taps "Discard" without touching anything shouldn't create an
  // empty admin queue entry.
  const hasChanges =
    !!initial &&
    (subsetsDiffer(initial.subjects, subjects) ||
      subsetsDiffer(initial.gradesTeaching, gradesTeaching) ||
      (initial.monthlyRateNpr ?? 0) !== (isValidRate ? monthlyRateNumber : 0) ||
      !locationsEqual(initial.location, location) ||
      docKindListChanged(initial.documents, documents));

  const canSubmit =
    !!initial &&
    hasChanges &&
    subjects.length >= 1 &&
    gradesTeaching.length >= 1 &&
    isValidRate &&
    location !== null &&
    location.city.trim().length > 0 &&
    (citizenshipDoc !== null || initialHasDoc(initial.documents, "citizenship")) &&
    (certificateDoc !== null || initialHasDoc(initial.documents, "certificate"));

  function handleDiscard() {
    // No writes — just navigate back. The `documents` Map is
    // memory-only so any re-uploads a user did this session are
    // already orphaned on Supabase's side (the storage helper
    // upserts, but the previous file is still there; admins only
    // look at the doc list attached to the pending-update doc,
    // which we never wrote).
    router.back();
  }

  async function handleSave() {
    if (!user || !initial) return;
    if (!canSubmit) return;

    const validationErrors: FormErrors = {};
    if (subjects.length < 1) {
      validationErrors.subjects = "Select at least one subject.";
    }
    if (gradesTeaching.length < 1) {
      validationErrors.grades = "Select at least one grade level.";
    }
    if (!isValidRate) {
      validationErrors.monthlyRate = `Enter a monthly rate between Rs ${RATE_MIN} and Rs ${RATE_MAX.toLocaleString()}.`;
    }
    if (location === null || location.city.trim().length === 0) {
      validationErrors.location = "Pick a city and neighborhood.";
    }
    if (!citizenshipDoc && !initialHasDoc(initial.documents, "citizenship")) {
      validationErrors.citizenship = "Upload a citizenship ID.";
    }
    if (!certificateDoc && !initialHasDoc(initial.documents, "certificate")) {
      validationErrors.certificate = "Upload an academic certificate.";
    }
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSaving(true);
    try {
      const db = getFirestore(getApp());
      const userRef = doc(db, "users", user.uid);
      const profileRef = doc(
        db,
        "users",
        user.uid,
        "tutorProfile",
        "default",
      );
      const updateRef = doc(db, "tutorProfileUpdates", user.uid);
      const now = serverTimestamp();

      // Build the `proposed` payload. Only include the fields the
      // tutor actually changed — admins see a tighter diff and
      // there's no chance of an unrelated re-write landing on the
      // profile if a future change flipped a sibling field.
      const proposed: Record<string, unknown> = {};
      if (subsetsDiffer(initial.subjects, subjects)) {
        proposed.subjects = subjects;
      }
      if (subsetsDiffer(initial.gradesTeaching, gradesTeaching)) {
        proposed.gradesTeaching = gradesTeaching;
      }
      if (initial.monthlyRateNpr !== monthlyRateNumber) {
        proposed.monthlyRateNpr = monthlyRateNumber;
      }
      if (!locationsEqual(initial.location, location)) {
        proposed.location = location;
      }

      // Document changes: if the user re-uploaded a kind this
      // session, replace it in the proposed list. Otherwise the
      // initial doc carries over. We materialize the full list
      // here (not just the diff) so the admin sees the new
      // "complete state" of the tutor's docs.
      const proposedDocs: TutorDocument[] = mergeDocs(
        initial.documents,
        documents,
      );
      if (
        docsListDiffers(
          initial.documents,
          proposedDocs,
        )
      ) {
        proposed.documents = proposedDocs;
      }

      const batch = writeBatch(db);

      // 1. Mirror role + verification flags on the profile so the
      //    tutor's own dashboard's `ReviewBanner` flips to "pending"
      //    on the next render. The flags are denormalized from
      //    tutorProfileUpdates/{uid} but we also stamp them here
      //    so a cold render (no listener yet) shows the right
      //    banner.
      batch.set(
        profileRef,
        {
          hasPendingUpdate: true,
          // `verificationStatus` is unchanged at the profile
          // level — the existing "approved" or "rejected" status
          // refers to the *initial* review, not the high-risk
          // edit. The admin queue reads `tutorProfileUpdates`
          // directly to decide what's pending.
          updatedAt: now,
        },
        { merge: true },
      );

      // 2. The pending update itself. The admin queue's
      //    `applyEditApproval` reads `proposed` to know what to
      //    merge into the live profile on approval.
      batch.set(
        updateRef,
        {
          uid: user.uid,
          fullName: initial.subjects ? user.displayName ?? null : null,
          email: user.email ?? null,
          current: {
            subjects: initial.subjects,
            gradesTeaching: initial.gradesTeaching,
            monthlyRateNpr: initial.monthlyRateNpr,
            location: initial.location,
            documents: initial.documents,
            // Include the current avatar URL so the admin queue's
            // PendingEditCard can render the tutor's real photo
            // instead of DiceBear. The `photoUrl` is a live-editable
            // field (see `lib/verification/editableFields.ts`) and
            // lives on the profile doc.
            photoUrl: initial.photoUrl,
          },
          proposed,
          documents: proposedDocs,
          status: "pending",
          adminNotes: null,
          reviewedBy: null,
          reviewedAt: null,
          submittedAt: now,
          updatedAt: now,
        },
        { merge: true },
      );

      // 3. Touch the user doc's `updatedAt` so the dashboard
      //    sub-screens that listen to it re-render.
      batch.set(userRef, { updatedAt: now }, { merge: true });

      await batch.commit();

      // Mark the local store as "pending edit under review" so
      // the layout guard routes to /tutor-pending on the next
      // render. The dashboard's `ReviewBanner` reads
      // `hasPendingUpdate` off the doc directly, so this is the
      // *guard* flip, not the *banner* flip.
      // For a verified tutor submitting an update, we navigate back
      // to the tutor dashboard instead of /tutor-pending. The profile
      // doc already has `hasPendingUpdate: true` (written by the batch
      // above), so the dashboard's `ReviewBanner` will show the
      // "under review" message. We do NOT set the store's
      // `tutorVerificationStatus` to "pending" — that would trigger
      // the layout guard (app/_layout.tsx) to block the dashboard and
      // route to /tutor-pending, creating a flicker. The tutor stays
      // on the dashboard with a banner until the admin acts.
      router.replace("/tutor-home");
    } catch (err) {
      console.error("EditTeachingDetails: writeBatch failed", err);
      const code =
        (err as { code?: string } | null)?.code ??
        (err as Error)?.message ??
        "Unknown error";
      Alert.alert(
        "Could not submit changes",
        `Please try again.\n\nError: ${code}`,
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScreenLayout variant="background">

      {/* Hero header — slate, matches the other tutor surfaces. */}
      <View className="bg-night px-5 pb-6 shrink-0">
        <View className="flex-row items-center gap-3 mt-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => router.back()}
            className="w-10 h-10 rounded-pill bg-white/10 items-center justify-center active:opacity-70"
          >
            <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-body text-white/70 mb-0.5">
              Profile · Teaching details
            </Text>
            <Text className="text-screen-title font-medium text-white">
              Edit subjects &amp; rate
            </Text>
          </View>
        </View>
        <Text className="text-caption text-white/70 mt-2">
          Changes here go back to the verification team for a re-review.
          You can keep using the rest of EdumentX while we look at them.
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pt-6 pb-8"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {!loaded ? (
          <View className="items-center pt-12">
            <ActivityIndicator color={colors.brand.primary ?? "#26302B"} />
          </View>
        ) : initial ? (
          <>
            <ChipGroup
              label="Subjects you teach"
              options={SUBJECTS}
              selected={subjects}
              onToggle={toggleSubject}
              error={errors.subjects}
            />

            <View className="h-4" />

            <ChipGroup
              label="Grade levels you teach"
              options={GRADES}
              selected={gradesTeaching}
              onToggle={toggleGrade}
              error={errors.grades}
            />

            {/* Monthly rate — same shape as the onboarding form,
                but no stepper. We use a TextInput directly so
                the user can type any value within the cap. */}
            <View className="mt-4 gap-4 p-5 border border-border rounded-card bg-surface">
              <Text className="text-overline text-text-muted uppercase">
                Monthly rate (NPR)
              </Text>
              <View
                className={`flex-row items-center h-rate-row px-3 border-emphasis rounded-card bg-surface gap-1 ${
                  errors.monthlyRate ? "border-danger" : "border-border"
                }`}
              >
                <Text className="text-body text-text-muted font-semibold">
                  Rs.
                </Text>
                <TextInput
                  value={monthlyRateNpr}
                  onChangeText={setMonthlyRateNpr}
                  placeholder="10000"
                  placeholderTextColor={colors.text.muted}
                  keyboardType="numeric"
                  className="flex-1 text-text-primary text-body-lg font-semibold"
                />
                <Text className="text-caption text-text-muted">/ month</Text>
              </View>
              {errors.monthlyRate ? (
                <Text className="text-caption text-danger">
                  {errors.monthlyRate}
                </Text>
              ) : null}
            </View>

            <View className="h-4" />

            <LocationField value={location} onChange={setLocation} />
            {errors.location ? (
              <Text className="text-caption text-danger mt-1">
                {errors.location}
              </Text>
            ) : null}

            {/* Verification documents — same three slots as the
                onboarding form. The user can replace a kind
                they already uploaded, or add the optional demo
                video if they didn't include it on first pass. */}
            <View className="mt-6 gap-3">
              <Text className="text-overline text-text-muted uppercase">
                Verification documents
              </Text>
              <Text className="text-caption text-text-muted">
                {TUTOR_DOC_LABEL.citizenship} and{" "}
                {TUTOR_DOC_LABEL.certificate} are required. {TUTOR_DOC_LABEL.demo}{" "}
                is optional. Replace a slot to re-upload that document.
              </Text>
              <DocumentUploader
                kind="citizenship"
                existing={citizenshipDoc}
                onUploaded={(d) =>
                  setDocuments((prev) => {
                    const next = new Map(prev);
                    next.set(d.kind, d);
                    return next;
                  })
                }
              />
              {errors.citizenship ? (
                <Text className="text-caption text-danger -mt-1">
                  {errors.citizenship}
                </Text>
              ) : null}
              <DocumentUploader
                kind="certificate"
                existing={certificateDoc}
                onUploaded={(d) =>
                  setDocuments((prev) => {
                    const next = new Map(prev);
                    next.set(d.kind, d);
                    return next;
                  })
                }
              />
              {errors.certificate ? (
                <Text className="text-caption text-danger -mt-1">
                  {errors.certificate}
                </Text>
              ) : null}
              <DocumentUploader
                kind="demo"
                existing={demoDoc}
                onUploaded={(d) =>
                  setDocuments((prev) => {
                    const next = new Map(prev);
                    next.set(d.kind, d);
                    return next;
                  })
                }
              />
            </View>

            {/* Summary of the current live state. We use this to
                hint to the tutor what's actually changing. */}
            <View className="mt-6 p-4 rounded-card bg-warning-bg border border-warning/30">
              <Text className="text-button-sm font-medium text-warning-text">
                Heads up
              </Text>
              <Text className="text-caption text-warning-text mt-1 leading-relaxed">
                {hasChanges
                  ? "Your changes will be sent to the verification team. Your live profile stays the same until they approve."
                  : "Nothing has changed yet. Edit the fields above and tap Save changes."}
              </Text>
            </View>

            {/* Save / Discard — the two action buttons. We
                intentionally do NOT have a third "cancel and
                revert" button: closing the screen is the cancel. */}
            <View className="mt-6 flex-row gap-2">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Discard changes"
                onPress={handleDiscard}
                disabled={saving}
                className="flex-1 h-btn rounded-card bg-sand border border-border items-center justify-center active:opacity-80 disabled:opacity-60"
              >
                <Text className="text-button-sm font-medium text-text-primary">
                  Discard
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Save changes and submit for review"
                onPress={handleSave}
                disabled={!canSubmit || saving}
                className="flex-1 h-btn rounded-card bg-accent border border-warning/20 items-center justify-center flex-row gap-2 active:opacity-90 disabled:opacity-60"
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : null}
                <Text className="text-button-sm font-semibold text-text-inverse">
                  {saving ? "Submitting…" : "Save changes"}
                </Text>
              </Pressable>
            </View>

            <Text className="text-caption text-text-muted text-center mt-4">
              Your live profile, students, and reviews are not affected
              while we review the changes.
            </Text>
          </>
        ) : (
          <Text className="text-caption text-text-muted text-center pt-12">
            Could not load your profile. Pull down to retry.
          </Text>
        )}
      </ScrollView>
    </ScreenLayout>
  );
}

// ---------------------------------------------------------------------------
// Diff helpers
// ---------------------------------------------------------------------------

function subsetsDiffer(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return true;
  const setA = new Set(a);
  for (const v of b) {
    if (!setA.has(v)) return true;
  }
  return false;
}

function locationsEqual(
  a: LocationValue | null,
  b: LocationValue | null,
): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  return (
    a.city.trim() === b.city.trim() &&
    (a.neighborhood ?? "").trim() === (b.neighborhood ?? "").trim()
  );
}

function initialHasDoc(
  initial: readonly TutorDocument[],
  kind: string,
): boolean {
  return initial.some((d) => d.kind === kind);
}

/** True if the proposed list has at least one doc that wasn't
 *  in the initial list — i.e. the user uploaded or replaced
 *  something this session. */
function docKindListChanged(
  initial: readonly TutorDocument[],
  proposed: Map<string, TutorDocument>,
): boolean {
  // Initial length vs proposed length: any new kind.
  if (initial.length !== proposed.size) return true;
  // For each initial doc, compare against the proposed entry.
  for (const d of initial) {
    const p = proposed.get(d.kind);
    if (!p) return true;
    if (p.path !== d.path || p.bytes !== d.bytes) return true;
  }
  // Any proposed kind that wasn't in the initial set.
  for (const [k] of proposed) {
    if (!initial.some((d) => d.kind === k)) return true;
  }
  return false;
}

/** True if the two doc lists have different content (by kind
 *  + path + bytes). Used to decide whether to add `documents`
 *  to the `proposed` payload. */
function docsListDiffers(
  initial: readonly TutorDocument[],
  proposed: readonly TutorDocument[],
): boolean {
  if (initial.length !== proposed.length) return true;
  for (const d of initial) {
    const p = proposed.find((x) => x.kind === d.kind);
    if (!p) return true;
    if (p.path !== d.path || p.bytes !== d.bytes) return true;
  }
  return false;
}

/** Merge the in-memory `documents` Map (re-uploads this session)
 *  on top of the initial docs list. A kind present in the Map
 *  always wins. */
function mergeDocs(
  initial: readonly TutorDocument[],
  proposed: Map<string, TutorDocument>,
): TutorDocument[] {
  const merged = new Map<string, TutorDocument>();
  for (const d of initial) merged.set(d.kind, d);
  for (const [k, v] of proposed) merged.set(k, v);
  return Array.from(merged.values());
}
