import { BottomNav } from "@/components/shared/BottomNav";
import { colors } from "@/constants/colors";
import {
  ScreenLayout,
  ScreenHeader,
  ScreenScroll,
  ScreenSheet,
} from "@/components/shared/ScreenLayout";
import { MarkdownText } from "@/components/ui/MarkdownText";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { doc, getFirestore, onSnapshot } from "@react-native-firebase/firestore";
import { getAuth } from "@react-native-firebase/auth";
import { getApp } from "@react-native-firebase/app";

import { AnimatedPressable, usePressScale } from "@/components/motion";
import { Avatar } from "@/components/ui/Avatar";
import { useAiChat } from "@/hooks/useAiChat";
import { QUICK_CHIPS, type ConstraintPreset } from "@/lib/ai/constraintPresets";
import { parseMessageToConstraints } from "@/lib/ai/clientConstraintParser";
import { motion } from "@/lib/motion";
import type { Message } from "@/store/aiChatStore";

const WELCOME_MESSAGE =
  "Hi! I'm EdumentX AI. I can help you find the right tutor " +
  "based on subject, location, budget, and verification status. " +
  "Try one of the quick prompts below, or type your own.";

export function AIChat() {
  const router = useRouter();
  const {
    messages,
    sendMessage,
    isLoading,
    constraints,
    setConstraints,
    removeConstraint,
    hasHydrated,
  } = useAiChat();
  const [input, setInput] = useState("");
  const scrollRef = useRef<ScrollView | null>(null);
  const [savedLocation, setSavedLocation] = useState<{
    city: string;
    neighborhood: string;
  }>({ city: "", neighborhood: "" });

  // Subscribe to the student's saved location so the
  // "Near my saved location" chip can resolve it at tap time.
  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return;
    const db = getFirestore(getApp());
    const ref = doc(db, "users", user.uid, "studentProfile", "default");
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const data = snap.data() as
          | { location?: { city?: string; neighborhood?: string } }
          | undefined;
        setSavedLocation({
          city: data?.location?.city ?? "",
          neighborhood: data?.location?.neighborhood ?? "",
        });
      },
      // Silent failure — chip just won't apply a saved location.
      () => setSavedLocation({ city: "", neighborhood: "" }),
    );
    return () => unsub();
  }, []);

  const displayMessages: Message[] =
    !hasHydrated
      ? [] // still restoring the saved conversation from storage
      : messages.length === 0
        ? [
            {
              id: "welcome",
              role: "assistant",
              text: WELCOME_MESSAGE,
              createdAt: new Date().toISOString(),
            },
          ]
        : messages;

  useEffect(() => {
    const sub = Keyboard.addListener("keyboardDidShow", () => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
    return () => sub.remove();
  }, []);

  function scrollToBottom() {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 60);
  }

  function handleSend(text: string) {
    const clean = text.trim();
    if (!clean || isLoading) return;
    setInput("");
    sendMessage(clean);
    scrollToBottom();
  }

  /**
   * Apply a chip's preset to the constraints slice and then send the chip
   * label as the message text. The preset is what the bot has already
   * "heard" — sending the label gives the server a chance to extract any
   * additional context, but the bot will not re-ask about subject/budget
   * because those are already in the session.
   */
  function handleChipTap(preset: ConstraintPreset) {
    if (isLoading) return;

    // Resolve any dynamic constraints (e.g. saved-location) before applying.
    const resolved = preset.resolve
      ? preset.resolve(constraints, {
          savedCity: savedLocation.city,
          savedNeighborhood: savedLocation.neighborhood,
        })
      : {};

    // Also parse the label through the keyword parser so chips like
    // "Maths tutor under Rs 5,000" extract any constraint the preset
    // already declared — they're usually redundant, but the parser is the
    // canonical client-side source.
    const parsed = parseMessageToConstraints(preset.label, constraints);

    setConstraints({ ...preset.constraints, ...resolved, ...parsed });
    handleSend(preset.label);
  }

  /**
   * Remove a single constraint when the user taps its pill.
   *
   * The store's `removeConstraint` clears the client mirror AND queues the
   * key to be sent as `removed_constraints` with the next message. Without
   * the queue, only the local mirror would clear — the server session would
   * keep the stale value (e.g. "male") and re-apply it on every search.
   */
  function handlePillRemove(key: keyof typeof constraints) {
    removeConstraint(key);
  }

  /**
   * Build the visible pill list from the constraint slice. Memoized so the
   * chip-strip re-renders only when constraints change.
   */
  const activePills = useMemo(() => buildPills(constraints), [constraints]);

  return (
    <ScreenLayout variant="background">
      <ScreenHeader variant="light">
        <View className="flex-row items-center gap-3">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => router.replace("/student-home")}
            className="w-10 h-10 rounded-pill bg-background border border-border items-center justify-center active:opacity-70"
          >
            <Ionicons name="chevron-back" size={20} color={colors.brand.primary} />
          </Pressable>
          <View className="w-10 h-10 rounded-pill bg-ai items-center justify-center">
            <Ionicons name="sparkles" size={20} color={colors.text.inverse} />
          </View>
          <View className="flex-1">
            <View
              style={{
                borderBottomWidth: 2,
                borderBottomColor: colors.brand.accent,
                paddingBottom: 2,
                alignSelf: "flex-start",
              }}
            >
              <Text className="text-section-title font-medium text-text-primary">
                AI Assistant
              </Text>
            </View>
            <View className="flex-row items-center gap-1.5 mt-0.5">
              <View className="w-1.5 h-1.5 rounded-pill bg-success" />
              <Text className="text-caption text-text-secondary">
                Online - AI powered
              </Text>
            </View>
          </View>
        </View>
      </ScreenHeader>

      {/* Chat + input bar — light sheet overlapping the dark hero
          (premium dark→light seam, shared `ScreenSheet` pattern) */}
      <ScreenSheet>
      <KeyboardAvoidingView
        behavior="padding"
        keyboardVerticalOffset={0}
        className="flex-1"
      >
        <ScreenScroll
          ref={scrollRef}
          className="flex-1 bg-background"
          contentContainerClassName="px-4 pt-6 pb-4"
          onContentSizeChange={scrollToBottom}
        >
          {activePills.length > 0 && (
            <ActivePillStrip
              pills={activePills}
              onRemove={handlePillRemove}
            />
          )}
          {displayMessages.map((m) => (
            <Bubble key={m.id} message={m} router={router} />
          ))}
          {isLoading && <ThinkingBubble />}
        </ScreenScroll>

        <View className="bg-surface border-t border-border px-4 pt-2 pb-3">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-2 pr-2"
        >
          {QUICK_CHIPS.map((chip) => (
            <QuickPromptChip
              key={chip.id}
              preset={chip}
              onPress={() => handleChipTap(chip)}
              disabled={isLoading}
            />
          ))}
        </ScrollView>

        <View className="flex-row items-center gap-2 mt-2">
          <View className="flex-1 bg-sand rounded-pill h-11 flex-row items-center px-4">
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Ask about tutors, subjects, rates"
              placeholderTextColor={colors.text.muted}
              onSubmitEditing={() => handleSend(input)}
              editable={!isLoading}
              returnKeyType="send"
              className="flex-1 text-body-lg text-text-primary"
            />
          </View>
          <ChatSendButton
            enabled={!!input.trim() && !isLoading}
            onPress={() => handleSend(input)}
          />
        </View>
      </View>

      </KeyboardAvoidingView>
      </ScreenSheet>

      <BottomNav role="student" current="/AI-chat" />
    </ScreenLayout>
  );
}

function ChatSendButton({
  enabled,
  onPress,
}: {
  enabled: boolean;
  onPress: () => void;
}) {
  const { onPressIn, onPressOut, animatedStyle } = usePressScale();

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel="Send message"
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={!enabled}
      style={animatedStyle}
      className={
        enabled
          ? "w-11 h-11 rounded-pill bg-accent items-center justify-center"
          : "w-11 h-11 rounded-pill bg-border items-center justify-center"
      }
    >
      <Ionicons
        name="send"
        size={18}
        color={enabled ? "#FFFFFF" : "#6B7280"}
      />
    </AnimatedPressable>
  );
}

function QuickPromptChip({
  preset,
  onPress,
  disabled,
}: {
  preset: ConstraintPreset;
  onPress: () => void;
  disabled: boolean;
}) {
  const { onPressIn, onPressOut, animatedStyle } = usePressScale({
    targetScale: motion.scale.chipPressed,
  });
  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={disabled}
      style={animatedStyle}
      className="bg-ai-light border border-ai-border rounded-pill px-3 py-1.5"
    >
      <Text className="text-caption text-ai-dark font-medium">
        {preset.label}
      </Text>
    </AnimatedPressable>
  );
}

// ─── Active-constraint pill strip ────────────────────────────────────────────
//
// Each pill represents one constraint the bot already knows about. Tapping
// the pill removes the constraint (the user can re-add it by sending the
// chip or typing again). The pill list is the visual proof that the bot
// is "remembering" — this is what fixes the user's complaint that "the
// bot keeps asking things I already told it".

interface ActivePill {
  key: keyof ReturnType<typeof useAiChat>["constraints"];
  label: string;
}

function buildPills(
  c: ReturnType<typeof useAiChat>["constraints"],
): ActivePill[] {
  const pills: ActivePill[] = [];
  if (c.subject) pills.push({ key: "subject", label: c.subject });
  if (c.grade_level) pills.push({ key: "grade_level", label: `Grade ${c.grade_level}` });
  if (c.location_text) pills.push({ key: "location_text", label: c.location_text });
  if (c.tutoring_mode) {
    pills.push({
      key: "tutoring_mode",
      label: c.tutoring_mode === "home_tuition" ? "Home tuition" : "Online",
    });
  }
  if (c.budget_max) pills.push({ key: "budget_max", label: `≤ Rs ${c.budget_max.toLocaleString()}` });
  if (c.budget_min) pills.push({ key: "budget_min", label: `≥ Rs ${c.budget_min.toLocaleString()}` });
  if (c.gender_preference) {
    pills.push({
      key: "gender_preference",
      label: `${c.gender_preference.charAt(0).toUpperCase()}${c.gender_preference.slice(1)}`,
    });
  }
  if (c.language) pills.push({ key: "language", label: c.language });
  if (c.verified_only) pills.push({ key: "verified_only", label: "Verified only" });
  if (c.min_rating) pills.push({ key: "min_rating", label: `≥ ${c.min_rating}★` });
  if (c.min_experience) pills.push({ key: "min_experience", label: `≥ ${c.min_experience} yr` });
  if (c.radius_km) pills.push({ key: "radius_km", label: `≤ ${c.radius_km} km` });
  return pills;
}

function ActivePillStrip({
  pills,
  onRemove,
}: {
  pills: ActivePill[];
  onRemove: (key: ActivePill["key"]) => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-1.5 mb-3">
      {pills.map((pill) => (
        <Pressable
          key={pill.key as string}
          accessibilityRole="button"
          accessibilityLabel={`Remove filter: ${pill.label}`}
          onPress={() => onRemove(pill.key)}
          className="flex-row items-center gap-1 bg-primary-light border border-primary-border rounded-pill pl-3 pr-2 py-1 active:opacity-70"
        >
          <Text className="text-caption text-primary-dark font-medium">
            {pill.label}
          </Text>
          <Ionicons name="close" size={12} color={colors.brand.primary} />
        </Pressable>
      ))}
    </View>
  );
}

function Bubble({ message, router: navRouter }: { message: Message; router: ReturnType<typeof useRouter> }) {
  const isUser = message.role === "user";
  const isError = message.isError;

  return (
    <View
      className={
        isUser
          ? "mb-3 flex-row justify-end"
          : "mb-3 flex-row justify-start gap-2"
      }
    >
      {!isUser && (
        <View className="w-7 h-7 rounded-pill bg-ai items-center justify-center mt-1">
          <Ionicons name="sparkles" size={14} color={colors.text.inverse} />
        </View>
      )}
      <View
        className={
          isUser
            ? "max-w-[78%] bg-primary-light rounded-card rounded-tr-sm p-3"
            : isError
              ? "max-w-[78%] bg-danger-bg border border-danger rounded-card rounded-tl-sm p-3"
              : "max-w-[78%] bg-surface border border-border rounded-card rounded-tl-sm p-3"
        }
      >
        {/* Fix F: render assistant text through the inline markdown
            renderer so `**bold**`, bullet lists, and headings display
            correctly. Error and user messages stay as plain <Text> —
            those never contain markdown and benefit from the lighter
            renderer. */}
        {isError ? (
          <Text className="text-body-lg text-danger leading-[22px]">
            {message.text}
          </Text>
        ) : isUser ? (
          <Text className="text-body-lg text-text-primary leading-[22px]">
            {message.text}
          </Text>
        ) : (
          <MarkdownText source={message.text} />
        )}
        {!isUser && message.tutorCards && message.tutorCards.length > 0 && (
          <View className="mt-3 pt-3 border-t border-border gap-2">
            <Text className="text-caption font-medium text-text-secondary mb-1">
              Recommended tutors:
            </Text>
            {message.tutorCards.map((tutor) => (
              <Pressable
                key={tutor.id}
                onPress={() => navRouter.push(`/tutor/${tutor.id}` as any)}
                className="bg-ai-light rounded-card p-3 flex-row items-center gap-3 active:opacity-80"
              >
                <Avatar
                  name={tutor.fullName}
                  imageUri={tutor.photoUrl}
                  size={36}
                />
                <View className="flex-1">
                  <Text className="text-body font-semibold text-text-primary">
                    {tutor.fullName}
                  </Text>
                  <Text className="text-caption text-text-secondary">
                    {tutor.subjects?.join(", ")} - Rs {tutor.monthlyRateNpr?.toLocaleString()}
                  </Text>
                  {tutor.rating != null && (
                    <View className="flex-row items-center gap-1 mt-0.5">
                      <Ionicons name="star" size={12} color={colors.brand.accent} />
                      <Text className="text-caption text-text-secondary">
                        {tutor.rating.toFixed(1)} - {tutor.reviewCount ?? 0} reviews
                      </Text>
                    </View>
                  )}
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

function ThinkingBubble() {
  return (
    <View className="mb-3 flex-row justify-start gap-2">
      <View className="w-7 h-7 rounded-pill bg-ai items-center justify-center mt-1">
        <Ionicons name="sparkles" size={14} color={colors.text.inverse} />
      </View>
      <View className="bg-surface border border-border rounded-card rounded-tl-sm px-3 py-3 flex-row items-center gap-2">
        <ActivityIndicator size="small" color={colors.brand.primary} />
        <Text className="text-caption text-text-muted">Thinking</Text>
      </View>
    </View>
  );
}
