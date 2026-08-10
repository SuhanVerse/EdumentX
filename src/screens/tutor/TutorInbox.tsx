import {
  ChevronDown,
  ChevronUp,
  Check,
  X,
  RefreshCw,
  MapPin,
  ShieldCheck,
} from "lucide-react-native";
import {
  ScreenLayout,
  ScreenHeader,
  ScreenScroll,
} from "@/components/shared/ScreenLayout";
import { useState } from "react";
import { useRouter } from "expo-router";
import { Alert, Image, Pressable, Text, View } from "react-native";
import { TutorBottomBar } from "@/components/domain/TutorBottomBar";

// TODO(firebase): replace with a Firestore `enrollmentRequests` query
// filtered by `tutorId == auth.uid && status == "pending"`, ordered by
// `submittedAt desc`. `distanceKm` is computed client-side from the
// tutor's stored location + the request's `location` field (Haversine,
// see services/geo/distance.ts) — it is not stored on the document.
type EnrollmentRequest = {
  id: string;
  student: { name: string; grade: string; avatar: string };
  subjects: string[];
  planMonths: number;
  schedule: string;
  startDate: string;
  distanceKm: number;
  serviceAreaLabel: string;
  serviceRadiusM: number;
  mapPreviewUri: string;
  withinServiceRadius: boolean;
};

const PENDING_REQUESTS: readonly EnrollmentRequest[] = [
  {
    id: "er1",
    student: {
      name: "Aarav Tamang",
      grade: "Grade 10",
      avatar: "https://i.pravatar.cc/100?img=68",
    },
    subjects: ["Mathematics"],
    planMonths: 3,
    schedule: "Mon, Wed, Fri",
    startDate: "2026-05-10",
    distanceKm: 1.2,
    serviceAreaLabel: "Baluwatar area (~400m radius)",
    serviceRadiusM: 400,
    mapPreviewUri:
      "https://images.unsplash.com/photo-1524661135-423995f22d0b?w=600&q=60",
    withinServiceRadius: true,
  },
  {
    id: "er2",
    student: {
      name: "Priya Maharjan",
      grade: "Grade 11 (Science)",
      avatar: "https://i.pravatar.cc/100?img=47",
    },
    subjects: ["Physics", "Chemistry"],
    planMonths: 6,
    schedule: "Tue, Thu, Sat",
    startDate: "2026-05-15",
    distanceKm: 2.4,
    serviceAreaLabel: "Lazimpat area (~600m radius)",
    serviceRadiusM: 600,
    mapPreviewUri:
      "https://images.unsplash.com/photo-1524661135-423995f22d0b?w=600&q=60",
    withinServiceRadius: true,
  },
] as const;

type RequestAction = "accepted" | "declined";

function showComingSoon(feature: string) {
  Alert.alert("Coming soon", `${feature} will be added in a future update.`);
}

export function EnrollmentInbox() {
  // TODO(firebase): seed from the request list itself — every card
  // starts expanded per design (both fully shown), so this only needs
  // to track collapse if the tutor manually closes one.
  const router = useRouter();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [actions, setActions] = useState<Record<string, RequestAction>>({});

  function toggleCollapsed(id: string) {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  // TODO(firebase): wire to `updateDoc(enrollmentRequests/{id}, { status: "accepted" })`
  // inside a transaction that also increments `tutorProfiles/{uid}.studentCapacity.current`.
  function handleAccept(id: string) {
    setActions((prev) => ({ ...prev, [id]: "accepted" }));
  }

  // TODO(firebase): wire to `updateDoc(enrollmentRequests/{id}, { status: "rejected" })`.
  function handleDecline(id: string) {
    setActions((prev) => ({ ...prev, [id]: "declined" }));
  }

  return (
    <ScreenLayout variant="surface">

      {/* Top app bar — standard light ScreenHeader slot */}
      <ScreenHeader variant="light">
        <View className="self-start border-b-2 border-accent pb-0.5">
          <Text className="text-display text-text-primary">
            Enrollment inbox
          </Text>
        </View>
        <Text className="text-body text-verification mt-0.5">
          {PENDING_REQUESTS.length} pending requests
        </Text>
      </ScreenHeader>

      <ScreenScroll className="flex-1 bg-background">
        <View className="flex-col gap-3.5">
          {PENDING_REQUESTS.map((req) => {
            const isCollapsed = collapsed[req.id];
            const action = actions[req.id];

            return (
              <RequestCard
                key={req.id}
                request={req}
                collapsed={!!isCollapsed}
                action={action}
                onToggleCollapsed={() => toggleCollapsed(req.id)}
                onAccept={() => handleAccept(req.id)}
                onDecline={() => handleDecline(req.id)}
              />
            );
          })}
        </View>
      </ScreenScroll>

      <TutorBottomBar inboxBadgeCount={PENDING_REQUESTS.length} />
    </ScreenLayout>
  );
}

type RequestCardProps = {
  request: EnrollmentRequest;
  collapsed: boolean;
  action?: RequestAction;
  onToggleCollapsed: () => void;
  onAccept: () => void;
  onDecline: () => void;
};

function RequestCard({
  request,
  collapsed,
  action,
  onToggleCollapsed,
  onAccept,
  onDecline,
}: RequestCardProps) {
  return (
    <View
      className={`bg-surface rounded-card border border-l-4 p-4 ${
        action === "accepted"
          ? "border-verification border-l-verification"
          : action === "declined"
            ? "border-danger-bg border-l-danger"
            : "border-border border-l-accent"
      }`}
      style={{ opacity: action ? 0.85 : 1 }}
    >
      {/* Header row: avatar, name, grade, status, collapse toggle */}
      <Pressable
        onPress={onToggleCollapsed}
        className="flex-row items-start gap-3 active:opacity-70"
        accessibilityRole="button"
        accessibilityLabel={`${collapsed ? "Expand" : "Collapse"} request from ${request.student.name}`}
      >
        <AvatarCircle uri={request.student.avatar} name={request.student.name} />
        <View className="flex-1">
          <View className="flex-row justify-between items-center">
            <Text className="text-card-title font-medium text-text-primary">
              {request.student.name}
            </Text>
            <View className="flex-row items-center gap-1.5">
              {!action ? <PendingBadge /> : <StatusBadge action={action} />}
              {collapsed ? (
                <ChevronDown size={16} color="#6B7268" />
              ) : (
                <ChevronUp size={16} color="#6B7268" />
              )}
            </View>
          </View>
          <Text className="text-caption text-text-muted mt-0.5">
            {request.student.grade}
          </Text>
        </View>
      </Pressable>

      {!collapsed && (
        <View className="mt-3.5">
          {/* Subject chips */}
          <View className="flex-row gap-1.5 flex-wrap mb-3">
            {request.subjects.map((s) => (
              <SubjectChip key={s} label={s} />
            ))}
          </View>

          {/* Plan / Schedule / Start / Distance grid */}
          <View className="bg-background rounded-md p-3 flex-row flex-wrap">
            <DetailField
              label="Plan"
              value={`${request.planMonths} month${request.planMonths > 1 ? "s" : ""}`}
            />
            <DetailField label="Schedule" value={request.schedule} />
            <DetailField label="Start" value={request.startDate} />
            <DetailField
              label="Distance"
              value={`${request.distanceKm.toFixed(1)} km`}
            />
          </View>

          {/* Map preview */}
          {/* TODO(firebase): static image stand-in for the planned
              react-native-maps snippet. The dashed radius + pin overlay
              are drawn here as absolute-positioned views since the real
              service-radius geometry will come from the tutor's stored
              `location` + `serviceRadiusM` once wired. */}
          <View className="mt-3 rounded-lg overflow-hidden border border-border">
            <View className="relative">
              {/*
                Same guard as AvatarCircle above. A missing/empty
                mapPreviewUri is plausible for brand-new enrollment
                requests where the geocoding step hasn't completed;
                <Image source={{ uri: undefined }}> crashes the
                inbox on Android. Render a tinted placeholder tile
                with the location pin so the request still reads
                correctly.
              */}
              {typeof request.mapPreviewUri === "string" &&
              request.mapPreviewUri.length > 0 ? (
                <Image
                  source={{ uri: request.mapPreviewUri }}
                  className="w-full h-36"
                  resizeMode="cover"
                />
              ) : (
                <View className="w-full h-36 bg-sand items-center justify-center gap-1.5">
                  <MapPin size={22} color="#E5A03B" />
                  <Text className="text-caption text-text-secondary">
                    Map preview unavailable
                  </Text>
                </View>
              )}
              <View className="absolute top-2 left-2 bg-night/80 rounded-sm px-2 py-1">
                <Text className="text-micro text-white font-medium">
                  {request.serviceAreaLabel}
                </Text>
              </View>
              {/* Student location dot */}
              <View
                className="absolute w-3 h-3 rounded-full bg-ai border-2 border-white"
                style={{ top: "55%", left: "35%" }}
              />
              {/* Tutor service radius ring */}
              <View
                className="absolute w-16 h-16 rounded-full border-2 border-verification"
                style={{ top: "30%", left: "55%", opacity: 0.7 }}
              />
            </View>
          </View>

          {/* Within-radius confirmation */}
          {request.withinServiceRadius && (
            <View className="flex-row items-center gap-2 mt-3 bg-verification-light rounded-md px-3 py-2.5">
              <ShieldCheck size={15} color="#3F8A5A" />
              <Text className="flex-1 text-caption text-text-secondary">
                Within your service radius — exact address shared after
                acceptance.
              </Text>
            </View>
          )}

          {/* Actions */}
          {!action ? (
            <View className="flex-row gap-2 mt-3.5">
              <Pressable
                onPress={onAccept}
                className="flex-1 h-10 rounded-md bg-verification flex-row items-center justify-center gap-1.5 active:opacity-80"
                accessibilityRole="button"
                accessibilityLabel="Accept request"
              >
                <Check size={14} color="#FFFFFF" />
                <Text className="text-button font-medium text-white">
                  Accept
                </Text>
              </Pressable>
              <Pressable
                onPress={onDecline}
                className="flex-1 h-10 rounded-md bg-surface border border-danger-bg flex-row items-center justify-center gap-1.5 active:opacity-80"
                accessibilityRole="button"
                accessibilityLabel="Decline request"
              >
                <X size={14} color="#C1503D" />
                <Text className="text-button font-medium text-danger">
                  Decline
                </Text>
              </Pressable>
              <Pressable
                onPress={() => showComingSoon("Counter-offer")}
                className="flex-1 h-10 rounded-md bg-ai-light border border-ai/20 flex-row items-center justify-center gap-1.5 active:opacity-80"
                accessibilityRole="button"
                accessibilityLabel="Counter-offer"
              >
                <RefreshCw size={13} color="#4A7FA5" />
                <Text className="text-button font-medium text-ai">Counter</Text>
              </Pressable>
            </View>
          ) : (
            <Text
              className={`mt-3.5 text-center text-caption ${
                action === "accepted" ? "text-verification" : "text-text-muted"
              }`}
            >
              {action === "accepted"
                ? "Accepted — exact address shared with student"
                : "Declined"}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

type DetailFieldProps = { label: string; value: string };

function DetailField({ label, value }: DetailFieldProps) {
  return (
    <View style={{ width: "50%" }} className="mb-2 pr-2">
      <Text className="text-micro text-text-muted uppercase tracking-wider">
        {label}
      </Text>
      <Text className="text-button-sm text-text-primary mt-0.5">{value}</Text>
    </View>
  );
}

type SubjectChipProps = { label: string };

function SubjectChip({ label }: SubjectChipProps) {
  return (
    <View className="px-2 py-1 rounded-sm bg-verification-light">
      <Text className="text-micro text-verification-dark font-medium">{label}</Text>
    </View>
  );
}

function PendingBadge() {
  return (
    <View className="px-2 py-0.5 rounded-sm bg-warning-bg">
      <Text className="text-micro font-semibold text-warning-text">Pending</Text>
    </View>
  );
}

type StatusBadgeProps = { action: RequestAction };

function StatusBadge({ action }: StatusBadgeProps) {
  const palette =
    action === "accepted"
      ? {
          bg: "bg-verification-light",
          text: "text-verification",
          label: "Accepted",
        }
      : { bg: "bg-danger-bg", text: "text-danger", label: "Declined" };

  return (
    <View className={`px-2 py-0.5 rounded-sm ${palette.bg}`}>
      <Text className={`text-micro font-semibold ${palette.text}`}>
        {palette.label}
      </Text>
    </View>
  );
}

type AvatarCircleProps = { uri?: string | null; name?: string };

/**
 * Renders a network avatar image when `uri` is a truthy non-empty
 * string; otherwise falls back to the first letter of `name` on a
 * tinted tile.
 *
 * The truthy guard is required, not stylistic: React Native's
 * `<Image source={{ uri: "" }}>` and `<Image source={{ uri: undefined }}>`
 * throw "Cannot read property 'indexOf' of undefined" on Android
 * because the native image factory tries to introspect the URI
 * string with `.indexOf(...)` and bails when the value is not a
 * non-empty string. The mock data in this file always sets `avatar`
 * to a real URL, but real Firestore data (or a partially-saved
 * profile) can leave it missing — and a single missing avatar would
 * crash the whole inbox screen.
 */
function AvatarCircle({ uri, name }: AvatarCircleProps) {
  const hasImage = typeof uri === "string" && uri.length > 0;
  const initial = (name?.charAt(0) ?? "?").toUpperCase();
  if (!hasImage) {
    return (
      <View className="w-10 h-10 rounded-full bg-surface-muted items-center justify-center">
        <Text className="text-card-title font-medium text-text-muted">{initial}</Text>
      </View>
    );
  }
  return (
    <Image
      source={{ uri: uri as string }}
      className="w-10 h-10 rounded-full bg-surface-muted"
    />
  );
}
