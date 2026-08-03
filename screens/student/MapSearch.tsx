import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  ScreenLayout,
  ScreenHeader,
  ScreenScroll,
} from "@/components/shared/ScreenLayout";
import { useState } from "react";
import {
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { BottomNav } from "@/components/shared/BottomNav";
import { FiltersSheet } from "@/screens/student/FiltersSheet";
import { Skeleton } from "@/components/motion";

/**
 * EdumentX — Student Map Search
 *
 * Stage 1 rebuild (June 27, 2026):
 *   - Replaces the SVG-drawn fake map with a clearly-labeled placeholder
 *     ("Google Maps integration coming soon"). Real OSM tiles land in
 *     Phase 5.2 — until then we don't render any pins, polylines, or
 *     fabricated map imagery.
 *   - Search bar is functional in UI only (state held locally, no
 *     backend query yet).
 *   - The filter icon (top-right, beside the search bar) opens the
 *     FiltersSheet overlay — which is rendered inline inside this screen
 *     via a `Modal` (not pushed as a new route).
 *   - Visual language matches StudentHome: dark slate hero header,
 *     amber accent, surface cards, verification green for the few
 *     "verified tutor" hints that survive the placeholder state.
 */
export function MapSearch() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <ScreenLayout variant="night">

      {/* Hero header — matches StudentHome's slate header so the two
          screens feel like a single surface when tapped from the
          bottom nav. */}
      <ScreenHeader>
        <View className="flex-row items-center justify-between mb-4">
          <View>
            <Text className="text-body text-white/70 mb-0.5">Find a tutor</Text>
            <View style={{ borderBottomWidth: 2, borderBottomColor: '#E5A03B', paddingBottom: 2, alignSelf: 'flex-start' }}>
                <Text className="text-screen-title font-medium text-white">
                  Near you
                </Text>
              </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => router.replace("/student-home")}
            className="w-10 h-10 rounded-pill bg-white/10 items-center justify-center active:opacity-70"
          >
            <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Search bar + filter trigger. The filter button lives in the
            same row as the search input so it's visually grouped — per
            the Stage 1 spec ("top-right, beside the search bar"). */}
        <View className="flex-row gap-2">
          <View className="flex-1 bg-surface rounded-card h-12 flex-row items-center px-3 gap-2.5">
            <Ionicons name="search-outline" size={18} color="#6B7268" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search tutors, subjects…"
              placeholderTextColor="#6B7268"
              className="flex-1 text-body-lg text-text-primary"
            />
            {search.length > 0 && (
              <Pressable
                accessibilityLabel="Clear search"
                onPress={() => setSearch("")}
                className="active:opacity-70"
              >
                <Ionicons name="close-circle" size={18} color="#6B7268" />
              </Pressable>
            )}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open filters"
            onPress={() => setFiltersOpen(true)}
            className="w-12 h-12 rounded-xl bg-amber items-center justify-center active:opacity-80"
          >
            <Ionicons name="options-outline" size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      </ScreenHeader>

      {/* Content — sand background with the "coming soon" placeholder.
          We deliberately don't show any pins or fabricated map data:
          the screen must communicate "this is not real yet" so users
          don't try to tap on pins that aren't there. */}
      <ScreenScroll className="flex-1 bg-background">
        <View>
          <View className="bg-surface border border-border rounded-card p-6 items-center">
            <View className="w-16 h-16 rounded-pill bg-primary-light items-center justify-center mb-4">
              <Ionicons name="navigate-circle-outline" size={30} color="#2F5D50" />
            </View>
            <Text className="text-card-title font-medium text-text-primary text-center">
              Google Maps integration coming soon
            </Text>
            <Text
              className="text-body text-text-secondary text-center mt-2"
              style={{ maxWidth: 320 }}
            >
              {/* We&apos;re wiring up OpenStreetMap tiles for Phase 5.2 — no
              API key or credit card required. Once it&apos;s live,
              you&apos;ll see verified tutors plotted on a real map
              around your saved location. */}
            </Text>
            <View className="flex-row items-center gap-2 mt">
              {/* <Ionicons name="navigate-outline" size={14} color="#6B7268" />
              <Text className="text-caption text-text-muted">
                Phase 5.2 · Map tiles via OpenStreetMap
              </Text> */}
            </View>
          </View>

          {/* Skeleton hint cards — these mirror the visual rhythm of
              the future "tutor pins" surface so the layout doesn't
              collapse to a single block. They're clearly labeled as
              placeholders. */}
          <View className="mt-6 gap-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-section-title font-medium text-text-primary">
                Nearby (preview)
              </Text>
              <Text className="text-caption text-text-muted">
                Coming soon
              </Text>
            </View>

            {[1, 2, 3].map((i) => (
              <View
                key={i}
                className="bg-surface border border-border rounded-card p-4 flex-row items-center gap-3"
              >
                <Skeleton className="w-avatar-card h-avatar-card rounded-pill" />
                <View className="flex-1 gap-2">
                  <Skeleton className="h-3 w-2/3 rounded-md" />
                  <Skeleton className="h-2.5 w-1/2 rounded-md" />
                  <Skeleton className="h-2.5 w-1/3 rounded-md" />
                </View>
                <View className="w-10 h-10 rounded-pill bg-surface-muted items-center justify-center">
                  <Ionicons name="ellipsis-horizontal" size={16} color="#6B7268" />
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScreenScroll>

      <BottomNav role="student" current="/map-search" />

      {/* Bottom-sheet overlay. Renders inline as a Modal — not pushed
          as a route — so the MapSearch stays mounted and visible at
          ~0.75 opacity underneath. The sheet handles its own close
          button and backdrop tap. */}
      <FiltersSheet
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
      />
    </ScreenLayout>
  );
}