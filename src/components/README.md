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

## Token map (tailwind.config.js → class)

| Concept | Tailwind class | Value |
|---|---|---|
| Night (primary) | `bg-night`, `text-night`, `border-night` | `#0F172A` |
| Amber (accent) | `bg-amber`, `text-amber` | `#B45309` |
| Sand (page bg) | `bg-background` | `#F1F5F9` |
| Surface (card) | `bg-surface` | `#FFFFFF` |
| Verification (green) | `bg-verification` | `#047857` |
| AI (indigo) | `bg-ai` | `#4F46E5` |
| Border default | `border-border` | `#E2E8F0` |
| Text primary | `text-text-primary` | `#0F172A` |
| Text muted | `text-text-muted` | `#64748B` |
| Card radius (12) | `rounded-card` | 12px |
| Pill radius (999) | `rounded-pill` | 9999px |
| Primary button (52) | `min-h-btn` | 52px |
| Touch target (44) | `min-h-touch` | 44px |
| Hero title | `text-hero` | 28/34 medium |

## References

- `tailwind.config.js` — design tokens
- `constants/theme.ts` — JS source-of-truth (kept for SVG illustrations + any
  inline-style fallbacks; not consumed by components)
- `constants/colors.ts` — narrow hex constants for SVG primitives only
