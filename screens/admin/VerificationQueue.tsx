import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getApp } from "@react-native-firebase/app";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
  writeBatch,
  serverTimestamp,
} from "@react-native-firebase/firestore";

import { AdminNav } from "@/components/shared/AdminNav";
import { useAuthStore } from "@/store/authStore";
import {
  writeNotification,
  notificationCopy,
} from "@/lib/verification/notifications";
import {
  TUTOR_DOC_LABEL,
  formatBytes,
  type TutorDocument,
} from "@/lib/verification/documents";
import { getVerificationDocPublicUrl } from "@/services/supabase/storage";

/**
 * EdumentX — Verification Queue (Admin)
 *
 * Four sections, derived from the planned Firestore shape:
 *
 *   1. New Tutor Verifications — `tutorVerifications/{uid}.status === "pending"`
 *      Tutors who just signed up and submitted their profile. The
 *      admin's job is to approve, reject, or request more info.
 *
 *   2. Pending Edits — `tutorProfileUpdates/{uid}.status === "pending"`
 *      Verified tutors who want to change their profile. While pending
 *      the tutor is hidden from student discovery (see
 *      `data-model.md` §tutorProfile.hasPendingUpdate). The card shows
 *      a diff view (old value vs proposed value) so the admin sees
 *      exactly what would change.
 *
 *   3. Info Requested — `tutorVerifications/{uid}.status === "more_info"`
 *      Tutors who got past the first review but the admin asked for
 *      more docs/info. They're waiting on the tutor, not on the admin.
 *
 *   4. Decided — `approved` / `rejected` history. Collapsed by default
 *      to keep the queue focused on actionable items.
 *
 * Reject action opens a small inline `RejectReasonDialog` modal so the
 * admin can capture the reason (a free-text string). The reason is
 * stored on the verification doc as `adminNotes` and mirrored onto
 * the profile doc as `rejectionReason` (the tutor sees the latter via
 * `ReviewBanner` with `tone="rejected"`).
 *
 * Data layer (Phase 5+):
 *   - `tutorVerifications` collection — `onSnapshot` over all docs,
 *     partitioned into the four sections by `status`.
 *   - `tutorProfileUpdates` collection — `onSnapshot` over
 *     `status == "pending"` only. Edit approvals/rejections write
 *     back to the source profile doc and clear the `hasPendingUpdate`
 *     flag in a single `writeBatch`.
 *
 * Security: writes follow the rules in `firebase/firestore.rules` —
 * only admins can mutate `tutorVerifications.status` and
 * `tutorProfileUpdates`; the `admins/{uid}` doc check happens in
 * the `isAdmin()` rule helper.
 */

type QueueStatus = "pending" | "approved" | "rejected" | "more_info";

type Verification = {
  id: string;
  name: string;
  avatar: string;
  email: string;
  phone: string;
  /** ISO string or human label — UI shows a relative label so we
   *  keep this as the human form for now and let the parent format
   *  it (server timestamps are converted by the snapshot handler). */
  submitted: string;
  subjects: string[];
  level: string;
  rate: number;
  experience: string;
  bio: string;
  documents: TutorDocument[];
  status: QueueStatus;
  /** Rejection / info-request reason captured by the admin. Surfaced
   *  in the expanded card so reviewers can see context for past
   *  decisions. Null on first submission. */
  adminNotes: string | null;
  /** True if the admin has already decided (approved / rejected) on
   *  this tutor's initial verification — derived from `status`. */
  decided: boolean;
};

/**
 * A pending edit = an already-verified tutor asking to change their
 * profile. We render old (current) vs new (proposed) values side by
 * side so the admin sees exactly what would change if they approve.
 *
 * `current` and `proposed` are the live values read from the
 * `tutorProfileUpdates/{uid}` doc — `proposed` is the full set of
 * fields the tutor wants to change, and `current` is a snapshot of
 * the profile at the time the edit was submitted. The diff is
 * computed in-memory so we never miss a field.
 */
type EditField = {
  label: string;
  oldValue: string;
  newValue: string;
};

type PendingEdit = {
  id: string;
  name: string;
  avatar: string;
  email: string;
  submitted: string;
  fields: EditField[];
};

/** Status config — kept in a single switch so the badge / row /
 *  "decided" stamp all stay in lock-step. The explicit return type
 *  narrows `icon` to the Ionicons `name` union so the `<Ionicons
 *  name={config.icon} ... />` usage in `StatusBadge` typechecks. */
type StatusConfig = {
  label: string;
  bgClass: string;
  textClass: string;
  icon: keyof typeof Ionicons.glyphMap;
};

function getStatusConfig(status: QueueStatus): StatusConfig {
  switch (status) {
    case "pending":
      return {
        label: "Pending Review",
        bgClass: "bg-warning-bg",
        textClass: "text-warning-text",
        icon: "time-outline",
      };
    case "approved":
      return {
        label: "Approved",
        bgClass: "bg-success-bg",
        textClass: "text-success",
        icon: "checkmark-circle",
      };
    case "rejected":
      return {
        label: "Rejected",
        bgClass: "bg-danger-bg",
        textClass: "text-danger",
        icon: "close-circle",
      };
    case "more_info":
      return {
        label: "Info Requested",
        bgClass: "bg-ai-light",
        textClass: "text-ai",
        icon: "information-circle",
      };
  }
}

/**
 * Convert a Firestore `Timestamp` (or `Date` / ISO string / null) to
 * a short relative label like "2 days ago". Mirrors the format the
 * mock data used so the visual rhythm of the cards doesn't shift
 * once we go live.
 */
function formatRelativeTime(value: unknown): string {
  if (!value) return "recently";
  let date: Date;
  if (value instanceof Date) {
    date = value;
  } else if (typeof value === "string") {
    date = new Date(value);
  } else if (typeof value === "object" && value !== null && "toDate" in value) {
    // Firestore `Timestamp` exposes `.toDate()`.
    date = (value as { toDate: () => Date }).toDate();
  } else {
    return "recently";
  }
  const ms = Date.now() - date.getTime();
  if (Number.isNaN(ms)) return "recently";
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} wk${weeks > 1 ? "s" : ""} ago`;
  const months = Math.floor(days / 30);
  return `${months} mo ago`;
}

/**
 * Friendly labels for the field names that show up in the edit-diff.
 * Anything not in this map falls back to the raw key in Title Case.
 */
const EDIT_FIELD_LABELS: Record<string, string> = {
  fullName: "Full name",
  headline: "Headline",
  bio: "Bio",
  photoUrl: "Photo",
  monthlyRateNpr: "Monthly rate",
  subjects: "Subjects",
  gradesTeaching: "Grades",
  location: "Location",
  yearsExperience: "Experience",
  phone: "Phone",
};

function labelForField(key: string): string {
  return (
    EDIT_FIELD_LABELS[key] ??
    key
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (c) => c.toUpperCase())
      .trim()
  );
}

/** Build the diff rows for a pending edit. Compares `current` and
 *  `proposed` field-by-field and returns one row per changed field.
 *  We only show fields that actually differ — `proposed` may include
 *  every field, but the diff only cares about the ones that moved. */
function buildDiffRows(
  current: Record<string, unknown> | null,
  proposed: Record<string, unknown>,
): EditField[] {
  const rows: EditField[] = [];
  Object.keys(proposed).forEach((key) => {
    const next = proposed[key];
    const prev = current?.[key];
    if (JSON.stringify(prev) === JSON.stringify(next)) return;
    let newLabel = String(next ?? "");
    let oldLabel = String(prev ?? "");
    if (key === "monthlyRateNpr") {
      newLabel = `Rs ${Number(next ?? 0).toLocaleString()}`;
      oldLabel = prev != null ? `Rs ${Number(prev).toLocaleString()}` : "—";
    } else if (Array.isArray(next)) {
      newLabel = (next as unknown[]).join(", ");
    }
    if (Array.isArray(prev) && !Array.isArray(next)) {
      oldLabel = (prev as unknown[]).join(", ");
    }
    rows.push({
      label: labelForField(key),
      oldValue: oldLabel || "—",
      newValue: newLabel || "—",
    });
  });
  return rows;
}

export function VerificationQueue() {
  const admin = useAuthStore((state) => state.user);

  // Live lists, kept in local state so the existing visual sub-
  // components can keep receiving plain data (no Firestore types
  // bleeding into the UI layer). We subscribe once on mount and
  // unsubscribe in the effect cleanup.
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [pendingEdits, setPendingEdits] = useState<PendingEdit[]>([]);
  const [loading, setLoading] = useState(true);

  // `rejecting` is set to the id of the verification being rejected.
  // The RejectReasonDialog reads from this and writes back the
  // captured reason. Same shape for edit-rejects.
  const [rejecting, setRejecting] = useState<{
    id: string;
    name: string;
    kind: "verification" | "edit";
  } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Optimistic in-flight guard — disables Approve / Reject buttons
  // for the specific row currently being written so a double-tap
  // can't issue a second `writeBatch` against the same doc.
  const [busyId, setBusyId] = useState<string | null>(null);

  // A moveable flag for the "Decided" section so the admin can
  // collapse it out of the way once the queue is empty.
  const [decidedExpanded, setDecidedExpanded] = useState(false);

  useEffect(() => {
    const db = getFirestore(getApp());

    // Live read of every verification doc. We partition client-side
    // into the four sections based on `status` — keeping one query
    // is simpler than four `where` queries and the queue will stay
    // small in the demo (tens, not thousands). If collection size
    // ever grows we'd switch to per-section `where` queries.
    const verificationsQuery = query(collection(db, "tutorVerifications"));
    const unsubVerifications = onSnapshot(verificationsQuery, (snap) => {
      const rows: Verification[] = snap.docs.map((d) => {
        const data = d.data() as {
          fullName?: string;
          email?: string;
          phone?: string;
          phoneDisplay?: string;
          subjects?: string[];
          gradesTeaching?: string[];
          yearsExperience?: string;
          monthlyRateNpr?: number;
          location?: string;
          headline?: string;
          bio?: string;
          documents?: TutorDocument[];
          avatarUrl?: string | null;
          status?: QueueStatus;
          adminNotes?: string | null;
          createdAt?: unknown;
          updatedAt?: unknown;
        };
        const status: QueueStatus = data.status ?? "pending";
        return {
          id: d.id,
          name: data.fullName ?? "Unknown tutor",
          avatar:
            data.avatarUrl ??
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
              data.fullName ?? d.id,
            )}`,
          email: data.email ?? "",
          phone: data.phoneDisplay ?? data.phone ?? "",
          // Prefer the most recent timestamp the server gave us; the
          // mock data used "submitted" so the field is reused as a
          // human label.
          submitted: formatRelativeTime(
            data.updatedAt ?? data.createdAt ?? null,
          ),
          subjects: data.subjects ?? [],
          level: (data.gradesTeaching ?? []).join(", ") || "—",
          rate: data.monthlyRateNpr ?? 0,
          experience: data.yearsExperience ?? "—",
          bio: data.bio ?? "",
          documents: data.documents ?? [],
          status,
          adminNotes: data.adminNotes ?? null,
          decided: status === "approved" || status === "rejected",
        };
      });
      setVerifications(rows);
      setLoading(false);
    });

    // Pending edits only — admin reviews these; decided edits are
    // history we don't need to render in this view.
    const editsQuery = query(
      collection(db, "tutorProfileUpdates"),
      where("status", "==", "pending"),
    );
    const unsubEdits = onSnapshot(editsQuery, (snap) => {
      const rows: PendingEdit[] = snap.docs.map((d) => {
        const data = d.data() as {
          fullName?: string;
          email?: string;
          current?: Record<string, unknown> | null;
          proposed?: Record<string, unknown>;
          submittedAt?: unknown;
        };
        const fields = buildDiffRows(
          data.current ?? null,
          data.proposed ?? {},
        );
        return {
          id: d.id,
          name: data.fullName ?? "Unknown tutor",
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
            data.fullName ?? d.id,
          )}`,
          email: data.email ?? "",
          submitted: formatRelativeTime(data.submittedAt ?? null),
          fields,
        };
      });
      setPendingEdits(rows);
    });

    return () => {
      unsubVerifications();
      unsubEdits();
    };
  }, []);

  // Section partitioning. We split the live list by `status` so the
  // existing sub-components can keep receiving a plain array.
  const newPending = useMemo(
    () => verifications.filter((v) => v.status === "pending"),
    [verifications],
  );
  const infoRequested = useMemo(
    () => verifications.filter((v) => v.status === "more_info"),
    [verifications],
  );
  const decided = useMemo(
    () => verifications.filter((v) => v.decided),
    [verifications],
  );

  const totalOpen = newPending.length + infoRequested.length + pendingEdits.length;

  /** Persist a verification status change atomically: flip the
   *  `tutorVerifications/{uid}.status` AND mirror the denormalized
   *  flags onto `users/{uid}/tutorProfile/default` in one batch.
   *  This is the only place those two writes are tied together —
   *  keeping them batched means the tutor's dashboard and the
   *  layout guard can never see a half-applied decision. */
  async function applyVerificationDecision(
    uid: string,
    newStatus: QueueStatus,
    notes: string | null,
  ) {
    const db = getFirestore(getApp());
    const batch = writeBatch(db);
    const verificationRef = doc(db, "tutorVerifications", uid);
    const profileRef = doc(db, "users", uid, "tutorProfile", "default");

    batch.update(verificationRef, {
      status: newStatus,
      adminNotes: notes,
      reviewedBy: admin?.uid ?? null,
      reviewedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Mirror the decision onto the denormalized profile flags. These
    // are the fields the layout guard, the tutor dashboard's
    // `ReviewBanner`, and the student-side filter all read.
    const profilePatch: Record<string, unknown> = {
      verificationStatus: newStatus,
      rejectionReason: newStatus === "rejected" ? notes ?? null : null,
      hasPendingUpdate: false,
      updatedAt: serverTimestamp(),
    };
    if (newStatus === "approved") {
      profilePatch.isVerifiedProfessional = true;
    } else if (newStatus === "rejected" || newStatus === "more_info") {
      profilePatch.isVerifiedProfessional = false;
    }
    batch.set(profileRef, profilePatch, { merge: true });

    await batch.commit();

    // Notify the tutor once the decision is committed. We do this
    // AFTER `batch.commit()` returns so a failed batch never leaves
    // a stale "approved" notification sitting in the tutor's inbox.
    // Each branch picks the matching copy helper from
    // `lib/verification/notifications.ts`; the helper carries the
    // title, body, and the reason text the admin captured.
    try {
      if (newStatus === "approved") {
        await writeNotification(uid, notificationCopy.approved);
      } else if (newStatus === "rejected") {
        await writeNotification(uid, notificationCopy.rejected(notes ?? ""));
      } else if (newStatus === "more_info") {
        await writeNotification(uid, notificationCopy.moreInfo(notes ?? ""));
      }
    } catch (err) {
      // Notification failures are non-fatal — the verification
      // decision already landed. Log and move on; we can rebuild
      // notifications from the verification doc if needed.
      console.warn("[VerificationQueue] notification write failed", err);
    }
  }

  /** Approve an edit: read the pending `tutorProfileUpdates/{uid}`
   *  doc, merge `proposed` into the live profile, and clear the
   *  `hasPendingUpdate` flag — all in one batch. The source-of-truth
   *  is the verification doc; the profile doc only gets the merged
   *  fields + a status flip. */
  async function applyEditApproval(uid: string) {
    const db = getFirestore(getApp());
    const updateRef = doc(db, "tutorProfileUpdates", uid);
    const profileRef = doc(db, "users", uid, "tutorProfile", "default");

    // Read the proposed payload first; we need its contents to
    // spread into the profile. A small extra read is fine here —
    // approvals are rare and the alternative is a transaction
    // that's harder to read.
    const snap = await getDoc(updateRef);
    const data = snap.data() as
      | { proposed?: Record<string, unknown> }
      | undefined;
    const proposed = data?.proposed ?? {};

    const batch = writeBatch(db);
    batch.update(updateRef, {
      status: "approved",
      reviewedBy: admin?.uid ?? null,
      reviewedAt: serverTimestamp(),
    });
    batch.set(
      profileRef,
      {
        ...proposed,
        hasPendingUpdate: false,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    await batch.commit();

    // Tell the tutor their edit landed. Same ordering as the
    // verification handler: only fire after the batch succeeds.
    try {
      await writeNotification(uid, notificationCopy.editApproved);
    } catch (err) {
      console.warn("[VerificationQueue] edit-approval notification failed", err);
    }
  }

  /** Reject an edit: just flip the update doc to `rejected` and
   *  clear the `hasPendingUpdate` flag on the profile so the tutor
   *  can keep editing live-editable fields immediately. We do NOT
   *  re-verify the tutor on edit-reject — they're still a verified
   *  professional; we just didn't like this specific change. */
  async function applyEditRejection(uid: string, notes: string | null) {
    const db = getFirestore(getApp());
    const batch = writeBatch(db);
    const updateRef = doc(db, "tutorProfileUpdates", uid);
    const profileRef = doc(db, "users", uid, "tutorProfile", "default");
    batch.update(updateRef, {
      status: "rejected",
      adminNotes: notes,
      reviewedBy: admin?.uid ?? null,
      reviewedAt: serverTimestamp(),
    });
    batch.set(
      profileRef,
      {
        hasPendingUpdate: false,
        rejectionReason: notes,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    await batch.commit();

    // Tell the tutor the edit wasn't applied. The reason text the
    // admin typed rides along in the notification so they don't have
    // to dig into the queue to find it.
    try {
      await writeNotification(uid, notificationCopy.editRejected(notes ?? ""));
    } catch (err) {
      console.warn("[VerificationQueue] edit-rejection notification failed", err);
    }
  }

  async function handleAction(id: string, newStatus: QueueStatus) {
    if (busyId) return;
    setBusyId(id);
    try {
      await applyVerificationDecision(id, newStatus, null);
    } catch (err) {
      // Surface the failure inline; the onSnapshot listener will
      // re-render with whatever the server actually persisted.
      console.warn("[VerificationQueue] action failed", err);
    } finally {
      setBusyId(null);
    }
  }

  function openRejectDialog(
    id: string,
    name: string,
    kind: "verification" | "edit" = "verification",
  ) {
    setRejecting({ id, name, kind });
    setRejectReason("");
  }

  async function confirmReject() {
    if (!rejecting || rejectReason.trim().length === 0) return;
    if (busyId) return;
    const target = rejecting;
    setBusyId(target.id);
    setRejecting(null);
    setRejectReason("");
    try {
      if (target.kind === "edit") {
        await applyEditRejection(target.id, rejectReason);
      } else {
        await applyVerificationDecision(
          target.id,
          "rejected",
          rejectReason,
        );
      }
    } catch (err) {
      console.warn("[VerificationQueue] reject failed", err);
    } finally {
      setBusyId(null);
    }
  }

  async function handleEditApprove(id: string) {
    if (busyId) return;
    setBusyId(id);
    try {
      await applyEditApproval(id);
    } catch (err) {
      console.warn("[VerificationQueue] edit approve failed", err);
    } finally {
      setBusyId(null);
    }
  }

  function cancelReject() {
    setRejecting(null);
    setRejectReason("");
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Hero header */}
      <View className="bg-night px-5 pb-6 shrink-0">
        <Text className="text-body text-white/70 mb-0.5 mt-2">Moderation</Text>
        <Text className="text-screen-title font-medium text-white">
          Verification Queue
        </Text>
        <View className="flex-row items-center gap-2 mt-1">
          <View className="w-1.5 h-1.5 rounded-full bg-warning" />
          <Text className="text-caption text-white/70">
            {loading
              ? "Loading queue…"
              : `${totalOpen} open · ${decided.length} decided`}
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pt-6 pb-8"
        showsVerticalScrollIndicator={false}
      >
        {/* 1. New Tutor Verifications */}
        {newPending.length > 0 ? (
          <View className="mb-6">
            <SectionHeader
              title="New Tutor Verifications"
              count={newPending.length}
              accent="warning"
              helper="Tutors who just signed up and need an initial review."
            />
            {newPending.map((item) => (
              <VerificationCard
                key={item.id}
                item={item}
                status={item.status}
                busy={busyId === item.id}
                onApprove={() => handleAction(item.id, "approved")}
                onReject={() => openRejectDialog(item.id, item.name, "verification")}
                onRequestInfo={() => handleAction(item.id, "more_info")}
              />
            ))}
          </View>
        ) : null}

        {/* 2. Pending Edits */}
        {pendingEdits.length > 0 ? (
          <View className="mb-6">
            <SectionHeader
              title="Pending Edits"
              count={pendingEdits.length}
              accent="verification"
              helper="Verified tutors requesting changes to their profile. Approve to apply, reject to discard."
            />
            {pendingEdits.map((edit) => (
              <PendingEditCard
                key={edit.id}
                edit={edit}
                busy={busyId === edit.id}
                onApprove={() => handleEditApprove(edit.id)}
                onReject={() => openRejectDialog(edit.id, edit.name, "edit")}
              />
            ))}
          </View>
        ) : null}

        {/* 3. Info Requested */}
        {infoRequested.length > 0 ? (
          <View className="mb-6">
            <SectionHeader
              title="Info Requested"
              count={infoRequested.length}
              accent="ai"
              helper="Tutors waiting on a response — they see your request on their dashboard."
            />
            {infoRequested.map((item) => (
              <VerificationCard
                key={item.id}
                item={item}
                status={item.status}
                busy={busyId === item.id}
                onApprove={() => handleAction(item.id, "approved")}
                onReject={() => openRejectDialog(item.id, item.name, "verification")}
                onRequestInfo={() => handleAction(item.id, "more_info")}
              />
            ))}
          </View>
        ) : null}

        {/* 4. Decided (collapsed by default) */}
        {decided.length > 0 ? (
          <View className="mb-6">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={decidedExpanded ? "Hide decided" : "Show decided"}
              accessibilityState={{ expanded: decidedExpanded }}
              onPress={() => setDecidedExpanded((p) => !p)}
              className="flex-row items-center gap-2 mb-3 active:opacity-70"
            >
              <Ionicons
                name={decidedExpanded ? "chevron-down" : "chevron-forward"}
                size={16}
                color="#64748B"
              />
              <Text className="text-section-title font-medium text-text-primary">
                Decided
              </Text>
              <Text className="text-caption text-text-muted">({decided.length})</Text>
            </Pressable>
            {decidedExpanded
              ? decided.map((item) => (
                  <DecidedRow key={item.id} item={item} />
                ))
              : null}
          </View>
        ) : null}

        {!loading && totalOpen === 0 && decided.length === 0 ? (
          <EmptyState />
        ) : null}
      </ScrollView>

      <AdminNav />

      {/* Reject reason dialog — captured locally, persisted to the
          verification / update doc's `adminNotes` field via the
          `apply*` handlers above. */}
      <RejectReasonDialog
        visible={!!rejecting}
        tutorName={rejecting?.name ?? ""}
        reason={rejectReason}
        onChangeReason={setRejectReason}
        onCancel={cancelReject}
        onConfirm={confirmReject}
      />
    </SafeAreaView>
  );
}

/**
 * Open a verification document in the system browser. Used by
 * the tappable thumbnails in the verification card so the admin
 * can review the full-resolution scan in a familiar viewer.
 *
 * The `url` parameter is a public-read Supabase Storage URL
 * produced by `getVerificationDocPublicUrl`. We deliberately do
 * NOT call `Linking.openURL` on the raw `TutorDocument.path`
 * (e.g. `{uid}/id.jpg`) — that's a Supabase-internal path, not
 * a browser addressable URL.
 *
 * On link failure (no network, no browser handler) we surface
 * a friendly Alert instead of letting the error bubble up into
 * the queue's `console.warn` stream.
 */
function openVerificationDoc(url: string, label: string): void {
  Linking.openURL(url).catch((err) => {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn("[openVerificationDoc]", err);
    }
    Alert.alert(
      "Could not open document",
      `${label} couldn't be opened. Check the device's network and try again.`,
    );
  });
}

function SectionHeader({
  title,
  count,
  accent,
  helper,
}: {
  title: string;
  count: number;
  accent: "warning" | "ai" | "verification";
  helper?: string;
}) {
  const accentClass =
    accent === "warning"
      ? "bg-warning-bg text-warning-text"
      : accent === "ai"
        ? "bg-ai-light text-ai"
        : "bg-verification-light text-verification";
  return (
    <View className="mb-3">
      <View className="flex-row items-center gap-2">
        <Text className="text-section-title font-medium text-text-primary">
          {title}
        </Text>
        <View className={`px-2 py-0.5 rounded-pill ${accentClass}`}>
          <Text className="text-micro font-semibold">{count}</Text>
        </View>
      </View>
      {helper ? (
        <Text className="text-caption text-text-muted mt-1">{helper}</Text>
      ) : null}
    </View>
  );
}

function VerificationCard({
  item,
  status,
  busy,
  onApprove,
  onReject,
  onRequestInfo,
}: {
  item: Verification;
  status: QueueStatus;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
  onRequestInfo: () => void;
}) {
  return (
    <View className="bg-surface border border-border-subtle rounded-card p-4 mb-3">
      {/* Header */}
      <View className="flex-row items-start gap-3 mb-3">
        {/*
          The dicebear fallback in the snapshot handler always
          produces a URL, but defensive-guard anyway: a missing
          `avatarUrl` on a freshly-created verification doc, or a
          malformed seed, would otherwise crash the queue with
          "Cannot read property 'indexOf' of undefined" on Android.
        */}
        {typeof item.avatar === "string" && item.avatar.length > 0 ? (
          <Image
            source={{ uri: item.avatar }}
            className="w-12 h-12 rounded-full bg-sand"
            resizeMode="cover"
          />
        ) : (
          <View className="w-12 h-12 rounded-full bg-amber-light items-center justify-center">
            <Text className="text-card-title font-medium text-amber">
              {(item.name?.charAt(0) ?? "?").toUpperCase()}
            </Text>
          </View>
        )}
        <View className="flex-1 min-w-0">
          <Text className="text-card-title font-medium text-text-primary">{item.name}</Text>
          <View className="flex-row flex-wrap gap-1.5 mt-1">
            <Text className="text-caption text-text-muted">{item.email}</Text>
            {item.phone ? (
              <>
                <Text className="text-caption text-text-muted">·</Text>
                <Text className="text-caption text-text-muted">{item.phone}</Text>
              </>
            ) : null}
          </View>
          <Text className="text-caption text-text-muted mt-1">Submitted {item.submitted}</Text>
        </View>
        <View className="flex-shrink-0">
          <StatusBadge status={status} />
        </View>
      </View>

      {/* Details Grid */}
      <View className="flex-row flex-wrap gap-2 mb-3">
        <DetailItem label="Subjects" value={item.subjects.join(", ") || "—"} />
        <DetailItem label="Level" value={item.level} />
        <DetailItem label="Rate" value={`Rs ${item.rate.toLocaleString()}/mo`} />
        <DetailItem label="Experience" value={item.experience} />
      </View>

      {/* Bio */}
      {item.bio ? (
        <View className="bg-sand rounded-md p-3 mb-3">
          <Text className="text-micro text-text-muted uppercase tracking-wider mb-1">Bio</Text>
          <Text className="text-body-sm text-text-secondary">{item.bio}</Text>
        </View>
      ) : null}

      {/* Documents — tappable thumbnails. For image kinds
          (citizenship / certificate) the thumbnail renders the
          actual scan inline so reviewers can verify at a glance;
          for video the label is shown and a tap opens the file in
          the system browser. The `path` field on `TutorDocument`
          is the Supabase Storage object path, which the
          `getVerificationDocPublicUrl` helper turns into a
          public-read URL on the (public-read) verification-docs
          bucket. */}
      {item.documents.length > 0 ? (
        <View className="mb-3">
          <Text className="text-micro text-text-muted uppercase tracking-wider mb-2">Documents</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
            {item.documents.map((doc, i) => {
              const isImage = doc.kind === "citizenship" || doc.kind === "certificate";
              // `doc.path` is required for the public-URL helper
              // (see `getVerificationDocPublicUrl` in
              // `services/supabase/storage.ts`). A document row
              // without a path is a data-integrity bug, not a
              // normal state — wrap in try/catch so the queue
              // still renders the other docs and we surface the
              // issue in `__DEV__` instead of crashing the whole
              // card.
              let publicUrl: string | null = null;
              if (typeof doc.path === "string" && doc.path.length > 0) {
                try {
                  publicUrl = getVerificationDocPublicUrl(doc.path);
                } catch (err) {
                  if (__DEV__) {
                    // eslint-disable-next-line no-console
                    console.warn(
                      "[VerificationQueue] getVerificationDocPublicUrl failed",
                      err,
                    );
                  }
                }
              }
              return (
                <Pressable
                  key={`${doc.kind}-${i}`}
                  onPress={() =>
                    publicUrl
                      ? openVerificationDoc(publicUrl, TUTOR_DOC_LABEL[doc.kind])
                      : Alert.alert(
                          "Document unavailable",
                          "This document's storage path is missing. The tutor needs to re-upload it.",
                        )
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`View ${TUTOR_DOC_LABEL[doc.kind]} for ${item.name}`}
                  className="w-32 rounded-lg border border-border items-center bg-sand active:opacity-80 overflow-hidden"
                >
                  {isImage && publicUrl ? (
                    <Image
                      source={{ uri: publicUrl }}
                      className="w-full h-20 bg-sand"
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="w-full h-20 items-center justify-center bg-amber-light">
                      <Ionicons
                        name={isImage ? "image-outline" : "play-circle"}
                        size={28}
                        color="#B45309"
                      />
                    </View>
                  )}
                  <View className="w-full p-1.5">
                    <Text
                      className="text-[9px] font-semibold text-text-primary text-center"
                      numberOfLines={1}
                    >
                      {TUTOR_DOC_LABEL[doc.kind]}
                    </Text>
                    <Text
                      className="text-[8px] text-text-secondary text-center mt-0.5"
                      numberOfLines={1}
                    >
                      {doc.name}
                    </Text>
                    <Text className="text-[8px] text-text-muted text-center mt-0.5">
                      {formatBytes(doc.bytes)}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {/* Admin notes (visible if a previous decision captured a reason) */}
      {item.adminNotes ? (
        <View className="bg-danger-bg rounded-md p-3 mb-3">
          <Text className="text-micro text-danger uppercase tracking-wider mb-1">Admin note</Text>
          <Text className="text-body-sm text-text-secondary">{item.adminNotes}</Text>
        </View>
      ) : null}

      {/* Actions */}
      {status === "pending" || status === "more_info" ? (
        <View className="flex-row gap-2 pt-2 border-t border-border-subtle">
          <Pressable
            onPress={onApprove}
            disabled={busy}
            className="flex-1 h-10 bg-success rounded-md items-center justify-center flex-row gap-1.5 active:opacity-80 disabled:opacity-50"
            accessibilityRole="button"
            accessibilityLabel="Approve"
          >
            <Ionicons name="checkmark" size={14} color="#FFFFFF" />
            <Text className="text-button-sm font-medium text-text-inverse">Approve</Text>
          </Pressable>
          <Pressable
            onPress={onReject}
            disabled={busy}
            className="flex-1 h-10 bg-danger rounded-md items-center justify-center flex-row gap-1.5 active:opacity-80 disabled:opacity-50"
            accessibilityRole="button"
            accessibilityLabel="Reject"
          >
            <Ionicons name="close" size={14} color="#FFFFFF" />
            <Text className="text-button-sm font-medium text-text-inverse">Reject</Text>
          </Pressable>
          {status === "pending" ? (
            <Pressable
              onPress={onRequestInfo}
              disabled={busy}
              className="flex-1 h-10 bg-ai rounded-md items-center justify-center flex-row gap-1.5 active:opacity-80 disabled:opacity-50"
              accessibilityRole="button"
              accessibilityLabel="Request more info"
            >
              <Ionicons name="information-circle" size={14} color="#FFFFFF" />
              <Text className="text-button-sm font-medium text-text-inverse">Info</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

/**
 * Pending edit card — renders a row per changed field with the old
 * value (struck through, dimmed) and the new value (highlighted in
 * amber). Approve/Reject buttons at the bottom. There is no
 * "Request more info" — the only question for an edit is "do you
 * accept this change?".
 */
function PendingEditCard({
  edit,
  busy,
  onApprove,
  onReject,
}: {
  edit: PendingEdit;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <View className="bg-surface border border-border-subtle rounded-card p-4 mb-3">
      {/* Header */}
      <View className="flex-row items-start gap-3 mb-3">
        {typeof edit.avatar === "string" && edit.avatar.length > 0 ? (
          <Image
            source={{ uri: edit.avatar }}
            className="w-12 h-12 rounded-full bg-sand"
            resizeMode="cover"
          />
        ) : (
          <View className="w-12 h-12 rounded-full bg-amber-light items-center justify-center">
            <Text className="text-card-title font-medium text-amber">
              {(edit.name?.charAt(0) ?? "?").toUpperCase()}
            </Text>
          </View>
        )}
        <View className="flex-1 min-w-0">
          <Text className="text-card-title font-medium text-text-primary">
            {edit.name}
          </Text>
          <Text className="text-caption text-text-muted mt-0.5">
            {edit.email}
          </Text>
          <Text className="text-caption text-text-muted mt-1">
            Submitted {edit.submitted}
          </Text>
        </View>
        <View className="flex-shrink-0">
          <View className="bg-ai-light px-2.5 py-1 rounded-md flex-row items-center gap-1">
            <Ionicons name="create-outline" size={11} className="text-ai" />
            <Text className="text-micro font-medium text-ai">Edit</Text>
          </View>
        </View>
      </View>

      {/* Diff rows */}
      {edit.fields.length > 0 ? (
        <View className="bg-sand rounded-md p-3 mb-3 gap-3">
          {edit.fields.map((f, i) => (
            <View key={i}>
              <Text className="text-micro text-text-muted uppercase tracking-wider mb-1">
                {f.label}
              </Text>
              <View className="flex-row flex-wrap items-center gap-2">
                <Text
                  className="text-body-sm text-text-muted line-through"
                  numberOfLines={1}
                >
                  {f.oldValue}
                </Text>
                <Ionicons name="arrow-forward" size={12} color="#94A3B8" />
                <Text
                  className="text-body-sm font-medium text-amber"
                  numberOfLines={1}
                >
                  {f.newValue}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View className="bg-sand rounded-md p-3 mb-3">
          <Text className="text-body-sm text-text-secondary">
            No changed fields detected.
          </Text>
        </View>
      )}

      {/* Actions */}
      <View className="flex-row gap-2 pt-2 border-t border-border-subtle">
        <Pressable
          onPress={onApprove}
          disabled={busy}
          className="flex-1 h-10 bg-success rounded-md items-center justify-center flex-row gap-1.5 active:opacity-80 disabled:opacity-50"
          accessibilityRole="button"
          accessibilityLabel="Approve edit"
        >
          <Ionicons name="checkmark" size={14} color="#FFFFFF" />
          <Text className="text-button-sm font-medium text-text-inverse">
            Approve
          </Text>
        </Pressable>
        <Pressable
          onPress={onReject}
          disabled={busy}
          className="flex-1 h-10 bg-danger rounded-md items-center justify-center flex-row gap-1.5 active:opacity-80 disabled:opacity-50"
          accessibilityRole="button"
          accessibilityLabel="Reject edit"
        >
          <Ionicons name="close" size={14} color="#FFFFFF" />
          <Text className="text-button-sm font-medium text-text-inverse">Reject</Text>
        </Pressable>
      </View>
    </View>
  );
}

function DecidedRow({ item }: { item: Verification }) {
  const config = getStatusConfig(item.status);
  return (
    <Pressable
      className="bg-surface border border-border-subtle rounded-card p-3 mb-2 flex-row items-center gap-3 opacity-80 active:opacity-60"
    >
      {typeof item.avatar === "string" && item.avatar.length > 0 ? (
        <Image
          source={{ uri: item.avatar }}
          className="w-10 h-10 rounded-full bg-sand"
          resizeMode="cover"
        />
      ) : (
        <View className="w-10 h-10 rounded-full bg-amber-light items-center justify-center">
          <Text className="text-card-title font-medium text-amber">
            {(item.name?.charAt(0) ?? "?").toUpperCase()}
          </Text>
        </View>
      )}
      <View className="flex-1 min-w-0">
        <View className="flex-row items-center gap-1.5">
          <Text className="text-card-title font-medium text-text-primary">
            {item.name}
          </Text>
          {item.status === "approved" ? (
            <Ionicons name="checkmark-circle" size={16} className="text-success" />
          ) : null}
        </View>
        <Text className="text-caption text-text-muted mt-0.5">
          {item.submitted === "just now" || item.submitted === "recently"
            ? "Decided recently"
            : `Decided ${item.submitted}`}{" "}
          · {item.subjects.join(", ") || "—"}
        </Text>
      </View>
      <View className={`${config.bgClass} px-2.5 py-1 rounded-md`}>
        <Text className={`text-micro font-medium ${config.textClass}`}>
          {config.label}
        </Text>
      </View>
    </Pressable>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <View className="bg-sand rounded-md p-3 flex-1 min-w-[40%]">
      <Text className="text-micro text-text-muted uppercase tracking-wider">{label}</Text>
      <Text className="text-body-sm font-medium text-text-primary mt-0.5">{value}</Text>
    </View>
  );
}

function StatusBadge({ status }: { status: QueueStatus }) {
  const config = getStatusConfig(status);
  return (
    <View className={`${config.bgClass} px-2.5 py-1 rounded-md`}>
      <View className="flex-row items-center gap-1">
        <Ionicons name={config.icon} size={11} className={config.textClass} />
        <Text className={`text-micro font-medium ${config.textClass}`}>
          {config.label}
        </Text>
      </View>
    </View>
  );
}

function EmptyState() {
  return (
    <View className="items-center justify-center px-8 pt-20">
      <View className="w-14 h-14 rounded-pill bg-amber-light items-center justify-center mb-3">
        <Ionicons name="shield-checkmark" size={26} color="#B45309" />
      </View>
      <Text className="text-card-title font-medium text-text-primary text-center">
        Queue is clear
      </Text>
      <Text className="text-body text-text-secondary text-center mt-1.5">
        New tutor verifications and edit requests will appear here.
      </Text>
    </View>
  );
}

/**
 * Reject reason dialog — admin must enter a short reason before the
 * rejection is finalised. The reason is captured for the verification
 * / update doc's `adminNotes` (and mirrored onto the profile doc's
 * `rejectionReason`), which the tutor sees via the `ReviewBanner`
 * with `tone="rejected"`. The dialog is dismissable via the
 * backdrop or the cancel button.
 */
function RejectReasonDialog({
  visible,
  tutorName,
  reason,
  onChangeReason,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  tutorName: string;
  reason: string;
  onChangeReason: (s: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <Pressable
        accessibilityLabel="Dismiss dialog"
        onPress={onCancel}
        className="flex-1 bg-black/50 items-center justify-center px-6"
      >
        <Pressable
          onPress={() => {}}
          className="bg-surface rounded-hero p-5 w-full max-w-[360px] shadow-lg"
        >
          <View className="items-center mb-3">
            <View className="w-12 h-12 rounded-pill bg-danger-bg items-center justify-center">
              <Ionicons name="close-circle" size={24} color="#DC2626" />
            </View>
          </View>

          <Text className="text-section-title font-medium text-text-primary text-center">
            Reject {tutorName}?
          </Text>
          <Text className="text-body-sm text-text-secondary text-center mt-1.5">
            Tell the tutor why. They'll see this on their dashboard.
          </Text>

          <TextInput
            value={reason}
            onChangeText={onChangeReason}
            placeholder="e.g. Documents are unclear. Please re-upload a clearer citizenship scan."
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={4}
            className="mt-4 bg-sand rounded-card p-3 text-body text-text-primary min-h-[96px]"
            style={{ textAlignVertical: "top" }}
          />

          <View className="mt-4 gap-2">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Confirm rejection"
              onPress={onConfirm}
              disabled={reason.trim().length === 0}
              className="min-h-btn rounded-card bg-danger items-center justify-center active:opacity-80 disabled:opacity-50"
            >
              <Text className="text-button text-text-inverse font-semibold">
                Reject
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              onPress={onCancel}
              className="min-h-btn rounded-card bg-sand items-center justify-center active:opacity-80"
            >
              <Text className="text-button text-text-secondary font-medium">
                Cancel
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
