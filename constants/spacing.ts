import { theme } from './theme';

export const spacing = {
  xs: theme.spacing.xs,
  sm: theme.spacing.sm,
  md: theme.spacing.lg,
  page: theme.spacing.page,
  lg: theme.spacing.screen,
  xl: theme.spacing.xxxl,
  xxl: theme.spacing.huge,
} as const;
