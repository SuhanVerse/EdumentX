/**
 * EdumentX — Messages hub (conversation list)
 *
 * Live list of the current user's 1:1 conversations, newest activity
 * first. Peer names/avatars come from each conversation's self-written
 * `meta` map — no cross-user profile reads needed. Tapping a row
 * opens `/chat` with the peer identity preloaded.
 */

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
} from "react-native";

import {
  ScreenLayout,
  ScreenHeader,
  ScreenScroll,
} from "@/components/shared/ScreenLayout";
import { Avatar } from "@/components/ui/Avatar";
import { getMessagesRepository } from "@/services/messages/dataSource";
import {
  peerUidOf,
  type Conversation,
} from "@/services/messages/types";
import { useAuthStore } from "@/store/authStore";

function formatListTime(ms: number): string {
  const d = new Date(ms);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function MessagesScreen() {
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.user);
  const repo = getMessagesRepository();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      setLoaded(true);
      return;
    }
    const unsub = repo.subscribeConversations(
      currentUser.uid,
      (list) => {
        setConversations(list);
        setLoaded(true);
      },
      (err) => {
        console.warn("Messages: subscribeConversations failed", err);
        setLoaded(true);
      },
    );
    return unsub;
  }, [currentUser, repo]);

  return (
    <ScreenLayout variant="background">
      <ScreenHeader variant="light">
        <View className="flex-row items-center justify-between">
          <View className="self-start border-b-2 border-accent pb-0.5">
            <Text className="text-display text-text-primary">Messages</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            className="w-9 h-9 rounded-pill bg-background border border-border items-center justify-center active:opacity-70"
          >
            <Ionicons name="chevron-back" size={20} color="#2F5D50" />
          </Pressable>
        </View>
        <Text className="text-body text-text-secondary mt-0.5">
          {loaded
            ? `${conversations.length} conversation${conversations.length === 1 ? "" : "s"}`
            : "Loading conversations…"}
        </Text>
      </ScreenHeader>

      <ScreenScroll className="flex-1 bg-background">
        {!loaded ? (
          <View className="items-center justify-center pt-16">
            <ActivityIndicator size="small" color="#2F5D50" />
          </View>
        ) : conversations.length === 0 ? (
          <View className="items-center justify-center pt-16 px-6">
            <View className="w-14 h-14 rounded-pill bg-accent-soft items-center justify-center mb-3">
              <Ionicons name="chatbubbles-outline" size={26} color="#E5A03B" />
            </View>
            <Text className="text-card-title font-medium text-text-primary text-center">
              No conversations yet
            </Text>
            <Text className="text-body-sm text-text-muted text-center mt-1.5">
              Message a tutor from your enrollments and the thread will
              appear here.
            </Text>
          </View>
        ) : (
          <View className="gap-2.5">
            {conversations.map((c) => {
              const peerId = currentUser ? peerUidOf(c, currentUser.uid) : "";
              const meta = c.meta[peerId];
              const name = meta?.name || "Chat";
              const avatar = meta?.avatar ?? null;
              return (
                <Pressable
                  key={c.conversationId}
                  accessibilityRole="button"
                  accessibilityLabel={`Open conversation with ${name}`}
                  onPress={() =>
                    router.push({
                      pathname: "/chat",
                      params: { peerId, peerName: name, peerAvatar: avatar ?? "" },
                    } as never)
                  }
                  className="bg-surface border border-border rounded-card p-3.5 flex-row items-center gap-3 active:opacity-80"
                >
                  <Avatar name={name} imageUri={avatar} size={44} />
                  <View className="flex-1 min-w-0">
                    <View className="flex-row items-center justify-between gap-2">
                      <Text
                        className="text-card-title font-medium text-text-primary flex-1"
                        numberOfLines={1}
                      >
                        {name}
                      </Text>
                      {c.lastMessage ? (
                        <Text className="text-micro text-text-muted">
                          {formatListTime(c.lastMessage.sentAt)}
                        </Text>
                      ) : null}
                    </View>
                    <Text
                      className="text-caption text-text-muted mt-0.5"
                      numberOfLines={1}
                    >
                      {c.lastMessage
                        ? `${c.lastMessage.senderId === currentUser?.uid ? "You: " : ""}${c.lastMessage.text}`
                        : "Start the conversation"}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#6B7268" />
                </Pressable>
              );
            })}
          </View>
        )}
      </ScreenScroll>
    </ScreenLayout>
  );
}
