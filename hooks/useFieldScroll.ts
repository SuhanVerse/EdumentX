import { useCallback, useRef, type RefObject } from "react";
import type { LayoutChangeEvent, ScrollView } from "react-native";

/**
 * EdumentX — useFieldScroll
 *
 * Scroll-to-first-invalid helper for long onboarding forms (student /
 * tutor profile setup). Each validated section registers its y-offset
 * (relative to the ScrollView's content container) with `registerField`,
 * and a failed submit calls `scrollToFirstInvalid` with the section keys
 * that have errors — the form then scrolls the first invalid section
 * into view, right where its inline error message / red border lives.
 *
 * Why a shared hook instead of per-screen math: the two setup screens
 * duplicate the same form machinery, and the user's complaint was
 * precisely that a failed submit gave no indication of *where* the
 * problem was. Centralizing the offsets registry keeps the behavior
 * identical on both screens and for any future form.
 *
 * Usage:
 *
 *   const scrollRef = useRef<ScrollView>(null);
 *   const { registerField, scrollToFirstInvalid } = useFieldScroll();
 *
 *   <ScrollView ref={scrollRef} ...>
 *     <View onLayout={registerField("avatar")}>
 *       <AvatarUploader ... />
 *     </View>
 *     ...
 *   </ScrollView>
 *
 *   // on submit failure:
 *   scrollToFirstInvalid(scrollRef, ["avatar", "nameEmail", ...]);
 *
 * Section order = document order: `scrollToFirstInvalid` picks the
 * smallest measured y among the invalid keys, which is the first one the
 * user sees on screen.
 */
export function useFieldScroll() {
  const offsetsRef = useRef<Record<string, number>>({});

  /**
   * Returns an `onLayout` handler for a given section key. Attach to
   * the section wrapper View; the measured `layout.y` is relative to
   * the ScrollView's content container, which is the same coordinate
   * space `scrollTo` expects.
   */
  const registerField = useCallback(
    (key: string) => (event: LayoutChangeEvent) => {
      offsetsRef.current[key] = event.nativeEvent.layout.y;
    },
    [],
  );

  /**
   * Scrolls the first invalid section (by document order) into view.
   * `invalidSections` should be the section keys that currently have
   * validation errors, in no particular order — the smallest measured
   * y wins. No-op when none of the keys have been measured yet.
   */
  const scrollToFirstInvalid = useCallback(
    (scrollRef: RefObject<ScrollView | null>, invalidSections: string[]) => {
      let firstY: number | null = null;
      for (const key of invalidSections) {
        const y = offsetsRef.current[key];
        if (y == null) continue;
        if (firstY == null || y < firstY) firstY = y;
      }
      if (firstY != null) {
        // Small breathing room above the section's error message.
        scrollRef.current?.scrollTo({
          y: Math.max(0, firstY - 16),
          animated: true,
        });
      }
    },
    [],
  );

  return { registerField, scrollToFirstInvalid };
}
