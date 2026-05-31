import { theme } from './theme';

export const typography = {
  heroTitle: theme.typography.heroTitle,
  screenTitle: theme.typography.screenTitle,
  sectionTitle: theme.typography.sectionTitle,
  cardTitle: theme.typography.cardTitle,
  body: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: theme.typography.body.fontWeight,
  },
  onboardingBody: {
    fontSize: 15,
    lineHeight: 24,
    fontWeight: theme.typography.body.fontWeight,
  },
  caption: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: theme.typography.bodySmall.fontWeight,
  },
  overline: theme.typography.overline,
  button: theme.typography.button,
} as const;
