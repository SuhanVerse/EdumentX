import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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
  time: string;
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
    bgClass: "bg-amber-light",
    fgClass: "text-amber",
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
    description: "Updates when a tutor completes their verification.",
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

const NOTIFS: NotifRow[] = [
  {
    id: "1",
    type: "ai",
    title: "New tutor match",
    body: "We found 3 new Math tutors near Baluwatar that match your needs.",
    time: "2 min ago",
    read: false,
  },
  {
    id: "2",
    type: "enrollment",
    title: "Class confirmed",
    body: "Bishal Acharya accepted your Physics enrollment. First class Friday 6 PM.",
    time: "1 hr ago",
    read: false,
  },
  {
    id: "3",
    type: "message",
    title: "Riya Shrestha",
    body: "Hi! Welcome — please share your school's syllabus.",
    time: "3 hr ago",
    read: false,
  },
  {
    id: "4",
    type: "review",
    title: "Rate your tutor",
    body: "You've completed 2 sessions with Anil Karki. Share a review!",
    time: "Yesterday",
    read: true,
  },
  {
    id: "5",
    type: "broadcast",
    title: "EdumentX update",
    body: "Map view is rolling out to all student accounts next week.",
    time: "2 days ago",
    read: true,
  },
];

const TABS = ["All", "Unread", "AI", "Enrollment", "Message"] as const;
type Tab = (typeof TABS)[number];

/* ----------------------------- screen ----------------------------- */

export function NotificationsCenter() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("All");
  const [showPrefs, setShowPrefs] = useState(false);

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

  const filtered = useMemo(() => {
    return NOTIFS.filter((n) => {
      if (!prefs[n.type]) return false; // category is muted
      if (tab === "All") return true;
      if (tab === "Unread") return !n.read;
      if (tab === "AI") return n.type === "ai";
      if (tab === "Enrollment") return n.type === "enrollment";
      if (tab === "Message") return n.type === "message";
      return true;
    });
  }, [tab, prefs]);

  function togglePref(key: NotifType) {
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      {/* Inline header — replaces the (non-existent)
          `<ScreenHeader>` and matches the slate-hero shape used by
          every other student screen. */}
      <View className="bg-night px-5 pb-5 shrink-0">
        <View className="flex-row items-center gap-3 mt-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => router.replace("/student-home")}
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

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="bg-surface border-b border-border-subtle px-4 py-3 flex-grow-0"
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
                  ? "mr-1.5 px-4 py-2 rounded-pill bg-amber active:opacity-80"
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
        {filtered.length === 0 ? (
          <EmptyState tab={tab} />
        ) : (
          filtered.map((n) => <Row key={n.id} n={n} />)
        )}
      </ScrollView>

      {/* Preferences overlay — kept inline (no separate file). Owns
          no business logic beyond toggling the `prefs` map. */}
      <NotificationPreferences
        visible={showPrefs}
        prefs={prefs}
        onToggle={togglePref}
        onClose={() => setShowPrefs(false)}
      />
    </SafeAreaView>
  );
}

/* ----------------------------- pieces ----------------------------- */

function Row({ n }: { n: NotifRow }) {
  const meta = TYPE_META[n.type];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${n.title}, ${n.time}`}
      className={
        n.read
          ? "flex-row gap-3 px-5 py-4 border-b border-border-subtle bg-surface active:opacity-80"
          : "flex-row gap-3 px-5 py-4 border-b border-border-subtle bg-amber-light/30 active:opacity-80"
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
          {!n.read && <View className="w-1.5 h-1.5 rounded-pill bg-amber" />}
        </View>
        <Text
          className="text-body text-text-secondary leading-5 mb-1"
          numberOfLines={2}
        >
          {n.body}
        </Text>
        <Text className="text-caption text-text-muted">{n.time}</Text>
      </View>
    </Pressable>
  );
}

function EmptyState({ tab }: { tab: Tab }) {
  const { title, body } = (() => {
    if (tab === "Unread") {
      return {
        title: "All caught up",
        body: "You've read everything in your inbox. Nice.",
      };
    }
    return {
      title: `No ${tab.toLowerCase()} notifications`,
      body: "We'll let you know when something new arrives.",
    };
  })();
  return (
    <View className="items-center justify-center px-8 pt-20">
      <View className="w-14 h-14 rounded-pill bg-amber-light items-center justify-center mb-3">
        <Ionicons name="sparkles" size={26} color="#B45309" />
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
              <Ionicons name="close" size={18} color="#475569" />
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
              className="mt-5 mb-2 min-h-btn rounded-card bg-amber items-center justify-center active:opacity-80"
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
      className="flex-row items-center gap-3 py-3 border-b border-border-subtle active:opacity-80"
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
      return "#4F46E5";
    case "text-amber":
      return "#B45309";
    case "text-warning-text":
      return "#92400E";
    case "text-success":
      return "#047857";
    case "text-verification":
      return "#047857";
    case "text-danger":
      return "#DC2626";
    case "text-text-primary":
    default:
      return "#0F172A";
  }
}