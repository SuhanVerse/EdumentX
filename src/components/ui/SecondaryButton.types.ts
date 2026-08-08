/**
 * Shared types for `SecondaryButton.tsx`. Kept in a sibling file so the
 * component module can stay focused on render logic.
 */
import type { ReactNode } from 'react';

export type SecondaryButtonProps = {
  /** Visible label. */
  label: string;
  onPress: () => void;
  /** `'outline'` (bordered surface) or `'ghost'` (text only). */
  variant?: 'outline' | 'ghost';
  /** `'md'` (52) or `'sm'` (40). */
  size?: 'md' | 'sm';
  /** Show spinner + disable. */
  loading?: boolean;
  disabled?: boolean;
  /** Optional icon node rendered to the left of the label. */
  leftIcon?: ReactNode;
  /** When true, the text is rendered in `text-danger` for destructive actions. */
  destructive?: boolean;
  /** Override the default accessibility label if `label` isn't enough. */
  accessibilityLabel?: string;
  /** Extra Tailwind classes appended to the button. */
  className?: string;
};

export type SecondaryButtonState = {
  bg: string;
  label: string;
};
