import { theme } from './theme';

export const colors = {
  brand: {
    primary: theme.colors.brand.primary,
    primaryLight: theme.colors.brand.primaryLight,
    verification: theme.colors.brand.verification,
    ai: theme.colors.brand.ai,
    splash: theme.colors.brand.splash,
    splashText: theme.colors.brand.splashText,
    splashTrack: theme.colors.brand.splashTrack,
  },
  semantic: {
    success: theme.colors.semantic.success,
    warning: theme.colors.semantic.warning,
    danger: theme.colors.semantic.danger,
    info: theme.colors.brand.admin,
  },
  background: {
    page: theme.colors.background.page,
    surface: theme.colors.background.surface,
  },
  text: {
    primary: theme.colors.text.primary,
    onboardingTitle: theme.colors.text.primary,
    secondary: theme.colors.text.secondary,
    muted: theme.colors.text.muted,
    inverse: theme.colors.text.inverse,
  },
  border: {
    default: theme.colors.border.default,
    strong: theme.colors.border.strong,
  },
  onboarding: theme.colors.onboarding,
} as const;
