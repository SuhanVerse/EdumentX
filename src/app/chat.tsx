/**
 * EdumentX — 1:1 Chat screen
 *
 * Live messaging between a student and a tutor. The conversation is
 * addressed by a deterministic id (`conversationKey` of the two
 * uids), so no lookup query is needed. Peer display info comes from
 * navigation params when the entry point has it (enrollment rows,
 * roster), otherwise from the conversation's `meta` (self-written by
 * each sender) — and finally from the public tutor profile read.
 *
 * Uses an inverted FlatList so the newest message sits at the visual
 * bottom and auto-scrolling on new messages is free.
 */

import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { colors } from "@/constants/colors";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getApp } from "@react-native-firebase/app";
import { doc, getDoc, getFirestore } from "@react-native-firebase/firestore";

import { ScreenLayout } from "@/components/shared/ScreenLayout";
import { Avatar } from "@/components/ui/Avatar";
import { getMessagesRepository } from "@/services/messages/dataSource";
import type { ChatMessage, Conversation } from "@/services/messages/types";
import { useAuthStore } from "@/store/authStore";

const MAX_LEN = 2000;

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    peerId: string;
    peerName?: string;
    peerAvatar?: string;
  }>();
  const peerId = params.peerId ?? "";
  const currentUser = useAuthStore((s) => s.user);

  const repo = getMessagesRepository();
  const conversationId = currentUser
    ? repo.getConversationId(currentUser.uid, peerId)
    : "";

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [draftText, setDraftText] = useState("");
  const [sending, setSending] = useState(false);
  // Debounced typing publisher: a timer resets each keystroke; after
  // 1.2 s idle the flag is cleared. Cleared immediately on send too.
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Peer fallback identity — resolved from the public tutor profile
  // when the caller didn't pass name/avatar and the conversation has
  // no meta for the peer yet.
  const [peerFallback, setPeerFallback] = useState<{
    name: string;
    avatar: string | null;
  } | null>(null);

  useEffect(() => {
    if (!currentUser || !peerId) {
      setLoaded(true);
      return;
    }
    const unsubConv = repo.subscribeConversation(
      conversationId,
      (c) => setConversation(c),
      (err) => console.warn("Chat: subscribeConversation failed", err),
    );
    const unsubMsgs = repo.subscribeMessages(
      conversationId,
      (list) => {
        setMessages(list);
        setLoaded(true);
      },
      (err) => console.warn("Chat: subscribeMessages failed", err),
    );
    return () => {
      unsubConv();
      unsubMsgs();
    };
  }, [currentUser, peerId, conversationId, repo]);

  // Read receipts: when the chat opens (or a new peer message arrives
  // while it's open), flip the peer's unread messages to "read" and
  // zero our unread badge. Runs once per batch; the repo zeroes the
  // conversation's `unreadCount` for us.
  const lastMarkedRef = useRef<string>("");
  useEffect(() => {
    if (!currentUser || !peerId) return;
    const unreadIncoming = messages.filter(
      (m) => m.senderId !== currentUser.uid && m.status !== "read",
    );
    if (unreadIncoming.length === 0) return;
    const key = unreadIncoming.map((m) => m.messageId).join(",");
    if (key === lastMarkedRef.current) return;
    lastMarkedRef.current = key;
    repo
      .markMessagesRead({
        conversationId,
        viewerUid: currentUser.uid,
        messageIds: unreadIncoming.map((m) => m.messageId),
      })
      .catch((err) => console.warn("Chat: markMessagesRead failed", err));
  }, [messages, currentUser, peerId, conversationId, repo]);

  // Debounced typing indicator. `typing` on the conversation doc is
  // only meaningful while composing — publish on the first keystroke,
  // auto-clear after 1.2 s of silence, and clear on send / unmount.
  const publishTyping = useCallback(
    (isTyping: boolean) => {
      if (!currentUser) return;
      repo
        .setTyping({
          conversationId,
          uid: currentUser.uid,
          isTyping,
        })
        .catch(() => {
          // Best-effort; a missed flag just shows the peer as not
          // typing until the next keystroke.
        });
    },
    [currentUser, conversationId, repo],
  );
  useEffect(() => {
    return () => {
      if (typingTimer.current) clearTimeout(typingTimer.current);
      publishTyping(false);
    };
  }, [publishTyping]);

  const peerTyping = conversation?.typing?.[peerId] === true;

  // Resolve the peer's display name + avatar from the conversation's
  // self-written meta, or the public tutor profile as a fallback.
  useEffect(() => {
    if (!peerId) return;
    const fromMeta = conversation?.meta[peerId];
    if (fromMeta?.name || conversation) {
      setPeerFallback(
        fromMeta?.name
          ? { name: fromMeta.name, avatar: fromMeta.avatar ?? null }
          : null,
      );
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const db = getFirestore(getApp());
        const snap = await getDoc(
          doc(db, "users", peerId, "tutorProfile", "default"),
        );
        const d = snap.data() as
          | { fullName?: string; photoUrl?: string }
          | undefined;
        if (!cancelled && d?.fullName) {
          setPeerFallback({
            name: d.fullName,
            avatar: typeof d.photoUrl === "string" ? d.photoUrl : null,
          });
        }
      } catch {
        // Non-tutor peer (or unreadable) — initials fallback below.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [peerId, conversation]);

  const peerName =
    params.peerName ||
    conversation?.meta[peerId]?.name ||
    peerFallback?.name ||
    "Chat";
  const peerAvatar =
    params.peerAvatar ||
    conversation?.meta[peerId]?.avatar ||
    peerFallback?.avatar ||
    null;

  const canSend = draftText.trim().length > 0 && !!currentUser && !sending;

  async function handleSend() {
    const text = draftText.trim();
    if (!canSend || !currentUser || !text) return;
    setSending(true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    publishTyping(false);
    try {
      await repo.sendMessage({
        conversationId,
        senderId: currentUser.uid,
        peerUid: peerId,
        text: text.slice(0, MAX_LEN),
      });
      setDraftText("");
    } catch (err) {
      console.warn("Chat: sendMessage failed", err);
    } finally {
      setSending(false);
    }
  }

  const data = useMemo(() => [...messages].reverse(), [messages]);

  return (
    <ScreenLayout variant="background">
      {/* Header */}
      <View className="bg-surface border-b border-border px-4 pt-2 pb-3 flex-row items-center gap-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          className="w-9 h-9 rounded-pill bg-background border border-border items-center justify-center active:opacity-70"
        >
          <Ionicons name="chevron-back" size={20} color={colors.brand.primary} />
        </Pressable>
        <Avatar name={peerName} imageUri={peerAvatar} size={36} />
        <View className="flex-1 min-w-0">
          <Text
            className="text-card-title font-medium text-text-primary"
            numberOfLines={1}
          >
            {peerName}
          </Text>
          <Text className="text-micro text-text-muted">Direct message</Text>
        </View>
      </View>

      {/* Messages + composer — anchored above the keyboard. The
          KeyboardAvoidingView wraps the list AND the composer so the
          whole thread lifts (and the composer rides the keyboard)
          instead of the keyboard covering the newest message. iOS
          pads by the keyboard height; Android re-sizes (the app's
          adjustResize). */}
      <KeyboardAvoidingView
        // Aug 25: Android relies on the OS adjustResize (behavior
        // "height" double-compensated and pushed messages under the
        // keyboard); iOS pads by keyboard height.
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
        className="flex-1"
      >
      <FlatList
        className="flex-1"
        contentContainerClassName="px-4 py-4 gap-2"
        contentContainerStyle={{ paddingBottom: 8 }}
        keyboardShouldPersistTaps="handled"
        data={data}
        inverted
        keyExtractor={(m) => m.messageId}
        ListEmptyComponent={
          loaded ? (
            <View className="items-center justify-center pt-20 px-8">
              <View className="w-14 h-14 rounded-pill bg-accent-soft items-center justify-center mb-3">
                <Ionicons name="chatbubble-ellipses-outline" size={26} color={colors.brand.accent} />
              </View>
              <Text className="text-card-title font-medium text-text-primary text-center">
                No messages yet
              </Text>
              <Text className="text-body-sm text-text-muted text-center mt-1.5">
                Say hello — this thread is only visible to you and{" "}
                {peerName === "Chat" ? "the other person" : peerName}.
              </Text>
            </View>
          ) : (
            <View className="items-center justify-center pt-20">
              <ActivityIndicator size="small" color={colors.brand.primary} />
            </View>
          )
        }
        renderItem={({ item }) => {
          const mine = currentUser ? item.senderId === currentUser.uid : false;
          return (
            <View
              className={`max-w-[82%] ${
                mine ? "self-end items-end" : "self-start items-start"
              }`}
            >
              <View
                className={`rounded-card px-3.5 py-2.5 ${
                  mine
                    ? "bg-verification border border-verification"
                    : "bg-surface border border-border"
                }`}
              >
                <Text
                  className={`text-body ${
                    mine ? "text-white" : "text-text-primary"
                  }`}
                >
                  {item.text}
                </Text>
                {mine && (
                  <View className="flex-row items-center justify-end mt-1 gap-0.5">
                    <Ionicons
                      name="checkmark"
                      size={12}
                      color={item.status === "read" ? colors.brand.verification : "rgba(255,255,255,0.6)"}
                    />
                    {item.status === "read" && (
                      <Ionicons
                        name="checkmark"
                        size={12}
                        style={{ marginLeft: -6 }}
                        color={colors.brand.verification}
                      />
                    )}
                  </View>
                )}
              </View>
              <Text className="text-micro text-text-muted mt-1 px-1">
                {formatTime(item.sentAt)}
              </Text>
            </View>
          );
        }}
      />

      {/* Typing indicator */}
      {peerTyping && (
        <View className="bg-surface px-4 py-1.5 border-t border-border">
          <Text className="text-micro text-text-muted italic">
            {peerName === "Chat" ? "They" : peerName} is typing…
          </Text>
        </View>
      )}

      {/* Composer */}
      <View
        className="border-t border-border bg-surface px-3 pt-2 flex-row items-end gap-2"
        style={{ paddingBottom: Math.max(insets.bottom, 10) }}
      >
        <TextInput
          value={draftText}
          onChangeText={(text) => {
            setDraftText(text);
            if (text.length > 0) {
              publishTyping(true);
              if (typingTimer.current) clearTimeout(typingTimer.current);
              typingTimer.current = setTimeout(
                () => publishTyping(false),
                1200,
              );
            } else {
              if (typingTimer.current) clearTimeout(typingTimer.current);
              publishTyping(false);
            }
          }}
          placeholder="Type a message…"
          placeholderTextColor={colors.text.muted}
          multiline
          maxLength={MAX_LEN}
          className="flex-1 min-h-[42px] max-h-[120px] bg-background border border-border rounded-card px-4 py-2.5 text-body text-text-primary"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send message"
          onPress={() => void handleSend()}
          disabled={!canSend}
          className={`w-11 h-11 rounded-pill items-center justify-center ${
            canSend ? "bg-accent active:opacity-90" : "bg-surface-muted"
          }`}
        >
          <Ionicons
            name="send"
            size={18}
            color={canSend ? colors.text.inverse : colors.text.muted}
          />
        </Pressable>
      </View>
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
}
