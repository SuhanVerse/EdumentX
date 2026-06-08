/**
 * EdumentX Tamagui configuration — ROOT copy.
 *
 * The Tamagui Babel and Metro plugins resolve the config from the project
 * root by default. This file is a byte-equivalent copy of
 * `constants/tamagui.config.ts`. Keep the two files in sync.
 *
 * For a detailed explanation of the token mapping, see
 * `constants/tamagui.config.ts`.
 */

import { createTamagui, createTokens } from 'tamagui';
import { createInterFont } from '@tamagui/font-inter';
import { animations } from '@tamagui/config/reanimated';

import { theme as masterTheme } from './constants/theme';

const interFont = createInterFont();

const tokens = createTokens({
  color: {
    brandPrimary: masterTheme.colors.brand.primary,
    brandPrimaryDark: masterTheme.colors.brand.primaryDark,
    brandPrimaryLight: masterTheme.colors.brand.primaryLight,
    brandAccent: masterTheme.colors.brand.accent,
    brandVerification: masterTheme.colors.brand.verification,
    brandVerificationDark: masterTheme.colors.brand.verificationDark,
    brandVerificationLight: masterTheme.colors.brand.verificationLight,
    brandAi: masterTheme.colors.brand.ai,
    brandAiDark: masterTheme.colors.brand.aiDark,
    brandAiLight: masterTheme.colors.brand.aiLight,
    brandAiBorder: masterTheme.colors.brand.aiBorder,
    brandSplash: masterTheme.colors.brand.splash,
    brandSplashText: masterTheme.colors.brand.splashText,
    brandSplashTrack: masterTheme.colors.brand.splashTrack,
    semSuccess: masterTheme.colors.semantic.success,
    semSuccessText: masterTheme.colors.semantic.successText,
    semSuccessBackground: masterTheme.colors.semantic.successBackground,
    semWarning: masterTheme.colors.semantic.warning,
    semWarningText: masterTheme.colors.semantic.warningText,
    semWarningBackground: masterTheme.colors.semantic.warningBackground,
    semWarningSubtle: masterTheme.colors.semantic.warningSubtle,
    semDanger: masterTheme.colors.semantic.danger,
    semDangerDark: masterTheme.colors.semantic.dangerDark,
    semDangerText: masterTheme.colors.semantic.dangerText,
    semDangerBackground: masterTheme.colors.semantic.dangerBackground,
    semDangerSubtle: masterTheme.colors.semantic.dangerSubtle,
    semDangerBorder: masterTheme.colors.semantic.dangerBorder,
    semInfo: masterTheme.colors.semantic.info,
    semInfoBackground: masterTheme.colors.semantic.infoBackground,
    bgPage: masterTheme.colors.background.page,
    bgAdminPage: masterTheme.colors.background.adminPage,
    bgSurface: masterTheme.colors.background.surface,
    bgDisabled: masterTheme.colors.background.disabled,
    textPrimary: masterTheme.colors.text.primary,
    textSecondary: masterTheme.colors.text.secondary,
    textTertiary: masterTheme.colors.text.tertiary,
    textMuted: masterTheme.colors.text.muted,
    textDisabled: masterTheme.colors.text.disabled,
    textInverse: masterTheme.colors.text.inverse,
    textLink: masterTheme.colors.text.link,
    borderDefault: masterTheme.colors.border.default,
    borderStrong: masterTheme.colors.border.strong,
    borderSubtle: masterTheme.colors.border.subtle,
    borderCard: masterTheme.colors.border.card,
    onbMapBackground: masterTheme.colors.onboarding.mapBackground,
    onbAiBackground: masterTheme.colors.onboarding.aiBackground,
    onbVerifyBackground: masterTheme.colors.onboarding.verifyBackground,
    // Short aliases — preferred in components (Sophisticated Slate & Amber)
    night: masterTheme.colors.brand.primary,
    amber: masterTheme.colors.brand.accent,
    sand: masterTheme.colors.background.page,
    surface: masterTheme.colors.background.surface,
    ai: masterTheme.colors.brand.ai,
    aiLight: masterTheme.colors.brand.aiLight,
    verificationLight: masterTheme.colors.brand.verificationLight,
  },
  space: {
    true: 16,
    0.5: 2,
    1: 4,
    1.5: 6,
    2: 8,
    2.5: 10,
    3: 12,
    3.5: 14,
    4: 16,
    5: 20,
    6: 24,
    7: 28,
    8: 32,
    9: 36,
    10: 40,
    12: 48,
    16: 64,
    20: 80,
  },
  size: {
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    true: 44,
    xs: 6,
    sm: 8,
    md: 10,
    card: 12,
    lg: 14,
    hero: 18,
    full: 999,
    touchTarget: 44,
    inputHeight: 48,
    inputHeightLarge: 52,
    primaryButton: 52,
    primaryButtonLarge: 56,
    compactButton: 40,
    bottomNav: 64,
    avatar: 40,
    avatarCard: 60,
    avatarProfile: 96,
    otpBox: 44,
    otpBoxHeight: 52,
  },
  radius: {
    true: 10,
    xs: 6,
    sm: 8,
    md: 10,
    card: 12,
    lg: 14,
    hero: 18,
    full: 999,
  },
  zIndex: {
    0: 0,
    1: 100,
    2: 200,
    3: 300,
    4: 400,
    5: 500,
  },
});

const config = createTamagui({
  tokens,
  themes: {
    light: {
      background: tokens.color.bgPage,
      backgroundHover: tokens.color.brandPrimaryLight,
      backgroundPress: tokens.color.brandPrimaryLight,
      backgroundFocus: tokens.color.bgSurface,
      backgroundTransparent: 'transparent',
      color: tokens.color.textPrimary,
      colorHover: tokens.color.textPrimary,
      colorPress: tokens.color.textPrimary,
      colorFocus: tokens.color.textPrimary,
      borderColor: tokens.color.borderDefault,
      borderColorHover: tokens.color.borderStrong,
      borderColorFocus: tokens.color.brandPrimary,
      borderColorPress: tokens.color.brandPrimary,
      placeholderColor: tokens.color.textMuted,
    },
  },
  fonts: {
    body: interFont,
    heading: interFont,
  },
  animations,
  defaultFont: 'body',
  shouldAddPrefersColorThemes: false,
  themeConfig: {
    initialColorScheme: 'light',
  },
});

export type AppConfig = typeof config;

declare module 'tamagui' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface TamaguiCustomConfig extends AppConfig {}
}

export default config;
