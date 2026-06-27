import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SlidersHorizontal } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SearchBar } from '@/src/components/search/SearchBar';
import { tokens } from '@/src/theme/tokens';
import { DOCK_BOTTOM_GAP } from '@/src/components/navigation/GlassDock/GlassDock';

// Height of the "Show results" floating pill button + its gap above the dock.
const RESULTS_BTN_HEIGHT = 52;
const RESULTS_BTN_GAP = 10;

export default function SearchTab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  /**
   * The dock's top edge sits at: insets.bottom + DOCK_BOTTOM_GAP + dockH
   * The floating button lives RESULTS_BTN_GAP above that edge.
   *
   *  ┌──────────────────────────────────────────────┐ ← top of screen
   *  │  scroll content                              │
   *  │                                              │
   *  │  ╔══════════════════════════════╗  ← button  │ bottom = dockTop + gap
   *  │  ║  Show 240 results            ║            │
   *  │  ╚══════════════════════════════╝            │
   *  │  ╔══════════╗  ← dock (64 px)                │
   *  │  ║ ● ○ ○ ○  ║                                │
   *  │  ╚══════════╝                                │
   *  └──────────────────────────────────────────────┘ ← screen bottom
   */
  const dockTopEdge = insets.bottom + DOCK_BOTTOM_GAP + tokens.space.dockH;
  const buttonBottom = dockTopEdge + RESULTS_BTN_GAP;

  // Scroll content needs enough bottom padding so the last item isn't hidden
  // behind the floating button + dock stack.
  const scrollPaddingBottom = buttonBottom + RESULTS_BTN_HEIGHT + 16;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View className="h-[56px] flex-row items-center justify-between border-b border-line px-6">
        <Text className="font-display text-[22px] text-ink">Search</Text>
        <Pressable className="h-9 w-9 items-center justify-center rounded-pill bg-input">
          <SlidersHorizontal size={17} color="#0A0A0A" strokeWidth={2} />
        </Pressable>
      </View>

      {/* ── Scrollable content ─────────────────────────────────────────── */}
      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ paddingTop: 20, paddingBottom: scrollPaddingBottom }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {/* Search input */}
        <SearchBar
          autoFocus
          placeholder="Location, property name…"
          showFilterIcon
          onFilterPress={() => router.push('/(tenant)/_modal/filter' as any)}
        />

        {/* Recent searches */}
        <Text className="mb-3 mt-7 font-semibold text-h3 text-ink">Recent</Text>
        {['Thamel apartments', 'Jhamsikhel 2BHK', 'Near Durbar Marg'].map((item, i, arr) => (
          <Pressable
            key={item}
            className={`flex-row items-center py-3.5 ${
              i < arr.length - 1 ? 'border-b border-row-divider' : ''
            }`}>
            <View className="mr-3 h-8 w-8 items-center justify-center rounded-pill bg-canvas">
              <Text className="text-body-sm text-ink3">↗</Text>
            </View>
            <Text className="font-sans text-body text-ink">{item}</Text>
          </Pressable>
        ))}

        {/* Popular filters */}
        <Text className="mb-3 mt-7 font-semibold text-h3 text-ink">Popular</Text>
        <View className="flex-row flex-wrap gap-2">
          {['Pet Friendly', 'Furnished', 'With Parking', 'Near School', 'Studio', '2 BHK'].map(
            (chip) => (
              <Pressable key={chip} className="rounded-pill border border-line bg-bg px-4 py-2">
                <Text className="font-medium text-body-sm text-ink">{chip}</Text>
              </Pressable>
            )
          )}
        </View>

        {/* Price range section */}
        <Text className="mb-3 mt-7 font-semibold text-h3 text-ink">Price range</Text>
        <View className="flex-row gap-2">
          {['Under 20K', '20K – 40K', '40K – 70K', '70K+'].map((range) => (
            <Pressable
              key={range}
              className="flex-1 items-center rounded-lg border border-line bg-bg py-3">
              <Text className="font-medium text-caption text-ink">{range}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/*
       * ── Floating "Show results" button ─────────────────────────────────
       *
       * Positioned above the dock using calculated `buttonBottom`.
       * Does NOT live inside a sticky footer bar — that pattern overlapped
       * with the floating dock and hid the button entirely.
       *
       * pointerEvents="box-none" on the wrapper lets taps on the transparent
       * region below (between button and dock) fall through to the dock.
       */}
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          left: 24,
          right: 24,
          bottom: buttonBottom,
        }}>
        <Pressable
          onPress={() => router.push('/(tenant)/search-results' as any)}
          style={({ pressed }) => ({
            height: RESULTS_BTN_HEIGHT,
            borderRadius: 999,
            backgroundColor: pressed ? '#1a1a1a' : '#0A0A0A',
            alignItems: 'center',
            justifyContent: 'center',
            // Soft shadow so the button reads clearly above scroll content
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.22,
            shadowRadius: 12,
            elevation: 8,
          })}>
          <Text className="font-semibold text-body text-white">Show 240 results</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
