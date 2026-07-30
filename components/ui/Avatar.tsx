/**
 * Avatar — initials-first circular avatar.
 *
 * We do not yet have avatar upload wired up (Supabase Storage bucket
 * wiring lands in Phase 5.1), so today every user renders as initials
 * on a deterministic tinted surface circle. The `imageUri` prop is
 * reserved for that future wiring; when it's truthy the component will
 * render the image, but for now it just falls back to initials.
 *
 * `getInitials(name)` returns 2 uppercase letters — first letter of
 * the first two words. e.g. "Suhan Shrestha" -> "SS", "Ramesh" -> "RA"
 * (duplicated) so the dot always reads as filled.
 *
 * `getAvatarTint(name)` picks one of 4 muted palette backgrounds based
 * on the first character of the name — deterministic per-user tint so
 * avatars are visually distinguishable at a glance without a real photo.
 */
import { Image, Text, View } from 'react-native';

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getInitials(name: string | undefined | null): string {
  const trimmed = (name || '').trim();
  if (!trimmed) return '?';
  const words = trimmed.split(/\s+/);
  const first = words[0]?.[0] ?? '';
  const second = words[1]?.[0] ?? words[0]?.[1] ?? '';
  return (first + second).toUpperCase();
}

const TINTS = ['bg-surface-muted', 'bg-accent-soft', 'bg-verification-light', 'bg-ai-light'];

function getAvatarTint(name: string | undefined | null): string {
  const code = ((name && name.charCodeAt(0)) || 0) % TINTS.length;
  return TINTS[code];
}

// ─── Props ───────────────────────────────────────────────────────────────────

export type AvatarProps = {
  /** Full name; used for the 2-letter initials fallback. */
  name: string;
  /** Optional image URL — wired in once Supabase Storage uploads land. */
  imageUri?: string | null;
  /** Diameter in pixels. */
  size?: number;
  /** Extra Tailwind classes appended to the wrapper. */
  className?: string;
};

// ─── Component ───────────────────────────────────────────────────────────────

export function Avatar({
  name,
  imageUri,
  size = 40,
  className = '',
}: AvatarProps) {
  return (
    <View
      className={`items-center justify-center overflow-hidden rounded-pill border border-border ${getAvatarTint(name)} ${className}`}
      style={{ width: size, height: size }}
    >
      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          style={{ width: size, height: size }}
          resizeMode="cover"
        />
      ) : (
        <Text
          className="font-sans text-text-primary"
          style={{ fontSize: size * 0.35 }}
        >
          {getInitials(name)}
        </Text>
      )}
    </View>
  );
}
