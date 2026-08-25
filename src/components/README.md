# Components

Reusable UI components built on **React Native + NativeWind (Tailwind CSS)**. **All components use design tokens from `tailwind.config.js` — never hardcode hex values or pixel sizes.**

## Folder Structure

```
components/
├── forms/        # Form-specific composites (AvatarUploader, ChipGroup, etc.)
└── illustrations/# Pure-SVG onboarding illustrations (Discover, AiMatch, Verified)
```

The `ui/`, `layout/`, `feedback/`, and `domain/` folders are reserved for
future extraction as the app grows. Today the screens in `screens/` are
small enough to read top-to-bottom, and inlining the markup keeps the
Tailwind props adjacent to the data they style.

## Style Rules

- ✅ Import layout primitives from `react-native`: `View`, `Text`, `Pressable`, `TextInput`, `ScrollView`
- ✅ Apply styling with `className="..."` (Tailwind classes)
- ✅ Use design tokens via `tailwind.config.js` — e.g. `bg-night`, `text-text-secondary`, `rounded-card`, `p-4`
- ✅ Use `@expo/vector-icons` for icons (current standard — was Ionicons, may move to `lucide-react-native` later)
- ✅ Always include `accessibilityRole` and `accessibilityLabel` on interactive elements
- ✅ Minimum 44px touch target via `min-h-touch` (44)
- ❌ No `import { ... } from 'tamagui'` — Tamagui has been removed
- ❌ No inline `style={{ color: '#0F172A' }}` — use a Tailwind class instead
- ❌ No magic numbers for spacing — use the scale (`p-2`, `gap-4`, `mt-3`)

## Example: PrimaryButton

```tsx
// components/ui/PrimaryButton.tsx
import { Pressable, Text } from 'react-native';
import { LucideIcon } from 'lucide-react-native';

export interface PrimaryButtonProps {
  children: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'accent';  // 'primary' = night, 'accent' = copper
  size?: 'md' | 'lg';
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
}

export function PrimaryButton({
  children, onPress, disabled, loading, variant = 'primary', size = 'md',
}: PrimaryButtonProps) {
  const baseHeight = size === 'lg' ? 'min-h-btn-lg' : 'min-h-btn';
  const bg = variant === 'accent' ? 'bg-amber' : 'bg-night';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityState={{ disabled, busy: loading }}
      className={`${bg} ${baseHeight} rounded-card items-center justify-center active:opacity-90`}
    >
      <Text className="text-button text-white">{children}</Text>
    </Pressable>
  );
}
```

## Tokens

⚠️ This README previously published a hand-copied token table whose hex
values had drifted from the real palette (wrong amber, sand, border,
text-muted, radius…). Rather than maintain a second copy that rots,
treat these as the ONLY sources of truth:

- Class-facing tokens: `tailwind.config.js` (`theme.extend`)
- Raw hex mirror (SVG illustrations + unreachable style slots):
  `src/constants/colors.ts`
- Typed style constants (StatusBar / shadows): `src/constants/theme.ts`

If a value here ever disagrees with those files, THOSE WIN.

## References

- `tailwind.config.js` — design tokens
- `constants/theme.ts` — JS source-of-truth (kept for SVG illustrations + any
  inline-style fallbacks; not consumed by components)
- `constants/colors.ts` — narrow hex constants for SVG primitives only
