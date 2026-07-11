/**
 * ImageViewer — full-screen lightbox modal for image preview.
 *
 * Renders a tappable thumbnail that opens a full-screen modal overlay
 * with the image at its natural resolution (scaled to fit). The user
 * can:
 *   - View the image without leaving the app
 *   - Pinch-to-zoom and pan (via ScrollView with `maximumZoomScale`)
 *   - Dismiss by tapping the close button, the backdrop, or the
 *     system back gesture (Android hardware back)
 *
 * Usage:
 * ```tsx
 * <ImageViewer uri="https://..." label="Citizenship ID" />
 * ```
 *
 * If you need more control (e.g. a custom trigger), use the lower-level
 * `useImageViewer` hook or compose `ImageViewerModal` directly.
 *
 * There are no existing image viewer components in the project — this
 * is the first. It's deliberately minimal: no swipe-to-dismiss, no
 * double-tap-zoom, no page indicators (those require gesture-handler
 * composition that adds complexity we don't need for verification
 * documents). Pinch-to-zoom on the default `ScrollView` works on both
 * iOS and Android via `maximumZoomScale` / `minimumZoomScale`.
 */
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

// ─── Props ───────────────────────────────────────────────────────────────────

export type ImageViewerProps = {
  /** Public URL of the image to display. */
  uri: string;
  /** Accessible label / file name shown in the footer. */
  label: string;
  /** Width of the thumbnail in the list. Used for skeleton sizing. */
  thumbnailWidth?: number;
  /** Height of the thumbnail in the list. Used for skeleton sizing. */
  thumbnailHeight?: number;
};

// ─── Component ───────────────────────────────────────────────────────────────

export function ImageViewer({
  uri,
  label,
  thumbnailWidth = 128,
  thumbnailHeight = 80,
}: ImageViewerProps) {
  const [visible, setVisible] = useState(false);
  const { width: screenW, height: screenH } = useWindowDimensions();

  return (
    <>
      {/* Thumbnail trigger */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`View ${label}`}
        onPress={() => setVisible(true)}
        className="overflow-hidden rounded-lg active:opacity-80"
        style={{ width: thumbnailWidth, height: thumbnailHeight }}
      >
        <Image
          source={{ uri }}
          className="w-full h-full"
          resizeMode="cover"
        />
      </Pressable>

      {/* Full-screen modal */}
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setVisible(false)}
      >
        {/* Dark backdrop — tapping closes the viewer */}
        <Pressable
          accessibilityLabel="Close image viewer"
          onPress={() => setVisible(false)}
          className="flex-1 bg-black/95 justify-center"
        >
          {/* Nested Pressable that stops propagation so taps on the
              image itself don't close the viewer */}
          <Pressable
            onPress={() => {
              /* Intentionally empty — allows taps on the image area
                 to not close the viewer. */
            }}
            className="flex-1 justify-center"
          >
            <ScrollView
              className="flex-1"
              contentContainerClassName="flex-grow justify-center items-center"
              maximumZoomScale={4}
              minimumZoomScale={1}
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
              centerContent
            >
              <Image
                source={{ uri }}
                className="max-w-full max-h-full"
                resizeMode="contain"
                style={{
                  width: screenW * 0.9,
                  height: screenH * 0.75,
                }}
              />
            </ScrollView>
          </Pressable>

          {/* Close button — floating in the top-right */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={() => setVisible(false)}
            className="absolute top-12 right-4 w-10 h-10 rounded-pill bg-white/15 items-center justify-center active:opacity-70"
          >
            <Ionicons name="close" size={22} color="#FFFFFF" />
          </Pressable>

          {/* Footer label */}
          <View className="absolute bottom-8 left-0 right-0 items-center px-6">
            <View className="bg-black/50 px-4 py-2 rounded-pill">
              <Text className="text-caption text-white/90 text-center">
                {label}
              </Text>
            </View>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

/**
 * Lower-level component that renders only the modal overlay.
 * Useful when you want a custom trigger (e.g. a full card tap
 * instead of the built-in thumbnail).
 */
export function ImageViewerModal({
  visible,
  uri,
  label,
  onClose,
}: {
  visible: boolean;
  uri: string;
  label: string;
  onClose: () => void;
}) {
  const { width: screenW, height: screenH } = useWindowDimensions();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable
        accessibilityLabel="Close image viewer"
        onPress={onClose}
        className="flex-1 bg-black/95 justify-center"
      >
        <Pressable
          onPress={() => {}}
          className="flex-1 justify-center"
        >
          <ScrollView
            className="flex-1"
            contentContainerClassName="flex-grow justify-center items-center"
            maximumZoomScale={4}
            minimumZoomScale={1}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            centerContent
          >
            <Image
              source={{ uri }}
              className="max-w-full max-h-full"
              resizeMode="contain"
              style={{
                width: screenW * 0.9,
                height: screenH * 0.75,
              }}
            />
          </ScrollView>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={onClose}
          className="absolute top-12 right-4 w-10 h-10 rounded-pill bg-white/15 items-center justify-center active:opacity-70"
        >
          <Ionicons name="close" size={22} color="#FFFFFF" />
        </Pressable>

        <View className="absolute bottom-8 left-0 right-0 items-center px-6">
          <View className="bg-black/50 px-4 py-2 rounded-pill">
            <Text className="text-caption text-white/90 text-center">
              {label}
            </Text>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}
