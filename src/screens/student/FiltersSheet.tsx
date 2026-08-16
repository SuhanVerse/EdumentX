import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { SecondaryButton } from "@/components/ui/SecondaryButton";
import { AnimatedPressable, SwitchThumb, usePressScale } from "@/components/motion";
import { motion } from "@/lib/motion";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import RAnimated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { colors } from "@/constants/colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * EdumentX — FiltersSheet (bottom-sheet overlay)
 *
 * Stage 2 (June 27, 2026):
 *   - This component is **not** a standalone screen. It's rendered
 *     inline by MapSearch as a Modal, with MapSearch visible at
 *     ~0.75 opacity underneath.
 *   - Slides up from the bottom with a spring-like easing. Drag-down
 *     to dismiss is wired via a PanResponder on the handle bar.
 *
 * Phase 7 (Aug 2026):
 *   - The sheet used to be UI-only ("Show N results" just closed).
 *     It is now a controlled component: MapSearch owns the `MapFilters`
 *     state and passes an initial `value`; the sheet edits a local
 *     copy and commits it via `onApply` on "Show results" (and Reset).
 *     MapSearch applies the filters to the actual cluster/list query.
 *
 * Public API:
 *   <FiltersSheet
 *     visible={...}
 *     value={filters}
 *     onApply={(next) => setFilters(next)}
 *     onClose={...}
 *   />
 */

export type MapFilters = {
  /** Selected subjects — empty array = no subject constraint. */
  subjects: string[];
  /** Education level ("" = any). */
  level: string;
  /** Class mode ("" = any). */
  mode: string;
  /** Max distance in km — 20 = whole Valley, effectively "any". */
  distance: number;
  /** Max monthly budget in NPR — 30000 = effectively "any". */
  budget: number;
  /** Verified tutors only. */
  verifiedOnly: boolean;
};

/** Non-restrictive defaults — the map shows everything until the
 *  student narrows it down. */
export const DEFAULT_MAP_FILTERS: MapFilters = {
  subjects: [],
  level: "",
  mode: "",
  distance: 20,
  budget: 30000,
  verifiedOnly: false,
};

/** Subject pills offered in the sheet. */
export const FILTER_SUBJECTS = [
  "Math",
  "Physics",
  "Chemistry",
  "Biology",
  "English",
  "Nepali",
  "Computer",
  "Accounts",
];

const LEVELS = ["Class 6-8", "SEE", "+2 Science", "+2 Mgmt", "Bachelor's"];
const MODES = ["Home tuition", "Online", "At tutor's place"];

/** Approximate "result count" so the sheet feels alive in the UI. */
function estimateResults(distance: number, budget: number, verifiedOnly: boolean): number {
  const base = 24;
  const distancePenalty = Math.max(0, distance - 3) * 2;
  const budgetPenalty = Math.max(0, (budget - 5000) / 2500) * 3;
  const verifiedPenalty = verifiedOnly ? 6 : 0;
  return Math.max(0, Math.round(base - distancePenalty - budgetPenalty - verifiedPenalty));
}

/**
 * Self-contained range slider. We don't import
 * `@react-native-community/slider` because that package isn't in
 * `package.json` and adding it would break the zero-budget rule
 * (its native module would require a rebuild of the EAS dev
 * client — out of scope for this stage). The implementation is a
 * pressable track + computed fill width, which is enough for a UI
 * preview.
 */
function RangeSlider({
  min,
  max,
  step = 1,
  value,
  onChange,
  trackClassName = "bg-amber",
  fillClassName = "bg-amber",
}: {
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (v: number) => void;
  trackClassName?: string;
  fillClassName?: string;
}) {
  const widthRef = useRef(0);
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <View
      className="h-9 justify-center"
      onLayout={(e) => {
        widthRef.current = e.nativeEvent.layout.width;
      }}
    >
      {/* Track */}
      <View className="absolute left-0 right-0 h-1 rounded-pill bg-sand" />
      {/* Fill */}
      <View
        className={`absolute left-0 h-1 rounded-pill ${fillClassName}`}
        style={{ width: `${pct}%` }}
      />
      {/* Tappable track */}
      <Pressable
        accessibilityRole="adjustable"
        accessibilityLabel="Adjust value"
        accessibilityValue={{ min, max, now: value }}
        onPress={(e) => {
          const x = e.nativeEvent.locationX;
          const w = widthRef.current || 1;
          const ratio = Math.max(0, Math.min(1, x / w));
          const raw = min + ratio * (max - min);
          const stepped = Math.round(raw / step) * step;
          onChange(Math.max(min, Math.min(max, stepped)));
        }}
        className="absolute inset-0"
      />
      {/* Thumb */}
      <View
        className={`absolute w-5 h-5 rounded-pill bg-surface border-2 border-amber shadow-sm`}
        style={{
          left: `${pct}%`,
          marginLeft: -10,
        }}
      />
    </View>
  );
}

function Section({
  title,
  trailing,
  children,
}: {
  title: string;
  /** Optional live value chip rendered on the right of the header
   *  row (sliders pass the current value so it updates on drag). */
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View className="py-4 border-b border-border">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-overline text-text-muted uppercase">{title}</Text>
        {trailing}
      </View>
      {children}
    </View>
  );
}

function Pill({
  label,
  active,
  onPress,
  variant = "neutral",
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  variant?: "neutral" | "subject" | "mode";
}) {
  // Two visual languages: subjects and class-mode chips get the amber
  // active fill (mode chips: distinct, tactile `bg-accent`), level
  // chips keep the primary green. Subjects get a teal outline when
  // inactive (the legacy behavior, kept for recognition), level/mode
  // get a simpler outlined-pill treatment.
  const isAccent = variant === "subject" || variant === "mode";
  const classes =
    active && isAccent
      ? "bg-accent border-accent"
      : active
        ? "bg-primary border-primary"
        : variant === "subject"
          ? "bg-verification-light border-verification-light"
          : "bg-surface border-border";
  const textClasses =
    active && isAccent
      ? "text-text-inverse"
      : active
        ? "text-white"
        : variant === "subject"
          ? "text-verification-dark"
          : "text-text-secondary";
  // The Pill re-renders on every selection flip, so the hook runs
  // stably per Pill instance (each <Pill> in the row gets its own
  // press-shared value). Spring scale 0.94 = chip feel.
  const { onPressIn, onPressOut, animatedStyle } = usePressScale({
    targetScale: motion.scale.chipPressed,
  });
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={animatedStyle}
      className={`rounded-pill px-4 py-2 border ${classes}`}
    >
      <Text className={`text-button-sm ${textClasses}`}>{label}</Text>
    </AnimatedPressable>
  );
}

export function FiltersSheet({
  visible,
  value,
  onApply,
  onClose,
  resultCount: resultCountProp,
}: {
  visible: boolean;
  /** Current filter state owned by MapSearch (the source of truth). */
  value: MapFilters;
  /** Commit the edited filters — fired by "Show results" and Reset. */
  onApply: (filters: MapFilters) => void;
  onClose: () => void;
  /** Live match count from the actual (filtered) tutor query. When
   *  provided it replaces the estimate in the footer label. */
  resultCount?: number;
}) {
  const insets = useSafeAreaInsets();

  // Local editable copy — synced from the parent's `value` each time
  // the sheet opens, so sliders never fight the live map state.
  const [local, setLocal] = useState<MapFilters>(value);
  useEffect(() => {
    if (visible) setLocal(value);
  }, [visible, value]);

  const set = <K extends keyof MapFilters>(key: K, v: MapFilters[K]) =>
    setLocal((f) => ({ ...f, [key]: v }));
  const commit = (filters: MapFilters) => {
    onApply(filters);
    onClose();
  };

  // Slide-up + backdrop fade. We drive both off the same Animated.Value
  // so they stay in sync. Spring-style easing gives a sheet-like feel
  // without depending on react-native-reanimated (which is already in
  // the project but we want this to be safe to disable later).
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: 240,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [visible, progress]);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [600, 0],
  });
  const backdropOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.55],
  });

  // Drag-down to dismiss. Threshold = 80px or fast downward velocity.
  const dragY = useRef(new Animated.Value(0)).current;
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) dragY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 80 || g.vy > 0.6) {
          onClose();
        }
        Animated.spring(dragY, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 4,
        }).start();
      },
    }),
  ).current;

  const toggleSubject = (s: string) =>
    set("subjects", local.subjects.includes(s)
      ? local.subjects.filter((x) => x !== s)
      : [...local.subjects, s]);

  const reset = () => {
    const cleared: MapFilters = { ...value, subjects: [], level: "", mode: "", distance: 5, budget: 15000, verifiedOnly: false };
    setLocal(cleared);
    commit(cleared);
  };

  const resultCount = resultCountProp ?? estimateResults(local.distance, local.budget, local.verifiedOnly);
  // Close-button spring scale. iconPressed = 0.85 for icon-only
  // tap targets (back chevrons, dismiss Xs, eye toggles).
  const { onPressIn: onCloseIn, onPressOut: onCloseOut, animatedStyle: closeStyle } =
    usePressScale({ targetScale: motion.scale.iconPressed });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View className="flex-1">
        {/* Backdrop — taps dismiss. Layered behind the sheet. */}
        <Animated.View
          pointerEvents={visible ? "auto" : "none"}
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: "#000000",
            opacity: backdropOpacity,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close filters"
            onPress={onClose}
            className="flex-1"
          />
        </Animated.View>

        {/* Sheet */}
        <Animated.View
          {...panResponder.panHandlers}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            maxHeight: "90%",
            backgroundColor: colors.background.surface,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingBottom: insets.bottom,
            transform: [{ translateY: Animated.add(translateY, dragY) }],
            shadowColor: "#000",
            shadowOpacity: 0.10,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: -4 },
            elevation: 24,
          }}
        >
          {/* Handle — clear drag affordance: 48px wide, hairline
              border tone so it reads as a grab rail. */}
          <View className="items-center pt-2.5 pb-1">
            <View className="w-12 h-1 rounded-pill bg-border" />
          </View>

          {/* Header */}
          <View className="flex-row items-center py-3 px-5">
            <Text className="flex-1 text-section-title font-medium text-text-primary">
              Filters
            </Text>
            <AnimatedPressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onClose}
              onPressIn={onCloseIn}
              onPressOut={onCloseOut}
              style={closeStyle}
              hitSlop={8}
              className="w-9 h-9 items-center justify-center rounded-pill"
            >
              <Ionicons name="close" size={20} color={colors.text.muted} />
            </AnimatedPressable>
          </View>

          <ScrollView
            className="px-5 pt-1 pb-4"
            style={{ maxHeight: 480 }}
            showsVerticalScrollIndicator={false}
          >
            <Section title="Subject">
              <View className="flex-row flex-wrap gap-2">
                {FILTER_SUBJECTS.map((s) => (
                  <Pill
                    key={s}
                    label={s}
                    active={local.subjects.includes(s)}
                    onPress={() => toggleSubject(s)}
                    variant="subject"
                  />
                ))}
              </View>
            </Section>

            <Section title="Level">
              <View className="flex-row flex-wrap gap-2">
                {LEVELS.map((l) => (
                  <Pill
                    key={l}
                    label={l}
                    active={local.level === l}
                    onPress={() => set("level", local.level === l ? "" : l)}
                  />
                ))}
              </View>
            </Section>

            <Section title="Class mode">
              <View className="flex-row flex-wrap gap-2">
                {MODES.map((m) => (
                  <Pill
                    key={m}
                    label={m}
                    active={local.mode === m}
                    onPress={() => set("mode", local.mode === m ? "" : m)}
                    variant="mode"
                  />
                ))}
              </View>
            </Section>

            <Section
              title="Distance"
              trailing={
                <View className="px-2.5 py-1 rounded-pill bg-accent-soft">
                  <Text className="text-micro font-semibold text-accent">
                    {local.distance} km
                  </Text>
                </View>
              }
            >
              <RangeSlider
                min={1}
                max={20}
                value={local.distance}
                onChange={(v) => set("distance", v)}
              />
            </Section>

            <Section
              title="Budget"
              trailing={
                <View className="px-2.5 py-1 rounded-pill bg-accent-soft">
                  <Text className="text-micro font-semibold text-accent">
                    Rs {local.budget.toLocaleString()}/mo
                  </Text>
                </View>
              }
            >
              <RangeSlider
                min={3000}
                max={30000}
                step={500}
                value={local.budget}
                onChange={(v) => set("budget", v)}
              />
            </Section>

            <Section title="Verification">
              <Pressable
                accessibilityRole="switch"
                accessibilityLabel="Verified tutors only"
                accessibilityState={{ checked: local.verifiedOnly }}
                onPress={() => set("verifiedOnly", !local.verifiedOnly)}
                className="w-full flex-row items-center justify-between bg-sand border border-border rounded-card p-3.5 active:opacity-80"
              >
                <View className="flex-1 pr-4">
                  <Text className="text-card-title text-text-primary">
                    Verified tutors only
                  </Text>
                  <Text className="text-caption text-text-muted mt-0.5">
                    Show only Blue Tick Pro &amp; Student Tutors
                  </Text>
                </View>
                <FiltersVerifiedSwitch checked={local.verifiedOnly} />
              </Pressable>
            </Section>
          </ScrollView>

          {/* Footer */}
          <View className="flex-row gap-3 px-5 pt-3 pb-6 border-t border-border">
            <View className="flex-1">
              <SecondaryButton
                label="Reset"
                onPress={reset}
                size="sm"
              />
            </View>
            <View className="flex-[2]">
              <PrimaryButton
                label={`Show ${resultCount} result${resultCount === 1 ? "" : "s"}`}
                onPress={() => commit(local)}
                variant="accent"
                size="md"
                className="w-full"
              />
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

/**
 * "Verified tutors only" switch in the filters sheet. Replaces the
 * previous class-swap (`bg-verification` vs `bg-border` + `marginLeft`
 * 22 vs 2) with a spring-sliding thumb and a smoothly interpolated
 * track color (border grey → verification green).
 *
 * Track 44×24, thumb 20×20, travel 24px — the inner 2px padding on
 * each side of the track stays implicit (the thumb starts at left-0
 * with a 2px track margin from the original `marginLeft: 2`).
 */
function FiltersVerifiedSwitch({ checked }: { checked: boolean }) {
  const TRACK_OFF = colors.border.strong;
  const TRACK_ON = colors.brand.verification;
  const progress = useSharedValue(checked ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(checked ? 1 : 0, {
      duration: motion.duration.medium,
    });
  }, [checked, progress]);

  const trackStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      backgroundColor: interpolateColor(
        progress.value,
        [0, 1],
        [TRACK_OFF, TRACK_ON],
      ),
    };
  });

  return (
    <View className="w-11 h-6 rounded-pill relative justify-center">
      <RAnimated.View
        style={[trackStyle, { position: "absolute", inset: 0, borderRadius: 999 }]}
      />
      <SwitchThumb
        checked={checked}
        trackWidth={44}
        thumbSize={20}
        thumbClassName="w-5 h-5 rounded-pill bg-surface"
        style={{
          marginLeft: 2,
          shadowColor: "#000",
          shadowOpacity: 0.15,
          shadowRadius: 2,
          shadowOffset: { width: 0, height: 1 },
          elevation: 2,
        }}
      />
    </View>
  );
}