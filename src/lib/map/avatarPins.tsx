/**
 * Avatar pin factory — rasterizes `TutorAvatarPin` views to image refs.
 *
 * expo-maps (Android Google Maps) markers can only display image refs
 * (`SharedRef<'image'>`), never React nodes. To show a classic drop pin
 * WITH the tutor's photo, we:
 *
 *   1. render one offscreen `<TutorAvatarPin>` per unique
 *      (photoUrl × verified) combination,
 *   2. rasterize it to a temp PNG via `react-native-view-shot`
 *      (`captureRef`),
 *   3. load the PNG through `expo-image`'s `Image.loadAsync` → an
 *      `ImageRef` usable as `GoogleMapsMarker.icon`.
 *
 * The module-level cache means each unique pin is captured exactly
 * once per app session, even across screens. `useAvatarPins` returns
 * the ready map plus a hidden `<AvatarPinHost/>` to mount inside the
 * map screen.
 *
 * Requires `react-native-view-shot` (added Aug 2026 — zero-budget,
 * keyless, on-device). EAS/dev-client rebuild required.
 */
import { captureRef } from "react-native-view-shot";
import { Image, type ImageRef } from "expo-image";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";

import {
  TutorAvatarPin,
  PIN_WIDTH,
  PIN_HEIGHT,
} from "@/components/map/TutorAvatarPin";

/** Gives up waiting for a slow/broken avatar before rasterizing. */
const CAPTURE_TIMEOUT_MS = 4000;

// ─── Keys ───────────────────────────────────────────────────────────────────

export function avatarPinKey(
  avatarUri: string | null,
  verified: boolean,
): string {
  return `${verified ? "v" : "u"}:${avatarUri ?? "anon"}`;
}

type PinItem = {
  key: string;
  avatarUri: string | null;
  verified: boolean;
};

// ─── Module cache ────────────────────────────────────────────────────────────

/**
 * Completed captures. `undefined` value = capture failed (fall back to
 * the default marker tint). Module-level so a pin captured on the map
 * screen is never re-captured by the picker or a remount.
 */
const cache = new Map<string, ImageRef | null>();

export function getCachedAvatarPin(
  avatarUri: string | null,
  verified: boolean,
): ImageRef | null | "pending" {
  const key = avatarPinKey(avatarUri, verified);
  return cache.has(key) ? cache.get(key)! : "pending";
}

// ─── Offscreen host ──────────────────────────────────────────────────────────

/**
 * Hidden mount point for the pin views being rasterized. Must be
 * rendered (and laid out) for `captureRef` to work — the map screen
 * mounts it via `useAvatarPins`. Opacity 0.01 (not 0) so the views
 * still lay out on every Android/Apple combination.
 */
export const AvatarPinHost = memo(function AvatarPinHost({
  items,
  onReady,
}: {
  items: PinItem[];
  onReady: (key: string, ref: ImageRef | null) => void;
}) {
  return (
    <View
      pointerEvents="none"
      style={{ position: "absolute", top: 0, left: -4000, opacity: 0.01 }}
    >
      {items.map((item) => (
        <PinCaptureItem key={item.key} item={item} onReady={onReady} />
      ))}
    </View>
  );
});

const PinCaptureItem = memo(function PinCaptureItem({
  item,
  onReady,
}: {
  item: PinItem;
  onReady: (key: string, ref: ImageRef | null) => void;
}) {
  const viewRef = useRef<View>(null);
  // Wait for the avatar to decode before rasterizing (unless there is
  // no photo — then the glyph fallback is ready immediately).
  const [avatarLoaded, setAvatarLoaded] = useState(!item.avatarUri);
  const [fired, setFired] = useState(false);

  useEffect(() => {
    if (!avatarLoaded || fired) return;
    setFired(true);

    let cancelled = false;
    (async () => {
      try {
        if (!viewRef.current) throw new Error("pin view not mounted");
        const uri = await captureRef(viewRef, {
          format: "png",
          quality: 1,
          result: "tmpfile",
        });
        const imageRef = await Image.loadAsync(uri);
        if (!cancelled) onReady(item.key, imageRef);
      } catch (err) {
        console.warn("[avatarPins] capture failed for", item.key, err);
        if (!cancelled) onReady(item.key, null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [avatarLoaded, fired, item.key, onReady]);

  // Hard cap for avatar decode: if the photo URL is slow, throttled
  // or dead (e.g. a stale Supabase path), the capture must still
  // fire — otherwise the map pin falls back to the generic native
  // marker forever and the street-level tint is lost. After 4 s we
  // rasterize whatever is on screen (likely the glyph fallback).
  useEffect(() => {
    if (fired) return;
    const t = setTimeout(() => setAvatarLoaded(true), CAPTURE_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [fired, avatarLoaded]);

  return (
    <View
      ref={viewRef}
      collapsable={false}
      style={{ width: PIN_WIDTH, height: PIN_HEIGHT }}
    >
      <TutorAvatarPin
        avatarUri={item.avatarUri}
        verified={item.verified}
        onAvatarLoad={() => setAvatarLoaded(true)}
        onAvatarError={() => setAvatarLoaded(true)}
      />
    </View>
  );
});

// ─── Hook ────────────────────────────────────────────────────────────────────

export type AvatarPinMap = Record<string, ImageRef | null>;

/**
 * Build avatar pins for a tutor list.
 *
 * @returns `{ pins, pendingCount, host }` — `pins` maps
 *   `avatarPinKey(...)` → image ref (or `null` when that pin failed),
 *   `pendingCount` is the number of unique pins still rasterizing
 *   (used by the map screen to defer marker mounting until the
 *   teardrop icons exist — expo-maps can't reliably hot-swap a
 *   marker's icon after mount, so mounting the markers only once the
 *   icons are ready is the deterministic path), and `host` is the JSX
 *   to mount once in the map screen. Already-cached keys resolve
 *   immediately.
 */
export function useAvatarPins(
  tutors: readonly {
    photoUrl: string | null;
    isVerifiedProfessional: boolean;
  }[],
): {
  pins: AvatarPinMap;
  pendingCount: number;
  host: React.ReactElement | null;
} {
  // Unique (photoUrl × verified) combos — memoized so the host doesn't
  // remount when the list updates.
  const items = useMemo(() => {
    const seen = new Set<string>();
    const list: PinItem[] = [];
    for (const t of tutors) {
      const key = avatarPinKey(t.photoUrl, t.isVerifiedProfessional);
      if (seen.has(key)) continue;
      seen.add(key);
      if (cache.has(key)) continue; // already captured — no host item
      list.push({ key, avatarUri: t.photoUrl, verified: t.isVerifiedProfessional });
    }
    return list;
  }, [tutors]);

  const [pins, setPins] = useState<AvatarPinMap>(() => {
    const map: AvatarPinMap = {};
    for (const t of tutors) {
      const key = avatarPinKey(t.photoUrl, t.isVerifiedProfessional);
      if (cache.has(key)) map[key] = cache.get(key)!;
    }
    return map;
  });

  // Number of unique pins not yet resolved (neither generated nor
  // failed). Drives the map's "wait for icons before mounting tutor
  // markers" gate.
  const resolvedCount = useMemo(
    () =>
      items.reduce((acc, item) => (pins[item.key] !== undefined ? acc + 1 : acc), 0),
    [items, pins],
  );
  const pendingCount = Math.max(0, items.length - resolvedCount);

  const onReady = useCallback((key: string, ref: ImageRef | null) => {
    cache.set(key, ref);
    setPins((prev) => (prev[key] === ref ? prev : { ...prev, [key]: ref }));
  }, []);

  // Seed pins from the cache whenever the tutor list changes (first
  // snapshot may resolve after mount).
  useEffect(() => {
    setPins((prev) => {
      let next = prev;
      for (const t of tutors) {
        const key = avatarPinKey(t.photoUrl, t.isVerifiedProfessional);
        if (!cache.has(key) || Object.prototype.hasOwnProperty.call(prev, key)) {
          continue;
        }
        if (next === prev) next = { ...prev };
        next[key] = cache.get(key)!;
      }
      return next;
    });
  }, [tutors]);

  return {
    pins,
    pendingCount,
    host: items.length > 0 ? <AvatarPinHost items={items} onReady={onReady} /> : null,
  };
}