import { ImageViewerModal } from "@/components/ui/ImageViewer";
import { VideoViewerModal } from "@/components/ui/VideoViewer";
import { Ionicons } from "@expo/vector-icons";
import { getApp } from "@react-native-firebase/app";
import {
  collection,
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from "@react-native-firebase/firestore";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AdminNav } from "@/components/shared/AdminNav";
import {
  TUTOR_DOC_LABEL,
  formatBytes,
  type TutorDocument,
} from "@/lib/verification/documents";
import {
  notificationCopy,
  writeNotification,
} from "@/lib/verification/notifications";
import { getVerificationDocPublicUrl } from "@/services/supabase/storage";
import { useAuthStore } from "@/store/authStore";

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
  /** The proposed (new) documents the tutor wants to submit —
   *  extracted from `proposed.documents` so PendingEditCard can
   *  render actual image thumbnails instead of text labels. */
  proposedDocuments: TutorDocument[];
  /** The current (old) documents on the live profile — extracted
   *  from `current.documents` so the admin can compare old vs new. */
  currentDocuments: TutorDocument[];
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

/**
 * Async enrichment pass for the verification queue snapshot handler.
 * For entries where the `photoUrl` is a DiceBear fallback (meaning
 * the verification doc was created before the `photoUrl` mirroring
 * fix was deployed), read the real avatar from the profile doc
 * (`users/{uid}/tutorProfile/default`) and persist it back to the
 * verification doc so subsequent snapshots don't need the extra read.
 *
 * This is called after `setVerifications` and `setLoading` so the
 * queue renders immediately; the avatars update in-place as the
 * enrichment completes.
 */

/**
 * Resubmission check: tutors who were previously rejected (or asked
 * for more info) and then submitted a fresh profile via the
 * onboarding flow write to their profile doc with `verificationStatus:
 * "pending"` but do NOT update the source-of-truth
 * `tutorVerifications/{uid}` doc (the security rules only permit
 * admin updates on existing verification docs).
 *
 * This function reads the profile doc for each "rejected" /
 * "more_info" entry and, if the profile doc now shows
 * `verificationStatus === "pending"`, promotes that entry back to
 * "pending" so the admin sees the resubmission in the queue.
 *
 * Called after `setVerifications` so the queue renders immediately;
 * the status updates in-place as the check completes.
 */
async function checkResubmissions(
  db: ReturnType<typeof getFirestore>,
  rows: Verification[],
): Promise<Verification[]> {
  // Only check entries that are currently "rejected" or "more_info" —
  // these are the only states from which a tutor can resubmit. New
  // ("pending") entries and decided ("approved") entries don't need
  // checking.
  const candidates = rows.filter(
    (r) => r.status === "rejected" || r.status === "more_info",
  );
  if (candidates.length === 0) return rows;

  const enriched = await Promise.all(
    candidates.map(async (row) => {
      try {
        const profileRef = doc(
          db,
          "users",
          row.id,
          "tutorProfile",
          "default",
        );
        const profileSnap = await getDoc(profileRef);
        if (!profileSnap.exists()) return row;

        const data = profileSnap.data() as
          | { verificationStatus?: string | null }
          | undefined;
        const profileStatus = data?.verificationStatus ?? null;

        // If the profile doc says "pending", the tutor has
        // resubmitted. Promote this entry back to "pending" so
        // the admin sees it in the "New Tutor Verifications"
        // section instead of "Decided".
        if (profileStatus === "pending") {
          return { ...row, status: "pending" as QueueStatus, decided: false };
        }
      } catch {
        // Profile read failed — leave the entry at its current
        // status. The next snapshot cycle will retry.
      }
      return row;
    }),
  );

  // Merge the enriched rows back into the full list.
  const enrichedMap = new Map<string, Verification>();
  for (const r of enriched) enrichedMap.set(r.id, r);
  return rows.map((r) => enrichedMap.get(r.id) ?? r);
}
async function enrichMissingAvatars(
  db: ReturnType<typeof getFirestore>,
  rows: Verification[],
): Promise<Verification[]> {
  const dicebearPattern = "api.dicebear.com";
  const enriched = await Promise.all(
    rows.map(async (row) => {
      // Skip entries that already have a real avatar URL (not DiceBear).
      if (!row.avatar.includes(dicebearPattern)) return row;
      try {
        const profileRef = doc(
          db,
          "users",
          row.id,
          "tutorProfile",
          "default",
        );
        const profileSnap = await getDoc(profileRef);
        const profileData = profileSnap.data() as
          | { photoUrl?: string | null }
          | undefined;
        const fallbackPhoto =
          typeof profileData?.photoUrl === "string" &&
          profileData.photoUrl.length > 0
            ? profileData.photoUrl
            : null;
        if (fallbackPhoto) {
          // Persist back to the verification doc so subsequent
          // snapshot cycles don't need this extra read.
          const verificationRef = doc(db, "tutorVerifications", row.id);
          setDoc(verificationRef, { photoUrl: fallbackPhoto }, { merge: true }).catch(
            () => {
              /* non-fatal — next snapshot will re-enrich */
            },
          );
          return { ...row, avatar: fallbackPhoto };
        }
      } catch {
        // Fallback read failed — leave the DiceBear URL in place.
      }
      return row;
    }),
  );
  return enriched;
}

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
    // Documents are handled separately by PendingEditCard with actual
    // image thumbnails — skip them here to avoid a redundant text row.
    if (key === "documents") return;

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

    // Full-screen image preview state. When the admin taps an image
  // document thumbnail we show the ImageViewerModal instead of leaving
  // the app.
  const [previewImage, setPreviewImage] = useState<{
    uri: string;
    label: string;
  } | null>(null);

  // Full-screen video preview state. When the admin taps a demo video
  // thumbnail we show the VideoViewerModal instead of leaving the app.
  const [previewVideo, setPreviewVideo] = useState<{
    uri: string;
    label: string;
  } | null>(null);

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
    const unsubVerifications = onSnapshot(
      verificationsQuery,
      (snap) => {
        // Guard: `onSnapshot` should always pass a valid snapshot,
        // but a race between navigation and listener cleanup can
        // leave `snap` undefined if the component unmounts mid-
        // callback. Defensively guard against `null` to prevent
        // "Cannot read property 'docs' of null" errors when the
        // admin navigates rapidly between screens.
        if (!snap) {
          if (__DEV__) {
            console.warn(
              "[VerificationQueue] received null snapshot for tutorVerifications",
            );
          }
          return;
        }
      // Build rows synchronously — the queue renders immediately
      // with whatever data is available on the verification doc.
      // Entries that lack `photoUrl` get a DiceBear fallback URL
      // initially; a separate async enrichment pass (below)
      // backfills the real avatar from the profile doc.
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
          /** Avatar stored directly on the verification doc. Written
           *  by `TutorProfileScreen`'s batch set under the `photoUrl`
           *  key. The field was historically called `avatarUrl` but
           *  that name was never written — we read both for backward
           *  compatibility. */
          photoUrl?: string | null;
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
          // Prefer `photoUrl` (the field actually written by the
          // onboarding flow) over `avatarUrl` (a historical alias
          // that was never persisted). Fall back to DiceBear only
          // when neither is present.
          avatar:
            data.photoUrl ??
            data.avatarUrl ??
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
              data.fullName ?? d.id,
            )}`,
          email: data.email ?? "",
          phone: data.phoneDisplay ?? data.phone ?? "",
          // Prefer the most recent timestamp the server gave us;
          // the mock data used "submitted" so the field is reused
          // as a human label.
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

      // Render immediately so the queue doesn't wait for the
      // fallback reads. The enrichment pass below will update
      // any DiceBear avatars with the real photo.
      setVerifications(rows);
      setLoading(false);

      // Async enrichment: for entries that lack `photoUrl` on the
      // verification doc, try to read it from the profile doc
      // (`users/{uid}/tutorProfile/default`). This backfills old
      // entries created before `TutorProfileScreen` started
      // mirroring `photoUrl` onto the verification doc. The result
      // is also persisted back to the verification doc so
      // subsequent snapshot cycles don't need the extra reads.
      enrichMissingAvatars(db, rows).then(setVerifications).catch(() => {
        // Non-fatal — rows already rendered with DiceBear fallback.
      });

      // Async resubmission check: tutors who were rejected (or asked
      // for more info) and then resubmitted their profile via the
      // onboarding screen write to their profile doc with
      // `verificationStatus: "pending"` but CANNOT update the source-
      // of-truth `tutorVerifications/{uid}` doc (the security rules
      // only permit admin updates on existing verification docs).
      // This pass reads the profile doc for each "rejected" /
      // "more_info" entry and, if the profile doc now shows
      // `verificationStatus === "pending"`, promotes that entry back
      // to "pending" so the admin sees the resubmission in the queue.
      checkResubmissions(db, rows).then(setVerifications).catch(() => {
        // Non-fatal — the next snapshot cycle will retry.
      });
    },
    // Error callback: if the `tutorVerifications` collection read
    // fails (e.g. permission denied, network error), log the error
    // but don't crash. The component stays mounted and shows an
    // empty queue (or whatever state it last had) until the next
    // successful snapshot.
    (err) => {
      if (__DEV__) {
        console.warn(
          "[VerificationQueue] tutorVerifications onSnapshot error",
          err,
        );
      }
      setLoading(false);
    },
  );

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
        // Extract document arrays so PendingEditCard can render
        // image thumbnails instead of text labels.
        const proposedDocs: TutorDocument[] = Array.isArray(
          (data.proposed as Record<string, unknown> | undefined)?.documents,
        )
          ? ((data.proposed as Record<string, unknown>).documents as TutorDocument[])
          : [];
        const currentDocs: TutorDocument[] = Array.isArray(
          (
            (data.current as Record<string, unknown> | undefined) ??
            {}
          ).documents,
        )
          ? (
              ((data.current as Record<string, unknown>) ?? {}).documents as TutorDocument[]
            )
          : [];
        // Attempt to read the current avatar URL from the
        // `current` snapshot that EditTeachingDetails writes.
        // This is the only place photoUrl lives on the update doc
        // (it's not a `proposed` field unless the tutor explicitly
        // changed it via the edit-profile screen).
        const currentPhotoUrl: string | null | undefined =
          (
            (data.current as Record<string, unknown> | undefined) ??
            {}
          ).photoUrl as string | null | undefined;

        return {
          id: d.id,
          name: data.fullName ?? "Unknown tutor",
          avatar:
            currentPhotoUrl ??
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
              data.fullName ?? d.id,
            )}`,
          email: data.email ?? "",
          submitted: formatRelativeTime(data.submittedAt ?? null),
          fields,
          proposedDocuments: proposedDocs,
          currentDocuments: currentDocs,
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
                onPreviewDocument={(url, label) =>
                  setPreviewImage({ uri: url, label })
                }
                onPreviewVideo={(url, label) =>
                  setPreviewVideo({ uri: url, label })
                }
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
                onPreviewDocument={(url, label) =>
                  setPreviewImage({ uri: url, label })
                }
                onPreviewVideo={(url, label) =>
                  setPreviewVideo({ uri: url, label })
                }
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
                onPreviewDocument={(url, label) =>
                  setPreviewImage({ uri: url, label })
                }
                onPreviewVideo={(url, label) =>
                  setPreviewVideo({ uri: url, label })
                }
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
                color="#6B7268"
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

      {/* Full-screen image preview. Shows inside the app instead of
          opening the system browser. Only image documents open here. */}
      <ImageViewerModal
        visible={!!previewImage}
        uri={previewImage?.uri ?? ""}
        label={previewImage?.label ?? ""}
        onClose={() => setPreviewImage(null)}
      />

      {/* Full-screen video player. Shows inside the app instead of
          opening the system browser. Only demo videos open here. */}
      <VideoViewerModal
        visible={!!previewVideo}
        uri={previewVideo?.uri ?? ""}
        label={previewVideo?.label ?? ""}
        onClose={() => setPreviewVideo(null)}
      />
    </SafeAreaView>
  );
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
  onPreviewDocument,
  onPreviewVideo,
}: {
  item: Verification;
  status: QueueStatus;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
  onRequestInfo: () => void;
  /** Called when an image document thumbnail is tapped. Opens the
   *  in-app ImageViewerModal instead of the system browser. */
  onPreviewDocument?: (url: string, label: string) => void;
  /** Called when the demo video thumbnail is tapped. Opens the
   *  in-app VideoViewerModal instead of the system browser. */
  onPreviewVideo?: (url: string, label: string) => void;
}) {
  return (
    <View className="bg-surface border border-border rounded-card p-4 mb-3">
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
          <View className="w-12 h-12 rounded-full bg-accent-light items-center justify-center">
            <Text className="text-card-title font-medium text-accent">
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

      {/* Documents — tappable thumbnails using the shared
          DocumentThumbnail component so both VerificationCard and
          PendingEditCard render identical previews. */}
      {item.documents.length > 0 ? (
        <View className="mb-3">
          <Text className="text-micro text-text-muted uppercase tracking-wider mb-2">Documents</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
            {item.documents.map((doc, i) => (
              <DocumentThumbnail
                key={`${doc.kind}-${i}`}
                doc={doc}
                tutorName={item.name}
                onPreviewDocument={onPreviewDocument}
                onPreviewVideo={onPreviewVideo}
              />
            ))}
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
        <View className="flex-row gap-2 pt-2 border-t border-border">
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
 * Shared document thumbnail component used by both VerificationCard
 * and PendingEditCard. Resolves the public URL via
 * `getVerificationDocPublicUrl`, handles cache-busting with the
 * `uploadedAt` timestamp, and dispatches to ImageViewerModal or
 * VideoViewerModal on tap. Renders a 128px-wide card with the image
 * scan (or an icon fallback for videos/missing URLs), a label, and
 * the file size — exactly matching the admin queue's existing visual.
 */
function DocumentThumbnail({
  doc,
  tutorName,
  onPreviewDocument,
  onPreviewVideo,
}: {
  doc: TutorDocument;
  tutorName: string;
  onPreviewDocument?: (url: string, label: string) => void;
  onPreviewVideo?: (url: string, label: string) => void;
}) {
  const isImage = doc.kind === "citizenship" || doc.kind === "certificate";
  let publicUrl: string | null = null;
  if (typeof doc.path === "string" && doc.path.length > 0) {
    try {
      publicUrl = getVerificationDocPublicUrl(doc.path);
    } catch (err) {
      if (__DEV__) {
        console.warn(
          "[DocumentThumbnail] getVerificationDocPublicUrl failed",
          err,
        );
      }
    }
  }
  // Compute a single, consistent display URL that both the thumbnail
  // <Image> and the lightbox use. Without this, the thumbnail would
  // use the cache-busted URL (`?t=uploadedAt`) while the lightbox
  // receives the raw `publicUrl` — React Native's <Image> caches by
  // URI, so the lightbox would show a stale cached version while the
  // thumbnail shows the correct new one.
  const displayUrl =
    isImage && publicUrl && doc.uploadedAt
      ? `${publicUrl}?t=${encodeURIComponent(doc.uploadedAt)}`
      : publicUrl;

  return (
    <Pressable
      onPress={() => {
        if (isImage && displayUrl) {
          onPreviewDocument?.(displayUrl, TUTOR_DOC_LABEL[doc.kind]);
        } else if (!isImage && publicUrl) {
          onPreviewVideo?.(publicUrl, TUTOR_DOC_LABEL[doc.kind]);
        } else {
          Alert.alert(
            "Document unavailable",
            "This document's storage path is missing.",
          );
        }
      }}
      accessibilityRole="button"
      accessibilityLabel={`View ${TUTOR_DOC_LABEL[doc.kind]} for ${tutorName}`}
      className="w-32 rounded-lg border border-border items-center bg-sand active:opacity-80 overflow-hidden"
    >
      {isImage && displayUrl ? (
        <Image
          source={{ uri: displayUrl }}
          className="w-full h-20 bg-sand"
          resizeMode="cover"
        />
      ) : (
        <View className="w-full h-20 items-center justify-center bg-accent-light">
          <Ionicons
            name={isImage ? "image-outline" : "play-circle"}
            size={28}
            color="#E5A03B"
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
        <Text className="text-[8px] text-text-muted text-center mt-0.5">
          {formatBytes(doc.bytes)}
        </Text>
      </View>
    </Pressable>
  );
}

/**
 * Pending edit card — renders a row per changed field with the old
 * value (struck through, dimmed) and the new value (highlighted in
 * accent). If the edit includes document changes, the proposed
 * documents are shown as image thumbnails (same size as the
 * VerificationCard preview) so the admin can visually verify the
 * new scans. Approve/Reject buttons at the bottom. There is no
 * "Request more info" — the only question for an edit is "do you
 * accept this change?".
 */
function PendingEditCard({
  edit,
  busy,
  onApprove,
  onReject,
  onPreviewDocument,
  onPreviewVideo,
}: {
  edit: PendingEdit;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
  /** Called when an image document thumbnail is tapped. Opens the
   *  in-app ImageViewerModal — same as VerificationCard. */
  onPreviewDocument?: (url: string, label: string) => void;
  /** Called when the demo video thumbnail is tapped. Opens the
   *  in-app VideoViewerModal — same as VerificationCard. */
  onPreviewVideo?: (url: string, label: string) => void;
}) {
  const hasDocChanges = edit.proposedDocuments.length > 0;

  return (
    <View className="bg-surface border border-border rounded-card p-4 mb-3">
      {/* Header */}
      <View className="flex-row items-start gap-3 mb-3">
        {typeof edit.avatar === "string" && edit.avatar.length > 0 ? (
          <Image
            source={{ uri: edit.avatar }}
            className="w-12 h-12 rounded-full bg-sand"
            resizeMode="cover"
          />
        ) : (
          <View className="w-12 h-12 rounded-full bg-accent-light items-center justify-center">
            <Text className="text-card-title font-medium text-accent">
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

      {/* Proposed document thumbnails — uses the shared
          DocumentThumbnail component so both VerificationCard and
          PendingEditCard render identical previews. */}
      {hasDocChanges ? (
        <View className="mb-3">
          <Text className="text-micro text-text-muted uppercase tracking-wider mb-2">
            Updated documents
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="flex-row gap-2"
          >
            {edit.proposedDocuments.map((doc, i) => (
              <DocumentThumbnail
                key={`${doc.kind}-${i}`}
                doc={doc}
                tutorName={edit.name}
                onPreviewDocument={onPreviewDocument}
                onPreviewVideo={onPreviewVideo}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}

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
                <Ionicons name="arrow-forward" size={12} color="#6B7268" />
                <Text
                  className="text-body-sm font-medium text-accent"
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
      <View className="flex-row gap-2 pt-2 border-t border-border">
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
      className="bg-surface border border-border rounded-card p-3 mb-2 flex-row items-center gap-3 opacity-80 active:opacity-60"
    >
      {typeof item.avatar === "string" && item.avatar.length > 0 ? (
        <Image
          source={{ uri: item.avatar }}
          className="w-10 h-10 rounded-full bg-sand"
          resizeMode="cover"
        />
      ) : (
        <View className="w-10 h-10 rounded-full bg-accent-light items-center justify-center">
          <Text className="text-card-title font-medium text-accent">
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
      <View className="w-14 h-14 rounded-pill bg-accent-light items-center justify-center mb-3">
        <Ionicons name="shield-checkmark" size={26} color="#E5A03B" />
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
              <Ionicons name="close-circle" size={24} color="#C1503D" />
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
            placeholderTextColor="#6B7268"
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
