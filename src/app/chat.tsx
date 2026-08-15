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
import { useEffect, useMemo, useState } from "react";
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
          <Ionicons name="chevron-back" size={20} color="#2F5D50" />
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

      {/* Messages */}
      <FlatList
        className="flex-1"
        contentContainerClassName="px-4 py-4 gap-2"
        data={data}
        inverted
        keyExtractor={(m) => m.messageId}
        ListEmptyComponent={
          loaded ? (
            <View className="items-center justify-center pt-20 px-8">
              <View className="w-14 h-14 rounded-pill bg-accent-soft items-center justify-center mb-3">
                <Ionicons name="chatbubble-ellipses-outline" size={26} color="#E5A03B" />
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
              <ActivityIndicator size="small" color="#2F5D50" />
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
                className={`rounded-2xl px-3.5 py-2.5 ${
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
              </View>
              <Text className="text-micro text-text-muted mt-1 px-1">
                {formatTime(item.sentAt)}
              </Text>
            </View>
          );
        }}
      />

      {/* Composer */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <View
          className="border-t border-border bg-surface px-3 pt-2 flex-row items-end gap-2"
          style={{ paddingBottom: Math.max(insets.bottom, 10) }}
        >
          <TextInput
            value={draftText}
            onChangeText={setDraftText}
            placeholder="Type a message…"
            placeholderTextColor="#6B7280"
            multiline
            maxLength={MAX_LEN}
            className="flex-1 min-h-[42px] max-h-[120px] bg-background border border-border rounded-2xl px-4 py-2.5 text-body text-text-primary"
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
              color={canSend ? "#FFFFFF" : "#9CA3AF"}
            />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
}
