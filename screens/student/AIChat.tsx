import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BottomNav } from "@/components/shared/BottomNav";

/**
 * EdumentX — AI Assistant (student)
 *
 * Stage 3 (June 27, 2026):
 *   - Clean chat UI: message bubbles, input dock, send button.
 *   - Header is the same dark slate hero used by StudentHome / MapSearch
 *     for cross-screen cohesion, with an indigo accent strip that
 *     telegraphs "AI surface" without falling out of the design system.
 *   - User (right) bubble: bg-ai-light with text-text-primary.
 *   - AI (left) bubble: bg-surface with a small bot avatar.
 *   - No backend / no RAG. Replies are naive keyword matches against a
 *     small canned set; "thinking…" indicator stands in for the future
 *     Groq latency. All of this is clearly labeled with a
 *     "Backend integration coming soon" banner pinned above the
 *     message list.
 *   - Removed: lucide-react-native, TUTORS mock import, the
 *     non-existent `@/components/shared/StatusBar`.
 */

type Role = "user" | "ai";

type Message = {
  id: string;
  role: Role;
  text: string;
};

const QUICK_CHIPS = [
  "Maths tutor under Rs 5,000",
  "Physics for +2 Science",
  "Near my saved location",
  "Verified tutors only",
];

/**
 * Naive keyword router. Returns one of the canned replies, or the
 * `default` if nothing matches. Replaced by the real Groq RAG bot in
 * Phase 7.1.
 */
function cannedReply(text: string): string {
  const t = text.toLowerCase();
  if (t.includes("math")) {
    return "Great — Maths is one of our most-requested subjects. Once the tutor list is wired up (Phase 5), I'll show you the top-rated Maths tutors near you, with rates and availability.";
  }
  if (t.includes("physic")) {
    return "+2 Physics is a high-demand subject. I'll match you with tutors who've taught the NEB syllabus and have at least a Blue Tick Student verification.";
  }
  if (t.includes("budget") || t.includes("rs") || t.includes("cheap") || /\d{3,}/.test(t)) {
    return "Got it — I'll filter by your monthly budget once the search backend lands. For now, monthly rates on EdumentX typically range from Rs 3,000 to Rs 15,000.";
  }
  if (t.includes("near") || t.includes("location") || t.includes("lalitpur") || t.includes("kathmandu") || t.includes("patan")) {
    return "I'll use the location you saved on your profile to surface tutors within your selected radius. Make sure your neighborhood + city are set in your profile for the best matches.";
  }
  if (t.includes("verified") || t.includes("blue tick")) {
    return "Verified tutors have a Blue Tick on their profile — either Student (ID + email) or Pro (background + demo lesson). The 'Verified only' filter in the Map screen will hide the rest.";
  }
  if (t.includes("hello") || t.includes("hi") || t.includes("hey")) {
    return "Hey! 👋 Tell me what subject, level, and budget you're working with, and I'll line up a shortlist.";
  }
  return "Got it — once the tutor search backend is connected (Phase 5), I'll turn this into a real shortlist. For now I'm a UI preview only.";
}

export function AIChat() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "0",
      role: "ai",
      text:
        "👋 Hi! I'm EdumentX AI. I can help you find the right tutor " +
        "based on subject, location, budget, and verification status. " +
        "Try one of the quick prompts below, or type your own.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const scrollRef = useRef<ScrollView | null>(null);

  // Auto-scroll on new content. We listen to keyboard too so the
  // latest message stays visible above the input.
  useEffect(() => {
    const sub = Keyboard.addListener("keyboardDidShow", () => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
    return () => sub.remove();
  }, []);

  function scrollToBottom() {
    // Defer to the next frame so the new message has rendered.
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 60);
  }

  function send(text: string) {
    const clean = text.trim();
    if (!clean || isThinking) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: "user",
      text: clean,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsThinking(true);
    scrollToBottom();

    // Simulate AI latency. The real RAG pipeline (Phase 7.1) will
    // replace this with a streamed response from Groq.
    setTimeout(() => {
      const aiMsg: Message = {
        id: `a-${Date.now()}`,
        role: "ai",
        text: cannedReply(clean),
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsThinking(false);
      scrollToBottom();
    }, 1100);
  }

  return (
    <SafeAreaView className="flex-1 bg-night" edges={["top"]}>
      <StatusBar style="light" />

      {/* Hero header — slate, with an AI accent strip so the user
          knows this is the assistant surface without needing a
          jarring purple header. */}
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
          <View className="w-10 h-10 rounded-pill bg-ai items-center justify-center">
            <Ionicons name="sparkles" size={20} color="#FFFFFF" />
          </View>
          <View className="flex-1">
            <View style={{ borderBottomWidth: 2, borderBottomColor: '#E5A03B', paddingBottom: 2, alignSelf: 'flex-start' }}>
              <Text className="text-section-title font-medium text-white">
                AI Assistant
              </Text>
            </View>
            <View className="flex-row items-center gap-1.5 mt-0.5">
              <View className="w-1.5 h-1.5 rounded-pill bg-success" />
              <Text className="text-caption text-white/70">
                Online · preview mode
              </Text>
            </View>
          </View>
        </View>

        {/* Backend-coming-soon banner */}
        {/* <View className="mt-3 flex-row items-start gap-2 bg-ai-light border border-ai-border rounded-card p-3">
          <Ionicons name="information-circle" size={16} color="#4A7FA5" />
          <Text className="flex-1 text-caption text-ai-dark">
            AI Assistant — Backend integration coming soon. Replies are
            placeholder UI for now.
          </Text>
        </View> */}
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        className="flex-1 bg-background"
        contentContainerClassName="px-4 pt-4 pb-4"
        showsVerticalScrollIndicator={false}
        onContentSizeChange={scrollToBottom}
      >
        {messages.map((m) => (
          <Bubble key={m.id} message={m} />
        ))}
        {isThinking && <ThinkingBubble />}
      </ScrollView>

      {/* Input dock */}
      <View className="bg-surface border-t border-border px-4 pt-2 pb-3">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-2 pr-2"
        >
          {QUICK_CHIPS.map((chip) => (
            <Pressable
              key={chip}
              onPress={() => send(chip)}
              disabled={isThinking}
              className="bg-ai-light border border-ai-border rounded-pill px-3 py-1.5 active:opacity-70"
            >
              <Text className="text-caption text-ai-dark font-medium">
                {chip}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View className="flex-row items-center gap-2 mt-2">
          <View className="flex-1 bg-sand rounded-pill h-11 flex-row items-center px-4">
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Ask about tutors, subjects, rates…"
              placeholderTextColor="#6B7268"
              onSubmitEditing={() => send(input)}
              editable={!isThinking}
              returnKeyType="send"
              className="flex-1 text-body-lg text-text-primary"
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send message"
            onPress={() => send(input)}
            disabled={!input.trim() || isThinking}
            className={
              input.trim() && !isThinking
                ? "w-11 h-11 rounded-pill bg-amber items-center justify-center active:opacity-80"
                : "w-11 h-11 rounded-pill bg-border items-center justify-center"
            }
          >
            <Ionicons
              name="send"
              size={18}
              color={input.trim() ? "#FFFFFF" : "#6B7268"}
            />
          </Pressable>
        </View>
      </View>

      <BottomNav role="student" current="/AI-chat" />
    </SafeAreaView>
  );
}

function Bubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
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
          <Ionicons name="sparkles" size={14} color="#FFFFFF" />
        </View>
      )}
      <View
        className={
          isUser
            ? "max-w-[78%] bg-primary-light rounded-card rounded-tr-sm p-3"
            : "max-w-[78%] bg-surface border border-border rounded-card rounded-tl-sm p-3"
        }
      >
        <Text className="text-body-lg text-text-primary leading-[22px]">
          {message.text}
        </Text>
      </View>
    </View>
  );
}

function ThinkingBubble() {
  return (
    <View className="mb-3 flex-row justify-start gap-2">
      <View className="w-7 h-7 rounded-pill bg-ai items-center justify-center mt-1">
        <Ionicons name="sparkles" size={14} color="#FFFFFF" />
      </View>
      <View className="bg-surface border border-border rounded-card rounded-tl-sm px-3 py-3 flex-row items-center gap-2">
        <ActivityIndicator size="small" color="#2F5D50" />
        <Text className="text-caption text-text-muted">Thinking…</Text>
      </View>
    </View>
  );
}