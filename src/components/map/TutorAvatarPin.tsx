/**
 * TutorAvatarPin — the standard "drop pin" used for tutor markers.
 *
 * Visual language (BasoBas `PropertyMapPin` rhythm, EdumentX palette):
 * a classic teardrop = white circular head (the tutor's avatar inside,
 * clipped) + a rotated-square tail. Slate (#0F172A) border + tail in the
 * default state; amber (#E5A03B) when the tutor is a verified
 * professional, with a small shield badge on the head's rim.
 *
 * This is a PURE VIEW — it is rendered offscreen by
 * `lib/map/avatarPins.tsx` and rasterized to a PNG via
 * react-native-view-shot, because expo-maps markers can only take
 * image refs (no React nodes). Keep it dependency-light.
 */
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { View } from "react-native";

// ─── Geometry (px, 1x) ───────────────────────────────────────────────────────
// 56×58: 44px head + 3px border + 12px tail with 2px overlap.
export const PIN_WIDTH = 56;
export const PIN_HEIGHT = 58;
const HEAD = 44;
const HEAD_BORDER = 3;
const AVATAR = HEAD - HEAD_BORDER * 2; // 38
const TAIL = 12;

// Palette — mirrors `tailwind.config.js` slate / amber tokens.
const SLATE = "#0F172A";
const AMBER = "#E5A03B";
const WHITE = "#FFFFFF";

export type TutorAvatarPinProps = {
  /** Tutor profile photo (Supabase public URL). `null` renders the
   *  person glyph fallback. */
  avatarUri: string | null;
  verified: boolean;
  /** Fired when the avatar image finished decoding — the capture host
   *  waits for this before rasterizing so the pin never ships with a
   *  blank head. Ignored when `avatarUri` is null. */
  onAvatarLoad?: () => void;
  /** Fired when the avatar failed to decode (stale URL, network off).
   *  The host uses this to stop waiting and rasterize the glyph
   *  fallback pin instead of hanging. Ignored when `avatarUri` is null. */
  onAvatarError?: () => void;
};

export function TutorAvatarPin({
  avatarUri,
  verified,
  onAvatarLoad,
  onAvatarError,
}: TutorAvatarPinProps) {
  const ring = verified ? AMBER : SLATE;

  return (
    <View
      style={{
        width: PIN_WIDTH,
        height: PIN_HEIGHT,
        alignItems: "center",
        // BasoBas pin shadow rhythm.
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 4,
      }}
    >
      {/* Head — white disc with the avatar clipped to a circle */}
      <View
        style={{
          width: HEAD,
          height: HEAD,
          borderRadius: HEAD / 2,
          backgroundColor: WHITE,
          borderWidth: HEAD_BORDER,
          borderColor: ring,
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {avatarUri ? (
          <Image
            source={{ uri: avatarUri }}
            style={{ width: AVATAR, height: AVATAR, borderRadius: AVATAR / 2 }}
            contentFit="cover"
            transition={0}
            onLoad={onAvatarLoad}
            onError={onAvatarError}
          />
        ) : (
          <Ionicons name="person" size={AVATAR * 0.55} color={SLATE} />
        )}

        {/* Verified shield — amber badge on the head rim */}
        {verified ? (
          <View
            style={{
              position: "absolute",
              right: -2,
              bottom: -2,
              width: 17,
              height: 17,
              borderRadius: 9,
              backgroundColor: AMBER,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 2,
              borderColor: WHITE,
            }}
          >
            <Ionicons name="shield-checkmark" size={10} color={WHITE} />
          </View>
        ) : null}
      </View>

      {/* Tail — rotated square pointing at the coordinate */}
      <View
        style={{
          width: TAIL,
          height: TAIL,
          marginTop: -TAIL / 2 + 2,
          backgroundColor: ring,
          borderRadius: 3,
          transform: [{ rotate: "45deg" }],
        }}
      />
    </View>
  );
}