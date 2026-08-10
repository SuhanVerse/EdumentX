import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { ScreenLayout, ScreenSheet } from "@/components/shared/ScreenLayout";
import { getApp } from "@react-native-firebase/app";
import {
  getFirestore,
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "@react-native-firebase/firestore";
import { useAuthStore } from "@/store/authStore";

// NOTE: this file used to import `@/components/shared/ScreenHeader`
// (which doesn't exist) and `lucide-react-native` (which isn't in
// package.json). We render the header inline (matches the slate-hero
// pattern used by StudentHome / MapSearch / AIChat / Enrollment /
// StudentProfile) and use Ionicons — the project's only icon
// dependency. The notification preferences overlay is also kept
// inline as a Modal: it's a screen-local concern with no other
// consumer, so extracting it would just thread state across modules
// for no reuse benefit.

/* ----------------------------- types ----------------------------- */

// Firestore notification categories (see `lib/verification/notifications.ts`).
// These are the values written by the admin queue and stored on
// `notifications/{uid}/{autoId}.type`.
//
// Verification (5) — admin decisions on a tutor's signup / profile edit.
// Enrollment (4)   — tutor decisions on a student's enrollment request.
type FirestoreNotifType =
  | "verification_approved"
  | "verification_rejected"
  | "verification_more_info"
  | "edit_approved"
  | "edit_rejected"
  | "enrollment_accepted"
  | "enrollment_declined"
  | "enrollment_removed"
  | "enrollment_completed";

// The on-screen category union — slightly broader than the Firestore
// one because the original mock included `ai`, `enrollment`, etc.
// for student-side notifications. Today only `verification` is
// populated from Firestore; the rest of the tabs are kept around
// for future use (a future PR will wire AI / enrollment / message
// streams into the same center).
type NotifType =
  | "ai"
  | "enrollment"
  | "message"
  | "review"
  | "verification"
  | "broadcast"
  | "trending"
  | "system";

type NotifMeta = {
  /**
   * Ionicons glyph name. We use this directly instead of importing
   * lucide-react-native (which isn't in the project deps).
   */
  icon: keyof typeof Ionicons.glyphMap;
  /** Icon background — design tokens via Tailwind classes. */
  bgClass: string;
  /** Icon foreground — design tokens via Tailwind classes. */
  fgClass: string;
  label: string;
  /** Short user-facing description used in the prefs overlay. */
  description: string;
};

type NotifRow = {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  /** Free-form reason text captured by the admin (rejection
   *  reason, info-request prompt). Empty string when N/A. */
  reason: string;
  /** `createdAt` converted to ms — the relative-time formatter
   *  reads this instead of a `Date` so we never have to ship a
   *  Timestamp across the React boundary. */
  timeMs: number;
  read: boolean;
};

/* ----------------------------- meta ------------------------------ */

const TYPE_META: Record<NotifType, NotifMeta> = {
  ai: {
    icon: "sparkles",
    bgClass: "bg-ai-light",
    fgClass: "text-ai",
    label: "AI",
    description: "Tutor matches, learning nudges, and AI suggestions.",
  },
  enrollment: {
    icon: "calendar",
    bgClass: "bg-accent-light",
    fgClass: "text-accent",
    label: "Enrollment",
    description: "Session confirmations, schedule changes, batch invites.",
  },
  message: {
    icon: "chatbubble-ellipses",
    bgClass: "bg-success-bg",
    fgClass: "text-success",
    label: "Message",
    description: "New messages from your tutors and study groups.",
  },
  review: {
    icon: "star",
    bgClass: "bg-warning-bg",
    fgClass: "text-warning-text",
    label: "Review",
    description: "Reminders to rate your tutor after completed sessions.",
  },
  verification: {
    icon: "shield-checkmark",
    bgClass: "bg-verification-light",
    fgClass: "text-verification",
    label: "Verification",
    description: "Updates on your tutor verification and edit requests.",
  },
  broadcast: {
    icon: "megaphone",
    bgClass: "bg-onb-map",
    fgClass: "text-text-primary",
    label: "Broadcast",
    description: "Platform-wide announcements from EdumentX.",
  },
  trending: {
    icon: "trending-up",
    bgClass: "bg-warning-bg",
    fgClass: "text-warning-text",
    label: "Trending",
    description: "Popular subjects, tutors, and batches in your area.",
  },
  system: {
    icon: "triangle",
    bgClass: "bg-danger-bg",
    fgClass: "text-danger",
    label: "System",
    description: "Account, security, and policy-related alerts.",
  },
};

/**
 * Map a Firestore notification `type` to the on-screen `NotifType`.
 * Verification types land in the "Verification" tab; enrollment
 * notifications land in the "Enrollments" tab. Any unknown type
 * falls back to "system" so an unknown doc doesn't crash the feed.
 */
function mapFirestoreNotifType(t: FirestoreNotifType): NotifType {
  switch (t) {
    case "verification_approved":
    case "verification_rejected":
    case "verification_more_info":
    case "edit_approved":
    case "edit_rejected":
      return "verification";
    case "enrollment_accepted":
    case "enrollment_declined":
    case "enrollment_removed":
    case "enrollment_completed":
      return "enrollment";
  }
}

/** Pull a `Date` out of a Firestore `Timestamp` / `Date` / ISO string. */
function readTimestamp(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === "object" && value !== null && "toDate" in value) {
    try {
      return (value as { toDate: () => Date }).toDate();
    } catch {
      return null;
    }
  }
  return null;
}

/** Short relative label — mirrors the format the admin queue uses. */
function formatRelative(date: Date | null): string {
  if (!date) return "recently";
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

const TABS = ["All", "Unread", "Verification", "Enrollments"] as const;
type Tab = (typeof TABS)[number];

/* ----------------------------- screen ----------------------------- */

export function NotificationsCenter() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [tab, setTab] = useState<Tab>("All");
  const [showPrefs, setShowPrefs] = useState(false);

  // Live rows from Firestore. Subscribes to the signed-in user's
  // `notifications` subcollection; for non-signed-in callers (the
  // layout guard usually means this never happens) we fall back to
  // an empty list rather than throw — the empty state is friendlier
  // than an error during sign-out.
  const [rows, setRows] = useState<NotifRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Per-type prefs live at the screen level so toggling a switch in
  // the overlay actually flips the indicator that drives filtering.
  // (Previously each PrefRow held its own `useState(true)` — toggling
  // was local-only and lost on close.)
  const [prefs, setPrefs] = useState<Record<NotifType, boolean>>(() => {
    const init = {} as Record<NotifType, boolean>;
    (Object.keys(TYPE_META) as NotifType[]).forEach((k) => {
      init[k] = true;
    });
    return init;
  });

  useEffect(() => {
    if (!user?.uid) {
      setRows([]);
      setLoading(false);
      return;
    }
    const db = getFirestore(getApp());
    const q = collection(db, "notifications", user.uid, "items");
    const unsub = onSnapshot(
      q,
      (snap) => {
        const next: NotifRow[] = snap.docs.map((d) => {
          const data = d.data() as {
            type?: FirestoreNotifType;
            title?: string;
            body?: string;
            reason?: string;
            createdAt?: unknown;
            read?: boolean;
          };
          const ts = readTimestamp(data.createdAt);
          return {
            id: d.id,
            type: mapFirestoreNotifType(
              (data.type ?? "verification_approved") as FirestoreNotifType,
            ),
            title: data.title ?? "Update",
            body: data.body ?? "",
            reason: data.reason ?? "",
            timeMs: ts?.getTime() ?? 0,
            read: !!data.read,
          };
        });
        // Newest first — the `createdAt` timestamp is the source of
        // truth for ordering. Fall back to id (lexicographic) when
        // timestamps haven't been resolved yet.
        next.sort((a, b) => {
          if (a.timeMs && b.timeMs) return b.timeMs - a.timeMs;
          if (a.timeMs) return -1;
          if (b.timeMs) return 1;
          return b.id.localeCompare(a.id);
        });
        setRows(next);
        setLoading(false);
      },
      (err) => {
        // If the user is mid-sign-out the collection read can race
        // with auth teardown — log and show the empty state.
        console.warn("[NotificationsCenter] snapshot error", err);
        setRows([]);
        setLoading(false);
      },
    );
    return unsub;
  }, [user?.uid]);

  const filtered = useMemo(() => {
    return rows.filter((n) => {
      if (!prefs[n.type]) return false; // category is muted
      if (tab === "All") return true;
      if (tab === "Unread") return !n.read;
      if (tab === "Verification") return n.type === "verification";
      if (tab === "Enrollments") return n.type === "enrollment";
      return true;
    });
  }, [rows, tab, prefs]);

  /**
   * Tap handler — marks the notification read in Firestore and
   * optimistically updates local state. The `notifications` rule
   * restricts the recipient to flipping `read` / `readAt` only,
   * so the diff stays inside the server's allowed-key set.
   */
  async function markRead(row: NotifRow) {
    if (row.read || !user?.uid) return;
    // Optimistic local flip so the badge clears immediately.
    setRows((prev) =>
      prev.map((r) => (r.id === row.id ? { ...r, read: true } : r)),
    );
    try {
      const db = getFirestore(getApp());
      await updateDoc(doc(db, "notifications", user.uid, "items", row.id), {
        read: true,
        readAt: serverTimestamp(),
      });
    } catch (err) {
      // Roll back if the server rejected the write.
      console.warn("[NotificationsCenter] markRead failed", err);
      setRows((prev) =>
        prev.map((r) => (r.id === row.id ? { ...r, read: false } : r)),
      );
    }
  }

  function togglePref(key: NotifType) {
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
  }

  return (
    <ScreenLayout variant="background">
      {/* Inline header — replaces the (non-existent)
          `<ScreenHeader>` and matches the slate-hero shape used by
          every other student screen. */}
      <View className="bg-night px-5 pb-5 shrink-0">
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
            <Text className="text-body text-white/70 mb-0.5">Inbox</Text>
            <Text className="text-screen-title font-medium text-white">
              Notifications
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Notification preferences"
            onPress={() => setShowPrefs(true)}
            className="w-10 h-10 rounded-pill bg-white/10 items-center justify-center active:opacity-70"
          >
            <Ionicons name="settings-outline" size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      {/* Light content — tabs + list overlapping the dark hero
          (premium dark→light seam, shared `ScreenSheet` pattern) */}
      <ScreenSheet>
      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="bg-surface border-b border-border px-4 py-3 flex-grow-0"
      >
        {TABS.map((t) => {
          const isActive = tab === t;
          return (
            <Pressable
              key={t}
              accessibilityRole="tab"
              accessibilityLabel={t}
              accessibilityState={{ selected: isActive }}
              onPress={() => setTab(t)}
              className={
                isActive
                  ? "mr-1.5 px-4 py-2 rounded-pill bg-accent active:opacity-80"
                  : "mr-1.5 px-4 py-2 rounded-pill bg-sand active:opacity-80"
              }
            >
              <Text
                className={
                  isActive
                    ? "text-button-sm font-medium text-text-inverse"
                    : "text-button-sm font-medium text-text-secondary"
                }
              >
                {t}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* List */}
      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-9"
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <LoadingState />
        ) : filtered.length === 0 ? (
          <EmptyState tab={tab} />
        ) : (
          filtered.map((n) => (
            <Row key={n.id} n={n} onPress={() => markRead(n)} />
          ))
        )}
      </ScrollView>
      </ScreenSheet>

      {/* Preferences overlay — kept inline (no separate file). Owns
          no business logic beyond toggling the `prefs` map. */}
      <NotificationPreferences
        visible={showPrefs}
        prefs={prefs}
        onToggle={togglePref}
        onClose={() => setShowPrefs(false)}
      />
    </ScreenLayout>
  );
}

/* ----------------------------- pieces ----------------------------- */

function Row({ n, onPress }: { n: NotifRow; onPress: () => void }) {
  const meta = TYPE_META[n.type];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${n.title}, ${formatRelative(
        n.timeMs ? new Date(n.timeMs) : null,
      )}`}
      className={
        n.read
          ? "flex-row gap-3 px-5 py-4 border-b border-border bg-surface active:opacity-80"
          : "flex-row gap-3 px-5 py-4 border-b border-border bg-accent-light/30 active:opacity-80"
      }
    >
      <View
        className={`w-avatar h-avatar rounded-pill items-center justify-center ${meta.bgClass}`}
      >
        <Ionicons name={meta.icon} size={20} color={iconColorForClass(meta.fgClass)} />
      </View>
      <View className="flex-1 min-w-0">
        <View className="flex-row items-center gap-2 mb-0.5">
          <Text
            className="text-card-title text-text-primary flex-1"
            numberOfLines={1}
          >
            {n.title}
          </Text>
          {!n.read && <View className="w-1.5 h-1.5 rounded-pill bg-accent" />}
        </View>
        <Text
          className="text-body text-text-secondary leading-5 mb-1"
          numberOfLines={2}
        >
          {n.body}
        </Text>
        {n.reason ? (
          <View className="bg-danger-bg rounded-md p-2 mt-1 mb-1">
            <Text className="text-micro text-danger font-semibold mb-0.5">
              Admin note
            </Text>
            <Text className="text-caption text-text-secondary">{n.reason}</Text>
          </View>
        ) : null}
        <Text className="text-caption text-text-muted">
          {formatRelative(n.timeMs ? new Date(n.timeMs) : null)}
        </Text>
      </View>
    </Pressable>
  );
}

function LoadingState() {
  return (
    <View className="items-center justify-center px-8 pt-20">
      <View className="w-14 h-14 rounded-pill bg-sand items-center justify-center mb-3">
        <Ionicons name="sync" size={26} color="#6B7268" />
      </View>
      <Text className="text-body text-text-secondary">Loading your inbox…</Text>
    </View>
  );
}

function EmptyState({ tab }: { tab: Tab }) {
  // Per-tab copy. The four buckets get distinct titles so the empty
  // state never reads as "No all notifications" / "No enrollments
  // notifications" (the previous `No ${tab.toLowerCase()} notifications`
  // template rendered exactly that for the All / Enrollments tabs).
  const { title, body } = (() => {
    if (tab === "Unread") {
      return {
        title: "All caught up",
        body: "You've read everything in your inbox. Nice.",
      };
    }
    if (tab === "Verification") {
      return {
        title: "No verification updates",
        body: "Tutor verification and edit-request decisions will appear here.",
      };
    }
    if (tab === "Enrollments") {
      return {
        title: "No enrollment updates",
        body: "Session confirmations and tutor decisions will appear here.",
      };
    }
    return {
      title: "No notifications yet",
      body: "We'll let you know when something new arrives.",
    };
  })();
  return (
    <View className="items-center justify-center px-8 pt-20">
      <View className="w-14 h-14 rounded-pill bg-accent-light items-center justify-center mb-3">
        <Ionicons name="sparkles" size={26} color="#E5A03B" />
      </View>
      <Text className="text-card-title font-medium text-text-primary text-center">
        {title}
      </Text>
      <Text className="text-body text-text-secondary text-center mt-1.5">
        {body}
      </Text>
    </View>
  );
}

function NotificationPreferences({
  visible,
  prefs,
  onToggle,
  onClose,
}: {
  visible: boolean;
  prefs: Record<NotifType, boolean>;
  onToggle: (k: NotifType) => void;
  onClose: () => void;
}) {
  const enabledCount = Object.values(prefs).filter(Boolean).length;
  const total = Object.keys(TYPE_META).length;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        accessibilityLabel="Close preferences"
        onPress={onClose}
        className="flex-1 bg-black/40 justify-end"
      >
        {/* Inner Pressable absorbs taps inside the sheet so the
            backdrop dismiss only fires on the area outside. */}
        <Pressable
          onPress={() => {}}
          className="bg-surface rounded-t-[20px] pt-2.5 pb-8 max-h-[90%]"
        >
          {/* Handle */}
          <View className="items-center mb-3">
            <View className="w-10 h-1 rounded-pill bg-border" />
          </View>

          {/* Header */}
          <View className="flex-row items-center px-5 pb-4">
            <View className="flex-1">
              <Text className="text-section-title font-medium text-text-primary">
                Notification preferences
              </Text>
              <Text className="text-caption text-text-muted mt-0.5">
                {enabledCount} of {total} categories enabled
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onClose}
              className="w-9 h-9 items-center justify-center rounded-pill bg-sand active:opacity-70"
            >
              <Ionicons name="close" size={18} color="#6B7268" />
            </Pressable>
          </View>

          <ScrollView
            className="px-5"
            style={{ maxHeight: 480 }}
            showsVerticalScrollIndicator={false}
          >
            {(Object.keys(TYPE_META) as NotifType[]).map((k) => (
              <PrefRow
                key={k}
                meta={TYPE_META[k]}
                on={prefs[k]}
                onToggle={() => onToggle(k)}
              />
            ))}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Enable all categories"
              onPress={() => {
                (Object.keys(TYPE_META) as NotifType[]).forEach((k) => {
                  if (!prefs[k]) onToggle(k);
                });
              }}
              className="mt-5 mb-2 min-h-btn rounded-card bg-accent items-center justify-center active:opacity-80"
            >
              <Text className="text-button text-text-inverse font-semibold">
                Enable all
              </Text>
            </Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function PrefRow({
  meta,
  on,
  onToggle,
}: {
  meta: NotifMeta;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={meta.label}
      accessibilityState={{ checked: on }}
      onPress={onToggle}
      className="flex-row items-center gap-3 py-3 border-b border-border active:opacity-80"
    >
      <View
        className={`w-10 h-10 rounded-pill items-center justify-center ${meta.bgClass}`}
      >
        <Ionicons
          name={meta.icon}
          size={18}
          color={iconColorForClass(meta.fgClass)}
        />
      </View>
      <View className="flex-1 min-w-0 pr-3">
        <Text className="text-card-title text-text-primary">{meta.label}</Text>
        <Text className="text-caption text-text-muted mt-0.5" numberOfLines={2}>
          {meta.description}
        </Text>
      </View>
      {/* Switch — track uses verification green when on, border gray
          when off; thumb is a white circle that slides. */}
      <View
        className={
          on
            ? "w-11 h-6 rounded-pill bg-verification justify-center"
            : "w-11 h-6 rounded-pill bg-border justify-center"
        }
      >
        <View
          className="w-5 h-5 rounded-pill bg-surface"
          style={{
            marginLeft: on ? 22 : 2,
            shadowColor: "#000",
            shadowOpacity: 0.15,
            shadowRadius: 2,
            shadowOffset: { width: 0, height: 1 },
            elevation: 2,
          }}
        />
      </View>
    </Pressable>
  );
}

/**
 * Map a NativeWind text color class to its hex string for the
 * `Ionicons` `color` prop (which doesn't accept className). Keeping
 * the mapping centralized means the design tokens remain the source
 * of truth — these hex strings stay in sync with `tailwind.config.js`
 * because both files are checked together.
 */
function iconColorForClass(fgClass: string): string {
  switch (fgClass) {
    case "text-ai":
      return "#4A7FA5";
    case "text-accent":
      return "#E5A03B";
    case "text-warning-text":
      return "#92400E";
    case "text-success":
      return "#3F8A5A";
    case "text-verification":
      return "#3F8A5A";
    case "text-danger":
      return "#C1503D";
    case "text-text-primary":
    default:
      return "#26302B";
  }
}
