import {
  ScreenLayout,
  ScreenHeader,
  ScreenScroll,
} from "@/components/shared/ScreenLayout";
import { Ionicons } from "@expo/vector-icons";
import { getApp } from "@react-native-firebase/app";
import {
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc,
} from "@react-native-firebase/firestore";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
  View,
} from "react-native";

import { TutorBottomBar } from "@/components/domain/TutorBottomBar";
import { AvatarBubble } from "@/components/forms/AvatarBubble";
import { ConfirmDialog } from "@/components/forms/ConfirmDialog";
import { TutorDocumentList } from "@/components/forms/DocumentUploader";
import { EditableField } from "@/components/forms/EditableField";
import { MenuRow } from "@/components/forms/MenuRow";
import type { TutorDocument } from "@/lib/verification/documents";
import { logout } from "@/services/firebase/authService";
import { uploadAvatar } from "@/services/supabase/storage";
import { useAuthStore } from "@/store/authStore";
import { useAiChatStore } from "@/store/aiChatStore";

/**
 * EdumentX — Tutor Profile Edit screen (`/tutor_edit_profile`)
 *
 * Stage A.5 (June 28, 2026): rewritten as a *profile-parity* screen that
 * mirrors `StudentProfile.tsx`. Previously this was a flat form with
 * `fullName` / `monthlyRate` / `subjects` / `yearsExperience`
 * TextInputs and a Save button — that pattern didn't match the
 * student's profile surface and gave tutors no way to log out of
 * the app.
 *
 * Stage B (mid-term, July 2026): the verification pipeline
 * (see `lib/verification/editableFields.ts`) splits the profile
 * into two buckets — live-editable fields (fullName, headline, bio,
 * photoUrl) that the tutor can change without re-review, and
 * high-risk fields (monthly rate, subjects, location) that go
 * through `tutorProfileUpdates/{uid}` for admin re-review. This
 * screen owns the **live-edit** half. The high-risk editing UI is
 * a follow-up; for the mid-term milestone the "Teaching details"
 * hint points tutors back at the original setup screen.
 *
 * Verification state handling:
 *   - `verificationStatus === "pending"` — the form is disabled.
 *     The tutor is in the initial review window; we don't let them
 *     change anything until an admin decides.
 *   - `verificationStatus === "rejected"` or `"more_info"` — we
 *     show a banner with the rejection reason (or a "more info
 *     requested" prompt) and a "Resubmit for review" button that
 *     routes to `/profile-tutor`. The `TutorProfileScreen` form
 *     re-runs the same writeBatch and creates a fresh
 *     `tutorVerifications/{uid}` doc with `status: "pending"`.
 *   - `hasPendingUpdate === true` — the tutor has a high-risk
 *     change under review. We show a pending banner. Live fields
 *     (headline, bio) still work; the "Teaching details" button
 *     is disabled until the admin decides.
 *
 * Out of scope for this stage:
 *   - High-risk field editing (monthly rate, subjects, location).
 *     The `tutorProfileUpdates/{uid}` queue is the destination for
 *     those changes; the UI for that flow is a follow-up.
 *   - Per-field "you have a pending edit" indicators. The
 *     `hasPendingUpdate` flag is binary today.
 */

interface EditFormState {
  fullName: string;
  email: string;
  headline: string;
  bio: string;
}

const EMPTY_FORM: EditFormState = {
  fullName: "",
  email: "",
  headline: "",
  bio: "",
};

export function EditTutorProfile() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const verificationStatus = useAuthStore(
    (s) => s.tutorVerificationStatus,
  );
  // The store only carries `tutorVerificationStatus` today, not
  // `hasPendingUpdate`. We re-read the doc on mount to populate a
  // local flag for the banner. The store-driven `verificationStatus`
  // is enough for the disabled-when-pending + rejected/more_info
  // branches; `hasPendingUpdateLocal` is best-effort from the same
  // doc.
  const [hasPendingUpdateLocal, setHasPendingUpdateLocal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [form, setForm] = useState<EditFormState>(EMPTY_FORM);
  const [loaded, setLoaded] = useState(false);
  const [savingField, setSavingField] = useState<string | null>(null);

  // Photo state — local `photoUrl` for display, `savedPhotoUrl` to
  // suppress the persist effect from looping on every render. We
  // hydrate both from the Firestore doc on mount so a re-login keeps
  // showing the same avatar.
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [savedPhotoUrl, setSavedPhotoUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Documents list — a copy of the `documents: TutorDocument[]` field
  // on the profile doc. We display it in a "Verification documents"
  // section so the tutor can see what they've submitted. Tapping any
  // row routes to `/tutor_edit_teaching_details` which is the only
  // place documents are actually re-uploaded.
  const [documents, setDocuments] = useState<TutorDocument[]>([]);

  const [confirmLogout, setConfirmLogout] = useState(false);

  // Combined flag: form is disabled while the initial review is
  // open OR while a high-risk edit is under review. Live fields
  // are still technically safe to edit in the `hasPendingUpdate`
  // case, but we lock the whole form for consistency with the
  // "your account is frozen until the admin decides" message.
  const isLocked =
    verificationStatus === "pending" || hasPendingUpdateLocal;

  function showComingSoon(feature: string) {
    Alert.alert(
      "Coming soon",
      `${feature} will be available in a future update.`,
    );
  }

  /**
   * Persist a single live-editable field to the profile doc. Used
   * by the EditableField `onCommit` handlers. Writes are scoped to
   * a single field (with `merge: true`) so a half-finished save
   * doesn't clobber sibling fields.
   *
   * We track `savingField` to show a small spinner on the field
   * that's mid-save. On error we revert the local state to what the
   * doc already had so the user doesn't think their change stuck.
   */
  async function commitField(
    key: "fullName" | "headline" | "bio",
    value: string,
  ) {
    if (!user) return;
    if (isLocked) return;
    const db = getFirestore(getApp());
    const profileRef = doc(
      db,
      "users",
      user.uid,
      "tutorProfile",
      "default",
    );
    setSavingField(key);
    try {
      await setDoc(
        profileRef,
        { [key]: value, updatedAt: serverTimestamp() },
        { merge: true },
      );
    } catch (err) {
      console.warn(`EditTutorProfile: ${key} persist failed`, err);
      Alert.alert(
        "Could not save",
        "Please check your connection and try again.",
      );
      // Best-effort revert: re-read the doc and reset local state.
      try {
        const snap = await getDoc(profileRef);
        const d = snap.data() as
          | { fullName?: string; headline?: string; bio?: string }
          | undefined;
        setForm((p) => ({
          ...p,
          fullName:
            typeof d?.fullName === "string" ? d.fullName : p.fullName,
          headline:
            typeof d?.headline === "string" ? d.headline : p.headline,
          bio: typeof d?.bio === "string" ? d.bio : p.bio,
        }));
      } catch {
        // Even the revert failed — leave the user's text in place
        // so they can retry manually.
      }
    } finally {
      setSavingField(null);
    }
  }

  // One-shot read on mount. We don't use `onSnapshot` here because
  // this screen is the *source* of writes (avatar uploads, headline
  // edits) — a live mirror would re-render the inputs mid-typing.
  // The tutor dashboard subscribes to the same doc via `onSnapshot`
  // and re-renders after `commitField` (or our `photoUrl` persist
  // effect) commits.
  useEffect(() => {
    if (!user) {
      setForm(EMPTY_FORM);
      setLoaded(true);
      return;
    }
    const db = getFirestore(getApp());
    const profileRef = doc(db, "users", user.uid, "tutorProfile", "default");
    let cancelled = false;
    getDoc(profileRef)
      .then((snap) => {
        if (cancelled) return;
        const d = snap.data() as
          | {
              fullName?: string;
              email?: string;
              headline?: string;
              bio?: string;
              photoUrl?: string;
              hasPendingUpdate?: boolean;
              rejectionReason?: string | null;
              documents?: TutorDocument[];
            }
          | undefined;
        setForm({
          fullName: typeof d?.fullName === "string" ? d.fullName : "",
          email:
            typeof d?.email === "string"
              ? d.email
              : (user.email ?? ""),
          headline: typeof d?.headline === "string" ? d.headline : "",
          bio: typeof d?.bio === "string" ? d.bio : "",
        });
        setHasPendingUpdateLocal(d?.hasPendingUpdate === true);
        setRejectionReason(
          typeof d?.rejectionReason === "string"
            ? d.rejectionReason
            : null,
        );
        // Seed both `photoUrl` and `savedPhotoUrl` from the doc so
        // the persist effect doesn't immediately re-write what we
        // just read.
        const persisted = typeof d?.photoUrl === "string" ? d.photoUrl : null;
        setPhotoUrl(persisted);
        setSavedPhotoUrl(persisted);
        // Hydrate the documents list. We don't enforce types here —
        // the `TutorDocument[]` shape comes from
        // `lib/verification/documents.ts` and is owned by the
        // onboarding + edit screens. The admin queue's read of the
        // same field uses the same type.
        setDocuments(Array.isArray(d?.documents) ? d!.documents : []);
        setLoaded(true);
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn("EditTutorProfile: read failed", err);
        // Don't block the screen — render empty form so the user
        // can still edit; saving will overwrite whatever's there.
        setForm({
          fullName: "",
          email: user.email ?? "",
          headline: "",
          bio: "",
        });
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Auto-persist `photoUrl` to Firestore whenever it changes. The
  // `savedPhotoUrl` gate prevents the effect from writing back what
  // it just read (a `photoUrl === savedPhotoUrl` short-circuit means
  // the local state matches the doc). This is fire-and-forget — if
  // it fails we log; the user still sees the new avatar immediately
  // because the local `photoUrl` updated synchronously when the
  // upload returned.
  useEffect(() => {
    if (!user || !loaded) return;
    if (isLocked) return;
    if (!photoUrl || photoUrl === savedPhotoUrl) return;
    const db = getFirestore(getApp());
    const profileRef = doc(db, "users", user.uid, "tutorProfile", "default");
    setDoc(profileRef, { photoUrl, updatedAt: serverTimestamp() }, { merge: true })
      .then(() => setSavedPhotoUrl(photoUrl))
      .catch((err) => console.warn("EditTutorProfile: photoUrl persist failed", err));
  }, [photoUrl, savedPhotoUrl, user, loaded, isLocked]);

  async function pickImage() {
    const uid = user?.uid;
    if (!uid) {
      Alert.alert("Not signed in", "Please sign in to update your photo.");
      return;
    }
    if (isLocked) {
      Alert.alert(
        "Profile is locked",
        verificationStatus === "pending"
          ? "Your account is still being reviewed. You'll be able to update your photo once it's approved."
          : "Your recent profile changes are under review. You'll be able to update your photo once the review is complete.",
      );
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Allow photo access in system settings to choose a profile image.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (result.canceled || result.assets.length === 0) return;
    const localUri = result.assets[0].uri;

    setUploadingPhoto(true);
    try {
      const { publicUrl } = await uploadAvatar(uid, localUri);
      // Append a cache-buster query param exactly like `AvatarUploader`
      // does so React Native's `<Image>` re-fetches instead of
      // serving a cached version of the previous avatar.
      setPhotoUrl(`${publicUrl}?t=${Date.now()}`);
    } catch (err: any) {
      console.error("EditTutorProfile: avatar upload failed", err);
      Alert.alert(
        "Upload failed",
        err?.message ?? "Please check your connection and try again.",
      );
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleSignOut() {
    setConfirmLogout(false);
    try {
      await logout();
      useAuthStore.getState().reset();
      // Wipe the AI chat session (history + constraint pills) so a
      // different user logging in on this device never inherits the
      // previous account's conversation context.
      useAiChatStore.getState().resetSession();
    } catch (err) {
      console.error("EditTutorProfile: sign-out failed", err);
      Alert.alert("Could not sign out", "Please try again.");
      return;
    }
    router.replace("/email-signup");
  }

  function handleResubmit() {
    // The TutorProfileScreen's existing writeBatch always sets
    // `verificationStatus: "pending"` and creates a fresh
    // `tutorVerifications/{uid}` doc. Sending the tutor back to
    // /profile-tutor is the resubmit path; they re-fill (or skip)
    // the form and the next submit creates the new pending review.
    router.push("/profile-tutor");
  }

  return (
    <ScreenLayout variant="background">

      {/* Hero header — shows the tutor's name (or fallback) instead
          of a hardcoded "Your account" label. The text-display token
          matches the other student/tutor surfaces. */}
      <ScreenHeader variant="light">
        <Text className="text-body text-text-secondary mb-0.5">Profile</Text>
        <View style={{ borderBottomWidth: 2, borderBottomColor: '#E5A03B', paddingBottom: 2, alignSelf: 'flex-start' }}>
          <Text className="text-display text-text-primary">
            {form.fullName || form.email || 'Your account'}
          </Text>
        </View>
      </ScreenHeader>

      <ScreenScroll>
        {/* Verification banners — surface the current state of the
            admin queue. Three tones, mutually exclusive:
              - pending:  initial review, form is locked.
              - rejected / more_info: form is editable; show the
                reason (or a generic "more info" prompt) and a
                "Resubmit for review" button.
              - hasPendingUpdate: a high-risk change is under review;
                form is locked until the admin decides. */}
        {verificationStatus === "pending" ? (
          <VerificationBanner tone="pending">
            Your account is being reviewed. We&apos;ll let you edit
            your profile once an admin has approved it.
          </VerificationBanner>
        ) : verificationStatus === "rejected" ? (
          <VerificationBanner tone="rejected">
            {rejectionReason
              ? `Reason: ${rejectionReason}.`
              : "Your account was rejected."}{" "}
            Update your details and resubmit for review.
            <Pressable
              onPress={handleResubmit}
              className="mt-2 self-start min-h-btn rounded-card bg-danger items-center justify-center px-4 active:opacity-80"
            >
              <Text className="text-button-sm text-text-inverse font-semibold">
                Resubmit for review
              </Text>
            </Pressable>
          </VerificationBanner>
        ) : verificationStatus === "more_info" ? (
          <VerificationBanner tone="info">
            An admin has asked for more information. Update your
            profile and resubmit.
            <Pressable
              onPress={handleResubmit}
              className="mt-2 self-start min-h-btn rounded-card bg-ai items-center justify-center px-4 active:opacity-80"
            >
              <Text className="text-button-sm text-text-inverse font-semibold">
                Update & resubmit
              </Text>
            </Pressable>
          </VerificationBanner>
        ) : hasPendingUpdateLocal ? (
          <VerificationBanner tone="pending">
            Your recent profile changes are under review. Your
            profile isn&apos;t being shown to students right now.
          </VerificationBanner>
        ) : null}

        {/* Identity card */}
        <View className="bg-surface border border-border rounded-card p-5 items-center">
          <AvatarBubble
            name={form.fullName || form.email || "Tutor"}
            uri={photoUrl}
            editable={!uploadingPhoto && !isLocked}
            onPress={pickImage}
          />
          <Text className="text-section-title font-medium text-text-primary mt-3">
            {form.fullName || "Add your name"}
          </Text>
          {form.email ? (
            <View className="flex-row items-center gap-1.5 mt-1">
              <Ionicons name="mail-outline" size={12} color="#6B7268" />
              <Text className="text-caption text-text-muted">{form.email}</Text>
            </View>
          ) : null}
          <Pressable
            onPress={pickImage}
            disabled={uploadingPhoto || isLocked}
            accessibilityRole="button"
            accessibilityLabel="Upload or change profile photo"
            className="mt-3 px-3 py-1.5 bg-sand rounded-pill active:opacity-80 disabled:opacity-50"
          >
            <Text className="text-micro text-text-secondary font-medium">
              {uploadingPhoto
                ? "Uploading…"
                : photoUrl
                  ? "Change photo"
                  : "Upload photo"}
            </Text>
          </Pressable>
        </View>

        {/* Editable fields — Full name, Headline, About me are all
            in `LIVE_EDITABLE_FIELDS` and persist to the profile
            doc on commit without admin review. We disable the
            fields when the form is locked. */}
        <View className="mt-6 gap-5">
          <EditableField
            label="Full name"
            value={form.fullName}
            onChange={(fullName) => setForm((p) => ({ ...p, fullName }))}
            onCommit={() => commitField("fullName", form.fullName.trim())}
            placeholder="Your full name"
            editable={!isLocked}
            trailing={
              savingField === "fullName" ? (
                <ActivityIndicator size="small" color="#2F5D50" />
              ) : undefined
            }
          />

            <EditableField
              label="Headline"
            value={form.headline}
            onChange={(headline) => setForm((p) => ({ ...p, headline }))}
            onCommit={() => commitField("headline", form.headline.trim())}
            placeholder="e.g., Math & Physics tutor · SEE graduate"
            editable={!isLocked}
            trailing={
              savingField === "headline" ? (
                <ActivityIndicator size="small" color="#2F5D50" />
              ) : undefined
            }
          />

            <EditableField
              label="About me"
            value={form.bio}
            onChange={(bio) => setForm((p) => ({ ...p, bio }))}
            onCommit={() => commitField("bio", form.bio.trim())}
            placeholder="Tell parents about your teaching style and experience."
            editable={!isLocked}
            trailing={
              savingField === "bio" ? (
                <ActivityIndicator size="small" color="#2F5D50" />
              ) : undefined
            }
          />

            {/* Read-only email row */}
          <View>
            <Text className="text-label text-ink-muted mb-2">
              Email
            </Text>
            <View className="flex-row items-center justify-between bg-sand border border-border rounded-card h-input px-4">
              <Text
                className="text-body-lg text-text-secondary flex-1"
                numberOfLines={1}
              >
                {form.email || "Not signed in"}
              </Text>
              <View className="flex-row items-center gap-1 bg-success-bg rounded-sm px-2 py-1">
                <Ionicons name="checkmark-circle" size={11} color="#3F8A5A" />
                <Text className="text-micro text-success-text font-medium">
                  Verified
                </Text>
              </View>
            </View>
            {/* <Text className="text-caption text-text-muted mt-1.5">
              Email is managed by Firebase Auth and can&apos;t be edited
              from here.
            </Text> */}
          </View>
        </View>

        {/* Teaching details — high-risk fields (subjects, rate,
            location) live on a dedicated screen so we can route
            the submission through `tutorProfileUpdates/{uid}`
            instead of writing directly to the profile. Documents
            also live there — re-uploading any of them needs the
            same admin re-review path. When a high-risk update is
            pending review we lock this row so the tutor can't
            stack a second update on top of one that's still in
            the queue. */}
        <View className="mt-7">
          <Text className="text-label text-ink-muted mb-2">
            Teaching details
          </Text>
          <View className="bg-surface border border-border rounded-card overflow-hidden">
            <MenuRow
              icon="briefcase-outline"
              label="Subjects, rate & location"
              onPress={
                hasPendingUpdateLocal
                  ? undefined
                  : () => router.push("/tutor_edit_teaching_details")
              }
              disabled={hasPendingUpdateLocal}
            />
          </View>
          <Text className="text-caption text-text-muted mt-2 px-1">
            {hasPendingUpdateLocal
              ? "Editing is paused while your previous changes are under review."
              : "Changes to your teaching details require admin re-review before they go live."}
          </Text>
        </View>

        {/* Verification documents — read-only list of what the
            tutor has already submitted. Tapping a row routes
            them to the edit-teaching-details screen which is the
            only place re-uploads happen. We deliberately don't
            make this a `MenuRow` because the inner DocumentRow
            already has its own action affordance. */}
        <View className="mt-7">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-label text-ink-muted">
              Verification documents
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Edit verification documents"
              onPress={
                hasPendingUpdateLocal
                  ? undefined
                  : () => router.push("/tutor_edit_teaching_details")
              }
              disabled={hasPendingUpdateLocal}
              className="active:opacity-70 disabled:opacity-40"
            >
              <Text className="text-button-sm font-medium text-accent">
                {hasPendingUpdateLocal ? "Locked" : "Edit"}
              </Text>
            </Pressable>
          </View>
          <View className="bg-surface border border-border rounded-card p-3">
            <TutorDocumentList documents={documents} />
          </View>
        </View>

        {/* More — Availability / My batches / Payouts / Help. */}
        <View className="mt-7">
          <Text className="text-label text-ink-muted mb-2">
            More
          </Text>
          <View className="bg-surface border border-border rounded-card overflow-hidden">
            <MenuRow
              icon="calendar-outline"
              label="Capacity & schedule"
              onPress={() => router.push("/tutor-capacity")}
            />
            <MenuRow
              icon="people-outline"
              label="My batches"
              onPress={() => router.push("/batches")}
            />
            <MenuRow
              icon="card-outline"
              label="Payouts"
              onPress={() => showComingSoon("Payouts")}
            />
            <MenuRow
              icon="help-circle-outline"
              label="Help & support"
              onPress={() => showComingSoon("Help & support")}
              last
            />
          </View>
        </View>

        {/* Logout */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Log out"
          onPress={() => setConfirmLogout(true)}
          className="mt-7 min-h-btn rounded-card bg-surface border border-border flex-row items-center justify-center gap-2 active:opacity-80"
        >
          <Ionicons name="log-out-outline" size={18} color="#C1503D" />
          <Text className="text-button font-semibold text-danger">
            Log out
          </Text>
        </Pressable>

        <Text className="text-caption text-text-muted text-center mt-6">
          EdumentX · v1.0 · build 2026.07.08
        </Text>
      </ScreenScroll>

      <TutorBottomBar />

      {/* Custom confirmation overlay — not a native Alert, per spec. */}
      <ConfirmDialog
        visible={confirmLogout}
        title="Log out?"
        message="You'll need to sign in again next time you open EdumentX."
        confirmLabel="Log out"
        cancelLabel="Stay signed in"
        destructive
        onConfirm={handleSignOut}
        onCancel={() => setConfirmLogout(false)}
      />
    </ScreenLayout>
  );
}

/**
 * Verification-state banner used at the top of the edit screen.
 * Three tones match the ReviewBanner in `tutor_home.tsx` so the
 * language is consistent across the app.
 */
function VerificationBanner({
  tone,
  children,
}: {
  tone: "pending" | "rejected" | "info";
  children: React.ReactNode;
}) {
  const palette = {
    pending: {
      bg: "bg-warning-bg",
      border: "border-warning/30",
      icon: "time-outline" as const,
      iconColor: "#E5A03B",
      text: "text-warning-text",
      label: "Under review",
    },
    rejected: {
      bg: "bg-danger-bg",
      border: "border-danger/30",
      icon: "close-circle" as const,
      iconColor: "#C1503D",
      text: "text-danger",
      label: "Action needed",
    },
    info: {
      bg: "bg-ai-light",
      border: "border-ai/30",
      icon: "information-circle" as const,
      iconColor: "#4A7FA5",
      text: "text-ai",
      label: "More info needed",
    },
  }[tone];

  return (
    <View
      className={`mb-5 flex-row items-start gap-3 p-4 rounded-card border ${palette.bg} ${palette.border}`}
    >
      <Ionicons
        name={palette.icon}
        size={20}
        color={palette.iconColor}
        style={{ marginTop: 1 }}
      />
      <View className="flex-1 min-w-0">
        <Text className={`text-card-title font-medium ${palette.text}`}>
          {palette.label}
        </Text>
        <Text className={`text-caption mt-1 leading-relaxed ${palette.text}`}>
          {children}
        </Text>
      </View>
    </View>
  );
}
