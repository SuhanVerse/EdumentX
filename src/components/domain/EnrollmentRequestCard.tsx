/**
 * EdumentX — Enrollment Request Card
 *
 * The studio card the tutor sees in the `EnrollmentInbox` screen.
 * Originally inline in `screens/tutor/tutor_inbox.tsx`; extracted as
 * part of the live-data wiring (Phase 5) so the parent can stay
 * focused on subscription glue and the card owns its own state.
 *
 * Three states the parent passes via the `action` prop:
 *   - `undefined` (no accept/decline yet) → the Accept/Decline
 *     buttons are visible.
 *   - `"accepted"` → card flips to a verification-green stripe,
 *     opacity drops to 0.85, footer copy reads "Accepted — exact
 *     address shared with student".
 *   - `"declined"` → card flips to a danger-red stripe, footer
 *     copy reads "Declined".
 *
 * The card itself is collapsible. The parent seeds the `collapsed`
 * flag from its own collapsed map; tapping the header row toggles
 * it via `onToggleCollapsed`. The default is "expanded" — every
 * card is fully shown on first render.
 *
 * The "Location" block displays the request's `location` (street +
 * map preview) when available, otherwise a "Map preview unavailable"
 * placeholder. The distance + service-area chips are derived from
 * the request's `withinServiceRadius` field — when false the
 * confirmation footer is hidden.
 */

import { Check, ChevronDown, ChevronUp, ShieldCheck, X } from "lucide-react-native";
import { Image, Pressable, Text, View } from "react-native";

import type { EnrollmentRequest } from "@/services/enrollments/types";

export type EnrollmentRequestAction = "accepted" | "declined";

export type EnrollmentRequestCardProps = {
  /** The live enrollment request. The mock-era geo/plan fields
   *  (distanceKm, planMonths, service radius, map preview) are not
   *  part of the domain type — they're rendered only when the
   *  optional enrichment props below are provided. */
  request: EnrollmentRequest;
  collapsed: boolean;
  action?: EnrollmentRequestAction;
  onToggleCollapsed: () => void;
  onAccept: () => void;
  onDecline: () => void;
  /** Optional ActivityIndicator flag for the Accept button. The
   *  parent flips this on while the acceptRequest transaction is
   *  in flight. */
  accepting?: boolean;
  /** Optional street-map preview URI (future geo enrichment). When
   *  absent the map block is skipped entirely. */
  mapPreviewUri?: string | null;
  /** Label for the map-preview chip, e.g. "Baluwatar (~400m)". */
  serviceAreaLabel?: string;
  /** When true, renders the "within service radius" confirmation. */
  withinServiceRadius?: boolean;
};

export function EnrollmentRequestCard({
  request,
  collapsed,
  action,
  onToggleCollapsed,
  onAccept,
  onDecline,
  accepting,
  mapPreviewUri,
  serviceAreaLabel = "",
  withinServiceRadius = false,
}: EnrollmentRequestCardProps) {
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
      {/* Header row */}
      <Pressable
        onPress={onToggleCollapsed}
        className="flex-row items-start gap-3 active:opacity-70"
        accessibilityRole="button"
        accessibilityLabel={`${collapsed ? "Expand" : "Collapse"} request from ${request.studentName}`}
      >
        <AvatarCircle uri={request.studentAvatar} name={request.studentName} />
        <View className="flex-1">
          <View className="flex-row justify-between items-center">
            <Text className="text-card-title font-medium text-text-primary">
              {request.studentName}
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
            {request.studentGrade}
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

          {/* Student message — front-and-center when present.
              *  This is the student's primary ask in their own
              *  words; rendering it before the structured
              *  schedule / dates lets the tutor see "why" first
              *  and "when" second. Empty messages skip the block. */}
          {request.message && request.message.trim().length > 0 ? (
            <View className="bg-accent-soft border border-accent/30 rounded-card p-3 mb-3">
              <Text className="text-micro font-semibold text-accent-dark uppercase tracking-wider mb-1">
                From the student
              </Text>
              <Text className="text-body-sm text-text-primary leading-relaxed">
                {request.message}
              </Text>
            </View>
          ) : null}

          {/* Plan / Schedule / Start / Distance grid */}
          <View className="bg-background rounded-md p-3 flex-row flex-wrap">
            <DetailField label="Schedule" value={request.schedule} />
            <DetailField label="Start" value={request.startDate} />
            <DetailField label="End" value={request.endDate} />
          </View>

          {/* Map preview — only when a preview URI exists (future
              geo enrichment). Live requests carry no location yet,
              so this block is skipped for them. */}
          {mapPreviewUri ? (
            <View className="mt-3 rounded-lg overflow-hidden border border-border">
              <View className="relative">
                <Image
                  source={{ uri: mapPreviewUri }}
                  className="w-full h-36"
                  resizeMode="cover"
                />
                {serviceAreaLabel ? (
                  <View className="absolute top-2 left-2 bg-night/80 rounded-sm px-2 py-1">
                    <Text className="text-micro text-white font-medium">
                      {serviceAreaLabel}
                    </Text>
                  </View>
                ) : null}
                <View
                  className="absolute w-3 h-3 rounded-full bg-ai border-2 border-white"
                  style={{ top: "55%", left: "35%" }}
                />
                <View
                  className="absolute w-16 h-16 rounded-full border-2 border-verification"
                  style={{ top: "30%", left: "55%", opacity: 0.7 }}
                />
              </View>
            </View>
          ) : null}

          {/* Within-radius confirmation */}
          {withinServiceRadius && (
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
                disabled={accepting}
                className="flex-1 h-10 rounded-md bg-verification flex-row items-center justify-center gap-1.5 active:opacity-80 disabled:opacity-60"
                accessibilityRole="button"
                accessibilityLabel="Accept request"
              >
                <Check size={14} color="#FFFFFF" />
                <Text className="text-button font-medium text-white">
                  {accepting ? "Accepting…" : "Accept"}
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
      <Text className="text-micro text-verification font-medium">{label}</Text>
    </View>
  );
}

function PendingBadge() {
  return (
    <View className="px-2 py-0.5 rounded-sm bg-warning-bg">
      <Text className="text-micro font-semibold text-warning">Pending</Text>
    </View>
  );
}

type StatusBadgeProps = { action: EnrollmentRequestAction };

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
 * tinted tile. The truthy guard is required, not stylistic:
 * React Native's `<Image source={{ uri: "" }}>` throws on Android
 * because the native image factory tries to introspect the URI
 * string with `.indexOf(...)` and bails when the value is not a
 * non-empty string.
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
