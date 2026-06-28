// FiltersSheet is not a standalone screen — it's an overlay rendered
// inline by MapSearch (and future surfaces that need filters). The
// route file is kept so the Stack.Screen declaration in _layout.tsx
// has somewhere to mount, but visiting `/filters-sheet` directly just
// renders a blank page with a "back to map" affordance.
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function FiltersSheetRoute() {
  const router = useRouter();
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-screen-title font-medium text-text-primary text-center">
          Filters
        </Text>
        <Text className="text-body text-text-secondary text-center mt-2">
          Filters open as an overlay from the Map screen. Tap the icon
          on the top-right of the search bar to open them.
        </Text>
        <Pressable
          onPress={() => router.replace("/map-search")}
          className="mt-6 min-h-btn px-6 rounded-card bg-amber items-center justify-center active:opacity-80"
        >
          <Text className="text-button text-text-inverse font-semibold">
            Back to map
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}