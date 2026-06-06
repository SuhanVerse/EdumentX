import { StyleSheet } from 'react-native';

export const theme = {
  colors: {
    brand: {
      primary: '#0F172A', // Night Slate
      primaryDark: '#020617',
      primaryLight: '#F1F5F9', // Sand
      accent: '#B45309', // Polished Copper
      admin: '#0F172A',
      primaryBorder: '#E2E8F0',
      verification: '#059669', // Forest Emerald
      verificationDark: '#065F46',
      verificationLight: '#ECFDF5',
      ai: '#4F46E5',
      aiDark: '#312E81',
      aiLight: '#EEF2FF',
      aiBorder: '#C7D2FE',
      splash: '#0F172A',
      splashText: '#F1F5F9',
      splashTrack: 'rgba(241, 245, 249, 0.12)',
    },
    semantic: {
      success: '#059669',
      successText: '#064E3B',
      successBackground: '#DCFCE7',
      warning: '#D97706',
      warningText: '#92400E',
      warningBackground: '#FEF3C7',
      warningSubtle: '#FFFBEB',
      danger: '#DC2626',
      dangerDark: '#991B1B',
      dangerText: '#7F1D1D',
      dangerBackground: '#FEE2E2',
      dangerSubtle: '#FEF2F2',
      dangerBorder: '#FECACA',
      info: '#0F172A',
      infoBackground: '#F1F5F9',
    },
    background: {
      page: '#F1F5F9', // Sand
      adminPage: '#F8FAFC',
      surface: '#FFFFFF',
      disabled: '#F1F5F9',
    },
    text: {
      primary: '#0F172A', // Night
      secondary: '#475569',
      tertiary: '#1E293B',
      muted: '#94A3B8',
      disabled: '#CBD5E1',
      inverse: '#FFFFFF',
      link: '#B45309', // Copper link for professional flair
    },
    border: {
      default: '#E2E8F0',
      strong: '#94A3B8',
      subtle: 'rgba(15, 23, 42, 0.04)',
      card: 'rgba(15, 23, 42, 0.06)',
    },
    onboarding: {
      mapBackground: '#F1F5F9', // Sand
      aiBackground: '#EEF2FF', // AI Purple tint
      verifyBackground: '#ECFDF5', // Emerald tint
    },
  },
  spacing: {
    xxs: 2,
    xs: 4,
    s: 6,
    sm: 8,
    md: 10,
    lg: 12,
    xl: 14,
    page: 16,
    section: 18,
    screen: 20,
    xxl: 22,
    xxxl: 24,
    huge: 32,
  },
  radii: {
    xs: 6,
    sm: 8,
    md: 10,
    card: 12,
    lg: 14,
    hero: 18,
    circle: 999,
  },
  typography: {
    brandTitle: {
      fontSize: 30,
      lineHeight: 36,
      fontWeight: '500',
    },
    heroTitle: {
      fontSize: 28,
      lineHeight: 34,
      fontWeight: '500',
    },
    screenTitle: {
      fontSize: 22,
      lineHeight: 29,
      fontWeight: '500',
    },
    sectionTitle: {
      fontSize: 15,
      lineHeight: 22,
      fontWeight: '500',
    },
    cardTitle: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '500',
    },
    body: {
      fontSize: 13,
      lineHeight: 20,
      fontWeight: '400',
    },
    bodySmall: {
      fontSize: 12,
      lineHeight: 18,
      fontWeight: '400',
    },
    caption: {
      fontSize: 11,
      lineHeight: 15,
      fontWeight: '400',
    },
    micro: {
      fontSize: 10,
      lineHeight: 13,
      fontWeight: '500',
    },
    overline: {
      fontSize: 11,
      lineHeight: 15,
      fontWeight: '500',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    button: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '500',
    },
    buttonSmall: {
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '500',
    },
    sessionCode: {
      fontSize: 32,
      lineHeight: 32,
      fontWeight: '500',
      letterSpacing: 5,
    },
  },
  borders: {
    hairlineWidth: StyleSheet.hairlineWidth,
    cardWidth: StyleSheet.hairlineWidth,
    inputWidth: StyleSheet.hairlineWidth,
    dashedWidth: 1,
  },
  sizes: {
    touchTarget: 44,
    inputHeight: 48,
    inputHeightLarge: 52,
    primaryButtonHeight: 52,
    compactButtonHeight: 40,
    bottomNavHeight: 64,
    avatarSmall: 40,
    avatarCard: 60,
    otpBoxWidth: 44,
    otpBoxHeight: 52,
  },
  components: {
    card: {
      backgroundColor: '#FFFFFF',
      borderColor: '#E5E7EB',
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      padding: 16,
    },
    input: {
      backgroundColor: '#FFFFFF',
      borderColor: '#E5E7EB',
      borderRadius: 10,
      borderWidth: StyleSheet.hairlineWidth,
      minHeight: 48,
      paddingHorizontal: 12,
    },
    primaryButton: {
      backgroundColor: '#0F172A',
      borderRadius: 12,
      minHeight: 52,
    },
    secondaryButton: {
      backgroundColor: '#F1F5F9',
      borderRadius: 10,
      minHeight: 44,
    },
    segmentedRail: {
      backgroundColor: '#F1F5F9',
      borderRadius: 999,
      padding: 4,
    },
  },
  badges: {
    active: {
      backgroundColor: '#DCFCE7',
      color: '#059669',
    },
    verified: {
      backgroundColor: '#DCFCE7',
      color: '#059669',
    },
    approved: {
      backgroundColor: '#DCFCE7',
      color: '#059669',
    },
    pending: {
      backgroundColor: '#FEF3C7',
      color: '#D97706',
    },
    past: {
      backgroundColor: '#F1F5F9',
      color: '#475569',
    },
    info: {
      backgroundColor: '#F1F5F9',
      color: '#0F172A',
    },
    suspended: {
      backgroundColor: '#FEE2E2',
      color: '#DC2626',
    },
    rejected: {
      backgroundColor: '#FEE2E2',
      color: '#DC2626',
    },
  },
} as const;

export type Theme = typeof theme;
