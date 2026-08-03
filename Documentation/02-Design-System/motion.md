# Motion & Interactivity System

> **Status:** Shipped (July 2026 micro-interactions pass).
> **Audience:** Anyone adding or modifying an interactive surface in EdumentX.

This document is the canonical reference for the **motion and interactivity layer** of EdumentX. It covers the shared toolkit, the design tokens, the hooks & primitives, and the patterns every screen and component should follow when adding feedback.

It does **not** cover splash / 3D / onboarding illustrations — those are a separate motion system (see `components/illustrations/*` and `components/premium/SplashParticleField.tsx`).

---

## 1. Goals

The micro-interactions pass had four goals, in priority order:

1. **Every pressable should give a real spring-scale or fade** — not just a Tailwind `active:opacity-{N}`.
2. **Segmented controls, switches, and modals should animate, not jump** — the active pill slides, the switch thumb springs, the dialog fades-and-scales in.
3. **Forms should feel alive** — focus lights the border up, valid values get a checkmark, invalid submissions shake.
4. **Empty states should breathe** — gentle float on illustrations, skeleton pulse on loading lists.

All four were achieved with **zero new dependencies**, **zero color changes**, and **zero business-logic changes** — only local UI state driving visual feedback.

---

## 2. Constraints (read these first)

These were non-negotiable from the prompt and apply to **every** future motion edit:

1. **No color changes.** Every color must come from a Tailwind token in `tailwind.config.js` or a pre-existing hex lookup in `constants/colors.ts`. The narrow exception is `interpolateColor` arguments inside worklets — those use `constants/colors.ts` hex values, not new ones.
2. **No business-logic, navigation, state-management, or API changes.** Motion may add local UI state (`isPressed`, `isFocused`, shared values). It must not change what the app *does* — only how it *looks while doing it*.
3. **No new dependencies.** The toolkit runs on `react-native-reanimated` (4.1.1) + `react-native-worklets` (0.5.1) + `react-native-gesture-handler` (2.28.0) — all already installed.
4. **`Pressable` is the project standard.** Never introduce `TouchableOpacity` or `TouchableWithoutFeedback` for new motion. The only exception is a one-off `useState` + inline-`transform` style on the CssInterop-flagged surfaces (see §10).
5. **No `expo-haptics` yet.** Haptics were intentionally deferred to a follow-up — adding the package requires a native rebuild and was out of scope.
6. **Use the shared toolkit.** New motion should pull from `lib/motion.ts` and `components/motion/*`. Don't reinvent springs or scales ad hoc in screen files.

---

## 3. Architecture overview

```
lib/motion.ts                     ← token constants (durations, easings, springs, scales)
components/motion/
  ├─ hooks.ts                     ← usePressScale, useSwitchThumb, useActiveIndicator, useShake
  ├─ AnimatedPressable.tsx        ← Animated.createAnimatedComponent(Pressable) re-export
  ├─ Skeleton.tsx                 ← Skeleton / SkeletonRow / SkeletonText (loading placeholders)
  ├─ SwitchThumb.tsx              ← animated switch thumb (useSwitchThumb consumer)
  ├─ ActivePill.tsx               ← sliding-pill background for segmented controls
  ├─ FieldShell.tsx               ← form-field wrapper (focus / error / valid)
  ├─ FloatingEmptyIcon.tsx        ← gently floating empty-state icon
  └─ index.ts                     ← barrel export — import from "@/components/motion"
```

Callers import from the barrel:

```tsx
import {
  AnimatedPressable,
  usePressScale,
  FieldShell,
  ActivePill,
  SwitchThumb,
  Skeleton,
  FloatingEmptyIcon,
} from "@/components/motion";
import { motion } from "@/lib/motion";
```

**The reference pattern lives in `components/ui/PrimaryButton.tsx`.** Every `AnimatedPressable` wrapping mirrors it: `useSharedValue(0)` + `withSpring(1, motion.spring.press)` on press-in, `withSpring(0, …)` on press-out, `useAnimatedStyle` returns `{ transform: [{ scale: 1 - sv.value * (1 - targetScale) }] }`.

---

## 4. Design tokens — `lib/motion.ts`

All motion timings, easings, springs, and scale targets are **named by intent** so call sites read declaratively.

### 4.1 Durations (`motion.duration`, in ms)

| Token | Value | Use |
|---|---|---|
| `fast` | 120 | Quick reveals (checkmark fade-in, focus ring snap) |
| `medium` | 220 | Default for any `withTiming` that isn't a spring |
| `slow` | 340 | Reserved for hero transitions (none today) |

### 4.2 Easings (`motion.easing`)

Cubic-bezier tuples for `Easing.bezier(...)`:

| Token | Curve | Use |
|---|---|---|
| `standard` | `[0.2, 0, 0, 1]` | Default for `withTiming` |
| `decelerate` | `[0, 0, 0.2, 1]` | Things coming to rest (entering) |
| `accelerate` | `[0.2, 0, 1, 1]` | Things leaving |
| `emphasized` | `[0.2, 0, 0, 1.2]` | Reserved for hero transitions (none today) |

### 4.3 Springs (`motion.spring`)

| Token | Damping | Stiffness | Mass | Use |
|---|---|---|---|---|
| `press` | 18 | 320 | 0.6 | **Default for taps** — matches `PrimaryButton` exactly |
| `gentle` | 22 | 220 | 0.8 | Slider thumbs, dialog enter, subtle reveals |
| `indicator` | 20 | 260 | 0.7 | Segmented-control pill slides |
| `pop` | 12 | 380 | 0.5 | Heart save, check-mark pop — has a small overshoot |

### 4.4 Scales (`motion.scale`)

The value `usePressScale` springs *to* on press-in:

| Token | Value | Use |
|---|---|---|
| `pressed` | 0.96 | Standard for buttons / rows |
| `cardPressed` | 0.98 | Bigger surfaces (tutor cards, role cards) |
| `chipPressed` | 0.94 | Small chips, tight affordance |
| `iconPressed` | 0.85 | Icon-only buttons (heart, eye, dismiss) |
| `rowPressed` | 0.99 | List rows; barely perceptible |

---

## 5. Hooks — `components/motion/hooks.ts`

### 5.1 `usePressScale`

The most-used hook. Returns `{ onPressIn, onPressOut, animatedStyle }`. Bind to an `AnimatedPressable` and you get spring-scale press feedback.

```tsx
const { onPressIn, onPressOut, animatedStyle } = usePressScale({
  targetScale: motion.scale.chipPressed,   // default: motion.scale.pressed
  spring: motion.spring.press,             // default: motion.spring.press
});

<AnimatedPressable
  onPress={onPress}
  onPressIn={onPressIn}
  onPressOut={onPressOut}
  style={animatedStyle}
  className="..."
>
  ...
</AnimatedPressable>
```

**Gotcha — CssInterop caveat:** the wrapped `Pressable` must NOT carry `:active`, `:hover`, `:focus`, or `shadow-*` classes (it will print a `printUpgradeWarning` and may break at runtime). It CAN carry `bg-surface border border-border` and other "rest state" classes. If you need an `:active` style, render the bg on a sibling `View` and use this hook on the `Pressable`.

### 5.2 `useSwitchThumb(checked, trackWidth, thumbSize)`

Returns an animated style that springs a switch's thumb between off and on. Pair with the `SwitchThumb` primitive.

```tsx
<View className="w-11 h-6 rounded-pill bg-border">
  <SwitchThumb checked={available} trackWidth={44} thumbSize={20} />
</View>
```

The thumb rests at `left: 2`; `translateX` is added by the hook from 0 to `trackWidth - thumbSize - 2`.

### 5.3 `useActiveIndicator({ count, activeIndex, itemWidth, gap })`

Returns an animated `translateX` for a sliding active pill behind a row of equal-width tabs. Pair with the `ActivePill` primitive.

```tsx
<View onLayout={(e) => setRowWidth(e.nativeEvent.layout.width)} className="relative flex-row">
  <ActivePill
    activeIndex={activeTabIndex}
    itemWidth={rowWidth / 5}
    count={5}
    className="absolute top-0 bottom-0 bg-primary-light rounded-pill h-7"
  />
  {tabs.map((t) => (
    <Pressable key={t.key} className="flex-1 items-center justify-center" onPress={() => setActive(t.key)}>
      <Text>{t.label}</Text>
    </Pressable>
  ))}
</View>
```

**Gotcha — equal-width assumption:** the hook assumes every tab is `itemWidth` wide. For horizontally-scrolling or width-flexible pills (e.g. the `Notification.tsx` tabs), don't use `ActivePill` — fall back to a per-tab class-swap.

### 5.4 `useShake({ amplitude?, duration? })`

Returns `{ shake, animatedStyle }`. Call `shake()` to trigger a horizontal 3-cycle wobble.

```tsx
const { shake, animatedStyle } = useShake();

const onInvalidSubmit = () => shake();

<Animated.View style={animatedStyle}>
  <FieldShell error={true} ...>
    ...
  </FieldShell>
</Animated.View>
```

`FieldShell` already calls `shake()` internally on the false → true edge of its `error` prop, so you don't need to call it manually in form fields.

---

## 6. Primitives

### 6.1 `AnimatedPressable`

A thin re-export: `Animated.createAnimatedComponent(Pressable)`. The single blessed way to get a Reanimated-animated `Pressable` in this codebase.

```tsx
import { AnimatedPressable } from "@/components/motion";
```

### 6.2 `SwitchThumb`

Animated switch thumb. Consumes `useSwitchThumb` for you. Renders a circular `View` at `top: 2` that springs between left and right. **You provide the track** (the wrapping `View`); the thumb is positioned absolutely inside it.

### 6.3 `ActivePill`

Sliding-pill background for segmented controls. Consumes `useActiveIndicator`. The caller is responsible for the track and the tab labels; `ActivePill` is the absolutely-positioned indicator that slides behind the active tab.

### 6.4 `FieldShell`

A presentation wrapper for a form `TextInput`. Animates the wrapper's border across three states:

- **idle** — `border` token
- **focus** — `primary` token (smooth over `motion.duration.medium`)
- **error** — `danger` token (snap + one-shot shake on flip-from-false-to-true)

Also fades in a token-colored inline `check-circle` icon when `valid` is true. **Pure presentation** — no validation logic, no state management beyond visual signals.

Props:

| Prop | Type | Required | Purpose |
|---|---|---|---|
| `value` | `string` | yes | Drives checkmark visibility (the shell is stateless) |
| `error` | `boolean` | no | Drives border to `danger` and triggers shake once on the false → true edge |
| `valid` | `boolean` | no | Drives the inline checkmark |
| `children` | `ReactNode` | yes | The actual `TextInput` (the shell owns `onFocus` / `onBlur`) |
| `className` | `string` | no | Tailwind classes applied to the outer wrapper |
| `inputClassName` | `string` | no | Tailwind classes applied to the inner `TextInput` |

Gotcha: the `FieldShell` is a render-prop-style wrapper, so the `TextInput` lives inside it (not the other way around). See `screens/auth/EmailSignUp.tsx` for the canonical pattern.

### 6.5 `Skeleton`, `SkeletonRow`, `SkeletonText`

Pulsing grey placeholders for loading states. The base `View` is `bg-surface-muted rounded-md`; opacity pulses `0.5 → 1.0 → 0.5` over 1200ms via the legacy RN `Animated` API (no worklet overhead for a 1-second opacity blink). Pre-composed `SkeletonRow` and `SkeletonText` shapes cover the most common cases.

### 6.6 `FloatingEmptyIcon`

A gently floating empty-state icon. 2400ms full cycle (`-6 → 0 → -6`) driven by an infinite repeating sequence of timings on the UI thread. Reused by the StudentHome dashboard and the tutor_home "no profile" empty state so they feel like one design system.

Props:

| Prop | Type | Default | Purpose |
|---|---|---|---|
| `iconName` | `keyof typeof Ionicons.glyphMap` | — | Ionicons name |
| `iconColor` | `string` | — | Color (hex or token-resolved) |
| `iconBgClass` | `string` | — | Tailwind class for the circular bg |
| `size` | `number` | — | Icon size in px |
| `sizeClass` | `string` | `"w-14 h-14"` | Tailwind width/height for the circle |
| `floatDistance` | `number` | `6` | Translate-Y amplitude in px |
| `cycleMs` | `number` | `1200` | One half-cycle in ms (so a full cycle is `2 * cycleMs`) |

---

## 7. Patterns by surface

### 7.1 Buttons (any size)

```tsx
<AnimatedPressable
  accessibilityRole="button"
  onPress={onPress}
  onPressIn={onPressIn}
  onPressOut={onPressOut}
  style={animatedStyle}
  className="min-h-btn rounded-card items-center justify-center bg-primary"
>
  <Text className="text-button text-white">Save</Text>
</AnimatedPressable>
```

(That's `PrimaryButton` — use it for primary CTAs. For secondary buttons, copy the pattern but use `bg-surface border border-border` and a different text color.)

### 7.2 List items / rows

```tsx
const { onPressIn, onPressOut, animatedStyle } = usePressScale({ targetScale: motion.scale.rowPressed });
```

A 0.99 scale feels right for rows — barely perceptible, but enough to give the press a "weight."

### 7.3 Chips (small filters / tags)

```tsx
usePressScale({ targetScale: motion.scale.chipPressed });
```

0.94 is the right number for chips — it visibly compresses without being cartoony.

### 7.4 Icon-only buttons (heart, eye, dismiss)

```tsx
usePressScale({ targetScale: motion.scale.iconPressed });
```

0.85. For a "pop" on toggle, compose with a second shared value:

```tsx
const press = useSharedValue(0);
const pop = useSharedValue(0);
const animatedStyle = useAnimatedStyle(() => ({
  transform: [{ scale: 1 - press.value * 0.15 + pop.value * 0.25 }],
}));

const onPress = () => {
  pop.value = withSequence(withSpring(1, motion.spring.pop), withSpring(0, motion.spring.gentle));
  // ...toggle saved state
};
```

### 7.5 Segmented controls (3-5 equal-width tabs)

Use `ActivePill` + `useActiveIndicator`. Measure the parent width via `onLayout` and divide by `count`. See `components/shared/BottomNav.tsx`, `components/shared/AdminNav.tsx`, `components/TutorBottomBar.tsx`, `screens/student/Enrollment.tsx`, and `screens/tutor/tutor_home.tsx` (the `RequestsSubTabs` sub-component) for canonical examples.

### 7.6 Switches (toggles)

Use `SwitchThumb` + `useSwitchThumb`. Track dimensions are 44×24 (thumb 20×20) throughout the app. The track bg animates between `border` and `primary` via `interpolateColor` (token hex from `constants/colors.ts`).

### 7.7 Modals & dialogs

Drop `animationType="fade"` (or `"slide"`) from the `Modal` and drive the inner card's entrance yourself with two shared values:

- `backdrop` — `withTiming(0, { duration: motion.duration.fast }) → 0.5`
- `card` — `withSpring(0, motion.spring.gentle) → 1`

Card animated style: `{ opacity: card.value, transform: [{ scale: 0.94 + card.value * 0.06 }] }`.

See `components/forms/ConfirmDialog.tsx` and the `LightboxEnter` / `VideoLightboxEnter` sub-components in `components/ui/ImageViewer.tsx` and `components/ui/VideoViewer.tsx`.

### 7.8 Form fields

Wrap inputs in `FieldShell`. Compute `error` and `valid` from the existing form state (don't add new validators — reuse what's already in `lib/validation` or the screen's `errors` state).

For the password field with the eye toggle on the right, pass `valid={false}` to skip the inline checkmark (which would clash with the eye icon).

### 7.9 Loading states

Replace static `bg-surface-muted` placeholder `View`s with `Skeleton` / `SkeletonRow` / `SkeletonText`. They pulse on a 1200ms loop, so the user sees a real loading state instead of a grey flash.

### 7.10 Inline loading (button → spinner)

When an async action is in flight, swap the button's text for an `ActivityIndicator` while keeping `disabled={true}` so the user can't double-tap. Use the token's primary color:

```tsx
import { ActivityIndicator } from "react-native";
import { colors } from "@/constants/colors";

{isLoading ? (
  <ActivityIndicator size="small" color={colors.brand.primary} />
) : (
  <Text>Send</Text>
)}
```

`StudentHomeLogOut`, `EmailSignUp`'s `ResendButton` and `GoogleSignInButton` all use this pattern.

### 7.11 Empty states

Wrap the empty-state icon in `FloatingEmptyIcon`. The wrapper is a small circular `bg-{token}-light` (or similar), the icon sits centered, and the whole thing floats `-6 → 0 → -6` over 2400ms. Reuse the same component across surfaces so the design system reads as one.

---

## 8. Reference table — what uses what

| Surface | Hook / Primitive | Notes |
|---|---|---|
| `PrimaryButton` (reference) | inline Reanimated pattern | Do not modify |
| `SecondaryButton` | `usePressScale({ targetScale: motion.scale.pressed })` | |
| `ChipGroup` chips | `usePressScale({ targetScale: motion.scale.chipPressed })` | One hook per chip — extract sub-component |
| `MenuRow` | `usePressScale({ targetScale: motion.scale.rowPressed })` | |
| `TutorCard` (wide / compact-h) | `usePressScale({ targetScale: motion.scale.cardPressed })` | Heart save: `iconPressed` + pop |
| `AvatarUploader`, `DocumentUploader`, `LocationField` | `usePressScale({ targetScale: motion.scale.pressed })` | |
| `EditableField` Save + Cancel | `usePressScale({ targetScale: motion.scale.pressed })` | |
| `ReviewBanner` dismiss | `usePressScale({ targetScale: motion.scale.iconPressed })` | |
| `ImageViewer` thumbnail + close | `usePressScale` | |
| `VideoViewer` close | `usePressScale({ targetScale: motion.scale.iconPressed })` | |
| `ConfirmDialog` confirm + cancel | `usePressScale({ targetScale: motion.scale.pressed })` | Modal enter: see §7.7 |
| `FiltersSheet` chips | `usePressScale({ targetScale: motion.scale.chipPressed })` | Verified-only switch: `SwitchThumb` |
| `FiltersSheet` close | `usePressScale({ targetScale: motion.scale.iconPressed })` | |
| `AIChat` quick-prompt chips | `usePressScale({ targetScale: motion.scale.chipPressed })` | |
| `StudentHome` log-out | `usePressScale({ targetScale: motion.scale.pressed })` | Inline spinner pattern |
| `StudentHome` empty state | `FloatingEmptyIcon` | |
| `EmailSignUp` back / password eye | `usePressScale({ targetScale: motion.scale.iconPressed })` | Mode toggle: CssInterop caveat (see §10) |
| `EmailSignUp` resend / Google | `usePressScale({ targetScale: motion.scale.pressed })` | Inline spinner pattern |
| `RoleSelection` back | `usePressScale({ targetScale: motion.scale.pressed })` | |
| `RoleSelection` role cards | `usePressScale({ targetScale: 0.99 })` + checkmark pop | |
| `TutorCard` heart | `usePressScale({ targetScale: motion.scale.iconPressed })` + pop | |
| `tutor_home` availability switch | `SwitchThumb` + `useSwitchThumb` | Track color animates via `interpolateColor` |
| `tutor_home` "no profile" empty | `FloatingEmptyIcon` | |
| `tutor_home` requests sub-tabs | `ActivePill` + `useActiveIndicator` | 2-tab segmented control |
| `MapSearch` loading rows | `Skeleton` / `SkeletonRow` | |
| `EmailSignUp` email + password | `FieldShell` | Inline checkmark on email, skipped on password (eye icon) |
| `StudentProfileScreen` username + phone | `FieldShell` | |
| `TutorProfileScreen` username / phone / headline / bio / monthly rate | `FieldShell` | Bio is focus-only, no checkmark |
| `AdminProfile` fullName / roleTitle / phone | `FieldShell` | Save button: CssInterop caveat |
| `BottomNav` (5 tabs) | `ActivePill` + `useActiveIndicator` | Green `bg-primary-light` |
| `AdminNav` (5 tabs) | `ActivePill` + `useActiveIndicator` | Amber `bg-amber-light` |
| `TutorBottomBar` (4 tabs) | `ActivePill` + sliding underline | Underline centered via direct `useSharedValue` |
| `Enrollment` (3 tabs) | `ActivePill` + `useActiveIndicator` | |
| `ConfirmDialog` enter | Backdrop fade + card scale-spring | See §7.7 |
| `ImageViewer` / `VideoViewer` enter | `LightboxEnter` / `VideoLightboxEnter` | Same pattern |
| `Form field` error | `useShake` (called from `FieldShell` internally) | |

---

## 9. Verification checklist

Before merging a motion change, run through this:

- [ ] `npx tsc --noEmit` — no new errors (one pre-existing in `lib/verification/notifications.ts:66` is OK)
- [ ] `npx eslint .` — no new warnings on the files you touched
- [ ] Open Metro and confirm the `printUpgradeWarning` does **not** appear for any `AnimatedPressable` you wrapped. If it does, the wrapped `Pressable` still has `:active`, `:hover`, `:focus`, or `shadow-*` classes — strip them.
- [ ] If you wrapped a `TextInput` in `FieldShell`, confirm the focus border animates `border → primary` smoothly (no single-frame grey flash — if you see one, the `useAnimatedStyle` is missing a `useDerivedValue` or the initial value isn't set on the shared value)
- [ ] On a real device, tap the surface and confirm the motion is the one you intended (not a 0.5s lag, not a jarring pop, not a layout shift)
- [ ] Confirm no new Tailwind class on the wrapped `Pressable` would re-trigger the CssInterop warning

---

## 10. The CssInterop caveat

Two surfaces in the codebase deliberately use a `useState` + inline-`transform` style (not `useAnimatedStyle` on a `Pressable`) to dodge the CssInterop `printUpgradeWarning`:

1. **`screens/auth/EmailSignUp.tsx` L489–525** — the sign-up / log-in mode toggle. The `Pressable` carries `bg-surface border border-border` and the active `bg-surface border border-primary` (and other classes listed in the file's comment L469–487).
2. **`screens/admin/AdminProfile.tsx`** — the save button. Same class load.

**Rule for new motion in these files:** mirror the existing pattern. If you need Reanimated wrapping in these files, first strip the offending classes from the `Pressable` and render the bg / border on a separate sibling `View`. **Do not** wrap these specific `Pressable`s in `AnimatedPressable` while they still carry the offending classes.

For all other `Pressable`s in the codebase, `AnimatedPressable` + `usePressScale` is the right answer.

---

## 11. Out of scope (deliberately)

- **Haptics (`expo-haptics`)** — flagged for a follow-up. Adding the package requires a native rebuild and a `npx expo install`. When the follow-up lands, wire `Haptics.selectionAsync()` to the highest-importance `usePressScale` call sites (booking, message send, favorite, `ConfirmDialog` confirm, successful form submit). Don't add haptics to every tap — keep it sparse.
- **Splash / 3D / onboarding illustrations** — separate motion system. See `components/illustrations/*` and `components/premium/SplashParticleField.tsx`.
- **Notification tabs** (`screens/shared/Notification.tsx`) — these are horizontally-scrolling, width-flexible pills. The `ActivePill` pattern doesn't fit; the per-tab class-swap is left as-is.
- **`FiltersSheet` PanResponder drag** — the legacy `Animated` + `PanResponder` sheet drag is deliberate isolation. Only the filter chips and verified-only switch inside the sheet are in scope for motion (they are).
- **VerificationQueue Decided collapse header** — simple collapse toggle, not a segmented control. Left as-is.
- **New dependencies** — none. The motion system runs on Reanimated + worklets + gesture-handler, all already in `package.json`.

---

## 12. Files added or modified in this pass

**New files:**
- `lib/motion.ts` — token constants
- `components/motion/hooks.ts` — `usePressScale`, `useSwitchThumb`, `useActiveIndicator`, `useShake`
- `components/motion/AnimatedPressable.tsx` — `Animated.createAnimatedComponent(Pressable)` re-export
- `components/motion/Skeleton.tsx` — `Skeleton`, `SkeletonRow`, `SkeletonText`
- `components/motion/SwitchThumb.tsx` — animated switch thumb
- `components/motion/ActivePill.tsx` — sliding-pill background
- `components/motion/FieldShell.tsx` — form-field wrapper
- `components/motion/FloatingEmptyIcon.tsx` — gently floating empty-state icon
- `components/motion/index.ts` — barrel export
- `Documentation/02-Design-System/motion.md` — this file

**Modified files:** every interactive surface listed in §8.
