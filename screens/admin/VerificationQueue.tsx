import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import {
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
 * stored on the verification doc as `adminNotes`; the tutor sees it
 * on their home screen via the `ReviewBanner` with `tone="rejected"`.
 *
 * Mock data is fine for this phase. Phase 5 will wire real reads +
 * writes against `tutorVerifications/{uid}` and `tutorProfileUpdates/{uid}`.
 */

type QueueStatus = "pending" | "approved" | "rejected" | "more_info";

type Verification = {
  id: string;
  name: string;
  avatar: string;
  email: string;
  phone: string;
  submitted: string;
  subjects: string[];
  level: string;
  rate: number;
  experience: string;
  bio: string;
  documents: string[];
  status: QueueStatus;
};

const NEW_VERIFICATIONS: Verification[] = [
  {
    id: "v1",
    name: "Bishal Acharya",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bishal",
    email: "bishal.acharya@example.com",
    phone: "+977 9841234567",
    submitted: "2 days ago",
    subjects: ["Physics", "Mathematics"],
    level: "+2 Science",
    rate: 6000,
    experience: "3 years teaching +2 Science",
    bio: "Passionate physics teacher with a master's degree. Helped 50+ students crack entrance exams.",
    documents: [
      "Citizenship Front",
      "Citizenship Back",
      "Teaching License",
      "Degree Certificate",
      "Experience Letter",
    ],
    status: "pending",
  },
  {
    id: "v2",
    name: "Sita Thapa",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sita",
    email: "sita.thapa@example.com",
    phone: "+977 9851234567",
    submitted: "5 days ago",
    subjects: ["English", "Nepali"],
    level: "SEE",
    rate: 4500,
    experience: "2 years tutoring",
    bio: "English literature graduate. Focus on grammar, writing, and communication skills.",
    documents: [
      "Citizenship Front",
      "Citizenship Back",
      "Degree Certificate",
    ],
    status: "pending",
  },
];

const INFO_REQUESTED: Verification[] = [
  {
    id: "v4",
    name: "Priya Maharjan",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Priya",
    email: "priya.maharjan@example.com",
    phone: "+977 9871234567",
    submitted: "3 days ago",
    subjects: ["Chemistry", "Biology"],
    level: "+2 Science",
    rate: 5500,
    experience: "1 year tutoring",
    bio: "Recent medical student. Specializes in NEET preparation and +2 board exams.",
    documents: [
      "Citizenship Front",
      "Citizenship Back",
      "Student ID",
      "Transcript",
    ],
    status: "more_info",
  },
];

const DECIDED: Verification[] = [
  {
    id: "v3",
    name: "Ram Karki",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ram",
    email: "ram.karki@example.com",
    phone: "+977 9861234567",
    submitted: "1 week ago",
    subjects: ["Computer Science"],
    level: "Bachelor's",
    rate: 7000,
    experience: "4 years industry + 1 year teaching",
    bio: "Software engineer turned educator. Teaches programming fundamentals and web development.",
    documents: [
      "Citizenship Front",
      "Citizenship Back",
      "Degree Certificate",
      "Experience Letter",
    ],
    status: "approved",
  },
];

/**
 * A pending edit = an already-verified tutor asking to change their
 * profile. We render old (current) vs new (proposed) values side by
 * side so the admin sees exactly what would change if they approve.
 *
 * The `id` matches the tutor's `users/{uid}` so Phase 5 can correlate
 * the diff back to the live tutorProfile doc.
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

const PENDING_EDITS: PendingEdit[] = [
  {
    id: "v3",
    name: "Ram Karki",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ram",
    email: "ram.karki@example.com",
    submitted: "1 day ago",
    fields: [
      {
        label: "Monthly rate",
        oldValue: "Rs 7,000",
        newValue: "Rs 8,500",
      },
      {
        label: "Location",
        oldValue: "Lalitpur, Patan",
        newValue: "Kathmandu, Baluwatar",
      },
      {
        label: "Headline",
        oldValue: "Software engineer turned educator",
        newValue: "Web development and DSA coach — 5+ yrs industry",
      },
    ],
  },
];

function getStatusConfig(status: QueueStatus) {
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

export function VerificationQueue() {
  // Local status overrides for new verifications + info-requested
  // items (decided items are immutable in this UI). The initial
  // value seeds from the mock so a `pending` card shows pending on
  // first render; subsequent decisions mutate this map and the card
  // moves to the right section.
  const [statuses, setStatuses] = useState<Record<string, QueueStatus>>(() => {
    const init: Record<string, QueueStatus> = {};
    NEW_VERIFICATIONS.forEach((v) => { init[v.id] = v.status; });
    INFO_REQUESTED.forEach((v) => { init[v.id] = v.status; });
    return init;
  });

  // `rejecting` is set to the id of the verification being rejected.
  // The RejectReasonDialog reads from this and writes back the
  // captured reason. Keeping it as a string (not an object) so we
  // can also pass it to the dialog as a single `key`.
  const [rejecting, setRejecting] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // A moveable flag for the "Decided" section so the admin can
  // collapse it out of the way once the queue is empty.
  const [decidedExpanded, setDecidedExpanded] = useState(false);

  const newPending = useMemo(
    () => NEW_VERIFICATIONS.filter((v) => (statuses[v.id] ?? v.status) === "pending"),
    [statuses],
  );
  const infoRequested = useMemo(
    () => INFO_REQUESTED.filter((v) => (statuses[v.id] ?? v.status) === "more_info"),
    [statuses],
  );
  // Items the admin has decided on locally — kept separately from
  // the seed `DECIDED` array so a fresh `pending → approved` action
  // shows up here without losing its identity.
  const decided = useMemo(() => {
    const decidedFromActions = Object.entries(statuses)
      .filter(([, s]) => s === "approved" || s === "rejected")
      .map(([id, s]) => {
        const v =
          NEW_VERIFICATIONS.find((x) => x.id === id) ??
          INFO_REQUESTED.find((x) => x.id === id);
        if (!v) return null;
        return { ...v, status: s };
      })
      .filter((x): x is Verification => x !== null);
    return [...DECIDED, ...decidedFromActions];
  }, [statuses]);

  function handleAction(id: string, newStatus: QueueStatus) {
    setStatuses((p) => ({ ...p, [id]: newStatus }));
  }

  function openRejectDialog(id: string, name: string) {
    setRejecting({ id, name });
    setRejectReason("");
  }

  function confirmReject() {
    if (!rejecting) return;
    // In Phase 5 the reason would be persisted to the verification
    // doc's `adminNotes` (or `rejectionReason` field). For now we
    // just flip the status — the captured reason is in the dialog
    // state and would be piped to the write call.
    handleAction(rejecting.id, "rejected");
    setRejecting(null);
    setRejectReason("");
  }

  function cancelReject() {
    setRejecting(null);
    setRejectReason("");
  }

  const totalOpen = newPending.length + infoRequested.length + PENDING_EDITS.length;

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
            {totalOpen} open · {decided.length} decided
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
                status={statuses[item.id] ?? item.status}
                onApprove={() => handleAction(item.id, "approved")}
                onReject={() => openRejectDialog(item.id, item.name)}
                onRequestInfo={() => handleAction(item.id, "more_info")}
              />
            ))}
          </View>
        ) : null}

        {/* 2. Pending Edits */}
        {PENDING_EDITS.length > 0 ? (
          <View className="mb-6">
            <SectionHeader
              title="Pending Profile Edits"
              count={PENDING_EDITS.length}
              accent="ai"
              helper="Verified tutors asking to change their profile. Approving writes the new values; rejecting discards them. While pending, the tutor is hidden from student discovery."
            />
            {PENDING_EDITS.map((edit) => (
              <PendingEditCard
                key={edit.id}
                edit={edit}
                onApprove={() => handleAction(edit.id, "approved")}
                onReject={() => openRejectDialog(edit.id, edit.name)}
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
              helper="Waiting on the tutor to upload more documents or details."
            />
            {infoRequested.map((item) => (
              <VerificationCard
                key={item.id}
                item={item}
                status={statuses[item.id] ?? item.status}
                onApprove={() => handleAction(item.id, "approved")}
                onReject={() => openRejectDialog(item.id, item.name)}
                onRequestInfo={() => handleAction(item.id, "more_info")}
              />
            ))}
          </View>
        ) : null}

        {/* 4. Decided (collapsed by default) */}
        {decided.length > 0 ? (
          <View>
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

        {totalOpen === 0 && decided.length === 0 ? (
          <EmptyState />
        ) : null}
      </ScrollView>

      <AdminNav current="/verification-queue" />

      {/* Reject reason dialog — captured locally, would be persisted
          to the verification doc's `adminNotes` in Phase 5. */}
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
  onApprove,
  onReject,
  onRequestInfo,
}: {
  item: Verification;
  status: QueueStatus;
  onApprove: () => void;
  onReject: () => void;
  onRequestInfo: () => void;
}) {
  return (
    <View className="bg-surface border border-border-subtle rounded-card p-4 mb-3">
      {/* Header */}
      <View className="flex-row items-start gap-3 mb-3">
        <Image
          source={{ uri: item.avatar }}
          className="w-12 h-12 rounded-full bg-sand"
          resizeMode="cover"
        />
        <View className="flex-1 min-w-0">
          <Text className="text-card-title font-medium text-text-primary">{item.name}</Text>
          <View className="flex-row flex-wrap gap-1.5 mt-1">
            <Text className="text-caption text-text-muted">{item.email}</Text>
            <Text className="text-caption text-text-muted">·</Text>
            <Text className="text-caption text-text-muted">{item.phone}</Text>
          </View>
          <Text className="text-caption text-text-muted mt-1">Submitted {item.submitted}</Text>
        </View>
        <View className="flex-shrink-0">
          <StatusBadge status={status} />
        </View>
      </View>

      {/* Details Grid */}
      <View className="flex-row flex-wrap gap-2 mb-3">
        <DetailItem label="Subjects" value={item.subjects.join(", ")} />
        <DetailItem label="Level" value={item.level} />
        <DetailItem label="Rate" value={`Rs ${item.rate.toLocaleString()}/mo`} />
        <DetailItem label="Experience" value={item.experience} />
      </View>

      {/* Bio */}
      <View className="bg-sand rounded-md p-3 mb-3">
        <Text className="text-micro text-text-muted uppercase tracking-wider mb-1">Bio</Text>
        <Text className="text-body-sm text-text-secondary">{item.bio}</Text>
      </View>

      {/* Documents */}
      <View className="mb-3">
        <Text className="text-micro text-text-muted uppercase tracking-wider mb-2">Documents</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
          {item.documents.map((doc, i) => (
            <View
              key={i}
              className="w-28 h-20 rounded-lg border border-border items-center justify-center bg-sand"
            >
              <Text className="text-[8px] font-medium text-text-secondary text-center px-1">
                {doc}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Actions */}
      {status === "pending" || status === "more_info" ? (
        <View className="flex-row gap-2 pt-2 border-t border-border-subtle">
          <Pressable
            onPress={onApprove}
            className="flex-1 h-10 bg-success rounded-md items-center justify-center flex-row gap-1.5 active:opacity-80"
            accessibilityRole="button"
            accessibilityLabel="Approve"
          >
            <Ionicons name="checkmark" size={14} color="#FFFFFF" />
            <Text className="text-button-sm font-medium text-text-inverse">Approve</Text>
          </Pressable>
          <Pressable
            onPress={onReject}
            className="flex-1 h-10 bg-danger rounded-md items-center justify-center flex-row gap-1.5 active:opacity-80"
            accessibilityRole="button"
            accessibilityLabel="Reject"
          >
            <Ionicons name="close" size={14} color="#FFFFFF" />
            <Text className="text-button-sm font-medium text-text-inverse">Reject</Text>
          </Pressable>
          {status === "pending" ? (
            <Pressable
              onPress={onRequestInfo}
              className="flex-1 h-10 bg-ai rounded-md items-center justify-center flex-row gap-1.5 active:opacity-80"
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
  onApprove,
  onReject,
}: {
  edit: PendingEdit;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <View className="bg-surface border border-border-subtle rounded-card p-4 mb-3">
      {/* Header */}
      <View className="flex-row items-start gap-3 mb-3">
        <Image
          source={{ uri: edit.avatar }}
          className="w-12 h-12 rounded-full bg-sand"
          resizeMode="cover"
        />
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

      {/* Actions */}
      <View className="flex-row gap-2 pt-2 border-t border-border-subtle">
        <Pressable
          onPress={onApprove}
          className="flex-1 h-10 bg-success rounded-md items-center justify-center flex-row gap-1.5 active:opacity-80"
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
          className="flex-1 h-10 bg-danger rounded-md items-center justify-center flex-row gap-1.5 active:opacity-80"
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
      <Image
        source={{ uri: item.avatar }}
        className="w-10 h-10 rounded-full bg-sand"
        resizeMode="cover"
      />
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
          Submitted {item.submitted} · {item.subjects.join(", ")}
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
 * doc's `adminNotes` (Phase 5), which the tutor sees via the
 * `ReviewBanner` with `tone="rejected"`. The dialog is dismissable
 * via the backdrop or the cancel button.
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
  // A small "are you sure?" guard would be nice but a second
  // confirmation is overkill here — once the reason is captured the
  // admin can always flip the card back to `pending` in Phase 5.
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
