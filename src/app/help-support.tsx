/**
 * EdumentX — Help & support screen
 *
 * Shared by students and tutors (both profile tabs link here).
 * Static FAQ accordion + a direct contact row (mailto) — no data
 * layer needed; the content is evergreen demo copy.
 */

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";

import {
  ScreenLayout,
  ScreenHeader,
  ScreenScroll,
} from "@/components/shared/ScreenLayout";
import { colors } from "@/constants/colors";

const FAQS: { q: string; a: string }[] = [
  {
    q: "How do I find a tutor?",
    a: "Browse approved tutors on the home screen or search on the map. Every tutor is verified by our team before they appear.",
  },
  {
    q: "How do I enroll?",
    a: "Open a tutor's profile, tap Enroll, pick your preferred days and times, and send the request. The tutor accepts it from their inbox.",
  },
  {
    q: "How do payments work?",
    a: "EdumentX doesn't process payments. You and your tutor agree on a direct transfer — eSewa, Khalti, IME Pay or bank.",
  },
  {
    q: "What does tutor verification mean?",
    a: "Tutors upload their ID and academic documents during signup. An admin reviews them before the tutor goes live.",
  },
  {
    q: "How do I cancel a request?",
    a: "Open My Enrollments, go to the Pending tab, and tap Cancel on the request. The tutor will be notified.",
  },
];

const SUPPORT_EMAIL = "support@edumentx.app";

export default function HelpSupportScreen() {
  const router = useRouter();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <ScreenLayout variant="background">
      <ScreenHeader variant="light">
        <View className="flex-row items-center justify-between">
          <View className="self-start border-b-2 border-accent pb-0.5">
            <Text className="text-display text-text-primary">
              Help & support
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            className="w-9 h-9 rounded-pill bg-background border border-border items-center justify-center active:opacity-70"
          >
            <Ionicons name="chevron-back" size={20} color={colors.brand.primary} />
          </Pressable>
        </View>
        <Text className="text-body text-text-secondary mt-0.5">
          Frequently asked questions
        </Text>
      </ScreenHeader>

      <ScreenScroll className="flex-1 bg-background">
        <View className="gap-6">
          {/* FAQ accordion */}
          <View className="bg-surface border border-border rounded-card overflow-hidden">
            {FAQS.map((faq, index) => {
              const open = openIndex === index;
              return (
                <Pressable
                  key={faq.q}
                  accessibilityRole="button"
                  accessibilityLabel={faq.q}
                  accessibilityState={{ expanded: open }}
                  onPress={() => setOpenIndex(open ? null : index)}
                  className={`px-4 py-4 active:opacity-80 ${
                    index < FAQS.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <View className="flex-row items-center justify-between gap-3">
                    <Text className="text-card-title text-text-primary font-medium flex-1">
                      {faq.q}
                    </Text>
                    <Ionicons
                      name={open ? "chevron-up" : "chevron-down"}
                      size={16}
                      color={colors.text.muted}
                    />
                  </View>
                  {open && (
                    <Text className="text-body-sm text-text-secondary mt-2 leading-relaxed">
                      {faq.a}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>

          {/* Contact row */}
          <View>
            <Text className="text-label text-ink-muted mb-2">
              Still stuck?
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Email support at ${SUPPORT_EMAIL}`}
              onPress={() =>
                Linking.openURL(
                  `mailto:${SUPPORT_EMAIL}?subject=EdumentX support`,
                ).catch(() => {})
              }
              className="flex-row items-center gap-3 bg-surface border border-border rounded-card px-4 py-3.5 active:opacity-80"
            >
              <View className="w-9 h-9 rounded-pill bg-accent-soft items-center justify-center">
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color={colors.brand.accent}
                />
              </View>
              <View className="flex-1">
                <Text className="text-card-title text-text-primary">
                  Contact support
                </Text>
                <Text className="text-caption text-text-muted mt-0.5">
                  We reply within 24 hours
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.text.muted} />
            </Pressable>
          </View>

          <Text className="text-caption text-text-muted text-center">
            EdumentX · v1.0 · build 2026.06.27
          </Text>
        </View>
      </ScreenScroll>
    </ScreenLayout>
  );
}
