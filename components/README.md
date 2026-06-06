# Components

Reusable UI components built on **Tamagui** primitives. **All components in this folder use tokens from `constants/theme.ts` — never hardcode hex values or pixel sizes.**

## Folder Structure

```
components/
├── ui/          # Atomic, reusable primitives (buttons, inputs, chips)
├── layout/      # Compositional layout components (sidebar, bottom tab, top bar)
├── feedback/    # User feedback components (toast, alert, skeleton, empty state)
├── domain/      # Feature-specific composed components (TutorCard, EnrollRequestCard)
└── forms/       # (legacy) Form-specific components — migrate to ui/ + use react-hook-form
```

## Naming Conventions

- **One component per file** — file name matches component name
- **PascalCase** for component files
- **camelCase** for utility files (e.g., `tokens.ts`, `helpers.ts`)
- **No default exports** — use named exports only
- **Props type** is named `<ComponentName>Props` and exported for re-use

## Style Rules

- ✅ Import from `tamagui` for layout primitives
- ✅ Use theme tokens: `<YStack p="$4" bg="$surface" rounded="$card">`
- ✅ Use `lucide-react-native` for icons (NOT Ionicons, NOT emoji)
- ✅ Add `accessibilityLabel` to all interactive elements
- ✅ Minimum 44px touch target
- ❌ No `import { View, Text, Pressable }` from `react-native` — use Tamagui
- ❌ No inline `style={{ color: '#0F172A' }}` — use token like `color="$primary"`
- ❌ No magic numbers for spacing — use `$1`, `$2`, `$4` etc.

## Example: PrimaryButton

```tsx
// components/ui/PrimaryButton.tsx
import { Button, Text, Spinner, styled } from 'tamagui';
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
  children, onPress, disabled, loading, variant = 'primary', size = 'md', icon: Icon, iconPosition = 'left',
}: PrimaryButtonProps) {
  return (
    <Button
      onPress={onPress}
      disabled={disabled || loading}
      bg={variant === 'accent' ? '$accent' : '$primary'}
      color="$textInverse"
      minHeight={size === 'lg' ? '$primaryButtonLarge' : '$primaryButton'}
      rounded="$card"
      px="$5"
      pressStyle={{ opacity: 0.8, scale: 0.98 }}
      disabledStyle={{ bg: '$borderStrong', color: '$textMuted' }}
      accessible
      accessibilityRole="button"
      accessibilityLabel={typeof children === 'string' ? children : undefined}
      accessibilityState={{ disabled, busy: loading }}
    >
      {loading ? <Spinner color="$textInverse" /> : (
        <Button.Text>
          {Icon && iconPosition === 'left' ? <Icon size={18} /> : null}
          {' '}{children}{' '}
          {Icon && iconPosition === 'right' ? <Icon size={18} /> : null}
        </Button.Text>
      )}
    </Button>
  );
}
```

## Component Inventory

### `ui/` (15 components)
- `PrimaryButton` — main CTA
- `SecondaryButton` — outlined/ghost variant
- `IconButton` — square button with icon only
- `TextField` — labeled text input with error/helper
- `PasswordField` — TextField + show/hide toggle
- `PhoneField` — country code box + phone input
- `OtpInput` — 6-digit grid with auto-advance
- `Chip` — single-select pill
- `Card` — surface card with optional elevation
- `Avatar` — circle image or initials placeholder
- `Badge` — status pill (active/pending/verified/rejected/info)
- `ScreenHeader` — title + back button + optional right slot
- `BackButton` — chevron + "Back" text
- `PasswordStrengthBar` — colored bar + label
- `StepIndicator` — "Step 3 of 4" pill + dots

### `layout/` (5 components)
- `ScreenContainer` — SafeArea + ScrollView + KeyboardAvoid wrapper
- `TopBar` — page title + back + right actions
- `BottomTab` — mobile 5-tab navigation
- `Sidebar` — desktop sidebar with role switcher
- `RoleSwitcher` — sheet to switch between Student/Tutor/Admin

### `feedback/` (5 components)
- `Toast` — notification banner
- `Alert` — custom modal (use Tamagui Dialog)
- `Skeleton` — loading placeholder
- `EmptyState` — illustration + message + CTA
- `ErrorBoundary` — class component for error catching

### `domain/` (composed)
- `TutorCard` — tutor summary card (used in lists, map sheets)
- `RoleCard` — large selectable role card (auth flow)
- `EnrollRequestCard` — request with accept/decline actions
- `ChatBubble` — message bubble (sent/received variants)
- `StatCard` — KPI card with label, value, icon
- `MapPin` — custom map marker

## References

- `constants/theme.ts` — design tokens
- `constants/tamagui.config.ts` — Tamagui configuration
- `Documentation/06-Prompts/Claude-Code/00-MASTER-CLAUDE-CODE-PROMPT.md` — migration plan
- `Documentation/06-Prompts/Figma-Make/00-MASTER-FIGMA-MAKE-PROMPT.md` — visual specs
