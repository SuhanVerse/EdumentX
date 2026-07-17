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

/**
 * EdumentX — FiltersSheet (bottom-sheet overlay)
 *
 * Stage 2 (June 27, 2026):
 *   - This component is **not** a standalone screen. It's rendered
 *     inline by MapSearch as a Modal, with MapSearch visible at
 *     ~0.75 opacity underneath.
 *   - Slides up from the bottom with a spring-like easing. Drag-down
 *     to dismiss is wired via a PanResponder on the handle bar.
 *   - Filter options mirror what real tutor-search filters need
 *     (subject, level, mode, distance, budget, verification) but
 *     are UI-only — no backend query yet. "Show N results" just
 *     closes the sheet.
 *   - Visual language matches StudentHome / MapSearch: amber accent,
 *     verification green, surface cards, NativeWind tokens (no raw
 *     hex).
 *
 * Public API:
 *   <FiltersSheet visible={...} onClose={...} />
 *
 * The component owns all of its own state (subjects, level, mode,
 * distance, budget, verifiedOnly). When the user hits "Show results"
 * the sheet just calls `onClose()` — MapSearch is responsible for
 * actually applying the filter when the real `tutors` query lands in
 * Phase 5.
 */

const SUBJECTS = [
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
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View className="py-4 border-b border-border">
      <Text className="text-overline text-text-muted uppercase mb-3">
        {title}
      </Text>
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
  variant?: "neutral" | "subject";
}) {
  // Two visual languages: subjects get a teal outline when inactive
  // (the legacy behavior, kept for recognition), level/mode get a
  // simpler outlined-pill treatment.
  const classes =
    active && variant === "subject"
      ? "bg-accent border-accent"
      : active
        ? "bg-primary border-primary"
        : variant === "subject"
          ? "bg-verification-light border-verification-light"
          : "bg-surface border-border";
  const textClasses =
    active && variant === "subject"
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
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const [subjects, setSubjects] = useState<string[]>(["Math"]);
  const [level, setLevel] = useState("SEE");
  const [mode, setMode] = useState("Home tuition");
  const [distance, setDistance] = useState(5);
  const [budget, setBudget] = useState(15000);
  const [verifiedOnly, setVerifiedOnly] = useState(true);

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
    setSubjects((arr) =>
      arr.includes(s) ? arr.filter((x) => x !== s) : [...arr, s],
    );

  const reset = () => {
    setSubjects([]);
    setLevel("");
    setMode("");
    setDistance(5);
    setBudget(15000);
    setVerifiedOnly(false);
  };

  const resultCount = estimateResults(distance, budget, verifiedOnly);
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
            backgroundColor: "#FFFFFF",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            transform: [{ translateY: Animated.add(translateY, dragY) }],
            shadowColor: "#26302B",
            shadowOpacity: 0.10,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: -4 },
            elevation: 24,
          }}
        >
          {/* Handle */}
          <View className="items-center pt-2.5 pb-1">
            <View className="w-10 h-1 rounded-pill bg-surface-muted" />
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
              className="w-9 h-9 items-center justify-center rounded-pill"
            >
              <Ionicons name="close" size={20} color="#6B7268" />
            </AnimatedPressable>
          </View>

          <ScrollView
            className="px-5 pt-1 pb-4"
            style={{ maxHeight: 480 }}
            showsVerticalScrollIndicator={false}
          >
            <Section title="Subject">
              <View className="flex-row flex-wrap gap-2">
                {SUBJECTS.map((s) => (
                  <Pill
                    key={s}
                    label={s}
                    active={subjects.includes(s)}
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
                    active={level === l}
                    onPress={() => setLevel(l)}
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
                    active={mode === m}
                    onPress={() => setMode(m)}
                  />
                ))}
              </View>
            </Section>

            <Section title={`Distance · within ${distance} km`}>
              <RangeSlider
                min={1}
                max={20}
                value={distance}
                onChange={setDistance}
              />
            </Section>

            <Section
              title={`Budget · up to Rs ${budget.toLocaleString()}/mo`}
            >
              <RangeSlider
                min={3000}
                max={30000}
                step={500}
                value={budget}
                onChange={setBudget}
              />
            </Section>

            <Section title="Verification">
              <Pressable
                accessibilityRole="switch"
                accessibilityLabel="Verified tutors only"
                accessibilityState={{ checked: verifiedOnly }}
                onPress={() => setVerifiedOnly((v) => !v)}
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
                <FiltersVerifiedSwitch checked={verifiedOnly} />
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
                onPress={onClose}
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
  const TRACK_OFF = colors.border.strong ?? "#C8C0AE";
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