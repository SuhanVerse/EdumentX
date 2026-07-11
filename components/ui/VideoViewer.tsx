/**
 * VideoViewerModal — full-screen video player modal.
 *
 * Displays a demo teaching video (or any remote video URL) inside the
 * app using `expo-video`'s `VideoView` + `useVideoPlayer` with native
 * playback controls. The user can:
 *   - Play / pause / seek using the native controls
 *   - Dismiss by tapping the close button or the system back gesture
 *
 * Usage mirrors `ImageViewerModal` so the two components feel
 * consistent in the admin queue.
 *
 * ```tsx
 * const [previewVideo, setPreviewVideo] = useState<{ uri: string; label: string } | null>(null);
 *
 * <VideoViewerModal
 *   visible={!!previewVideo}
 *   uri={previewVideo?.uri ?? ""}
 *   label={previewVideo?.label ?? ""}
 *   onClose={() => setPreviewVideo(null)}
 * />
 * ```
 */
import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";

export type VideoViewerModalProps = {
  visible: boolean;
  /** Public URL of the video to play. */
  uri: string;
  /** Accessible label shown in the footer overlay. */
  label: string;
  /** Called when the user dismisses the player. */
  onClose: () => void;
};

export function VideoViewerModal({
  visible,
  uri,
  label,
  onClose,
}: VideoViewerModalProps) {
  // Create a player for the given source. The hook manages the
  // player lifecycle automatically — it's created when the source
  // changes and cleaned up on unmount.
  const player = useVideoPlayer({ uri });

  // Auto-play when the modal opens, pause when it closes.
  // Using a useEffect ensures this runs reactively every time
  // `visible` changes, unlike the useVideoPlayer setup callback
  // which only runs once on player creation.
  useEffect(() => {
    if (visible) {
      player.play();
    } else {
      player.pause();
    }
  }, [visible, player]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Dark backdrop */}
      <View className="flex-1 bg-black/95 justify-center">
        {/* Video player area */}
        <View className="flex-1 justify-center px-4">
          <VideoView
            style={{ width: "100%", aspectRatio: 16 / 9 }}
            player={player}
            nativeControls
            contentFit="contain"
          />
        </View>

        {/* Close button — floating in the top-right */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close video player"
          onPress={onClose}
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
      </View>
    </Modal>
  );
}
