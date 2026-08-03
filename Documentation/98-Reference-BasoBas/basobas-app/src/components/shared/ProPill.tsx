import { View, Text } from 'react-native';
import { ComponentType } from 'react';
import { Crown, Shield } from 'lucide-react-native';

type Variant = 'light' | 'solid';
type Size = 'sm' | 'md';

type IconComponent = ComponentType<{ size: number; color: string; strokeWidth: number }>;

type Props = {
  /** Light = green-tint pill (used on cards & badges). Solid = dark green pill. */
  variant?: Variant;
  /** 'md' (default) = pill with a leading icon, used on plan / profile / success screens.
   *  'sm'          = compact lock pill with shield icon, used on the AI Preferences row. */
  size?: Size;
  label?: string;
  /** Optional icon override for the `md` size. Defaults to `Crown`. */
  icon?: IconComponent;
  className?: string;
};

/**
 * `ProPill` — shared "PRO" / "PRO MEMBER" badge.
 *
 * Variants:
 *  - light: green-tint background, green text — used on the upgrade card, profile,
 *           plan, and success screens.
 *  - solid: dark green background, white text — used on the dark "PRO" trigger.
 *
 * Sizes:
 *  - md (default): pill with a leading icon (defaults to Crown).
 *  - sm: compact lock pill (shield + "PRO") — indicates a locked Pro feature.
 */
export const ProPill = ({
  variant = 'light',
  size = 'md',
  label = 'PRO',
  icon: Icon,
  className = '',
}: Props) => {
  if (size === 'sm') {
    return (
      <View
        accessibilityLabel="Pro feature locked"
        className={`flex-row items-center rounded-pill bg-brand-light px-2.5 py-[3px] ${className}`}>
        <Shield size={10} color="#1A6B4A" strokeWidth={2.4} fill="#1A6B4A" />
        <Text className="ml-1 font-sans text-[10px] font-semibold uppercase tracking-wide text-brand">
          {label}
        </Text>
      </View>
    );
  }

  const isSolid = variant === 'solid';
  const DisplayIcon = Icon ?? Crown;

  return (
    <View
      className={`flex-row items-center rounded-pill px-3 py-[3px] ${
        isSolid ? 'bg-brand' : 'border border-brand/20 bg-brand-light'
      } ${className}`}>
      <DisplayIcon size={10} color={isSolid ? '#FFFFFF' : '#1A6B4A'} strokeWidth={2.5} />
      <Text
        className={`ml-1 font-sans text-[10px] font-semibold uppercase ${
          isSolid ? 'text-white' : 'text-brand'
        }`}>
        {label}
      </Text>
    </View>
  );
};

ProPill.displayName = 'ProPill';
