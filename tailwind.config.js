/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './screens/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Sophisticated Slate & Amber palette — single source of truth
        night: '#0F172A',
        amber: {
          DEFAULT: '#B45309',
          light: '#FEF3C7',
        },
        sand: '#F1F5F9',
        surface: '#FFFFFF',

        // Brand
        primary: {
          DEFAULT: '#0F172A',
          dark: '#020617',
          light: '#F1F5F9',
        },
        accent: {
          DEFAULT: '#B45309',
        },
        verification: {
          DEFAULT: '#047857',
          dark: '#065F46',
          light: '#ECFDF5',
        },
        ai: {
          DEFAULT: '#4F46E5',
          dark: '#312E81',
          light: '#EEF2FF',
          border: '#C7D2FE',
        },

        // Semantic
        success: '#047857',
        'success-text': '#064E3B',
        'success-bg': '#DCFCE7',
        warning: '#B45309',
        'warning-text': '#92400E',
        'warning-bg': '#FEF3C7',
        danger: '#DC2626',
        'danger-text': '#7F1D1D',
        'danger-bg': '#FEE2E2',

        // Backgrounds
        background: {
          DEFAULT: '#F1F5F9',
          surface: '#FFFFFF',
          admin: '#F8FAFC',
        },

        // Text
        text: {
          DEFAULT: '#0F172A',
          primary: '#0F172A',
          secondary: '#475569',
          tertiary: '#1E293B',
          muted: '#64748B',
          inverse: '#FFFFFF',
          link: '#B45309',
        },

        // Border
        border: {
          DEFAULT: '#E2E8F0',
          strong: '#64748B',
          subtle: 'rgba(15, 23, 42, 0.04)',
        },

        // Onboarding illustration backgrounds
        'onb-map': '#F1F5F9',
        'onb-ai': '#EEF2FF',
        'onb-verify': '#ECFDF5',

        // Splash
        splash: '#0F172A',
        'splash-text': '#F1F5F9',
        'splash-track': 'rgba(241, 245, 249, 0.12)',
      },
      fontSize: {
        // Mapped from constants/typography.ts
        'hero': ['28px', { lineHeight: '34px', fontWeight: '500' }],
        'screen-title': ['22px', { lineHeight: '29px', fontWeight: '500' }],
        'section-title': ['15px', { lineHeight: '22px', fontWeight: '500' }],
        'card-title': ['14px', { lineHeight: '20px', fontWeight: '500' }],
        'header-title': ['26px', { lineHeight: '34px', fontWeight: '500' }],
        'stepper-value': ['22px', { lineHeight: '28px', fontWeight: '500' }],
        'splash-mark': ['30px', { lineHeight: '36px', fontWeight: '600' }],
        'splash-wordmark': ['34px', { lineHeight: '40px', fontWeight: '500' }],
        'body': ['13px', { lineHeight: '20px', fontWeight: '400' }],
        'body-lg': ['15px', { lineHeight: '24px', fontWeight: '400' }],
        'body-sm': ['12px', { lineHeight: '18px', fontWeight: '400' }],
        'caption': ['11px', { lineHeight: '15px', fontWeight: '400' }],
        'micro': ['10px', { lineHeight: '13px', fontWeight: '500' }],
        'overline': ['11px', { lineHeight: '15px', fontWeight: '500', letterSpacing: '0.6px' }],
        'button': ['14px', { lineHeight: '20px', fontWeight: '500' }],
        'button-sm': ['13px', { lineHeight: '18px', fontWeight: '500' }],
        'tagline': ['16px', { lineHeight: '22px', fontWeight: '400' }],
      },
      spacing: {
        // 4px-based scale + named sizes from theme.ts
        'hairline': '1px',
        'touch': '44px',
        'input': '48px',
        'input-lg': '52px',
        'btn': '52px',
        'btn-lg': '56px',
        'btn-sm': '40px',
        'avatar': '40px',
        'avatar-card': '60px',
        'avatar-profile': '96px',
        'otp-box': '44px',
        'otp-box-h': '52px',
        'bottom-nav': '64px',
      },
      borderRadius: {
        'xs': '6px',
        'sm': '8px',
        'md': '10px',
        'card': '12px',
        'lg': '14px',
        'hero': '18px',
        'pill': '9999px',
      },
      minHeight: {
        'touch': '44px',
        'btn': '52px',
        'btn-lg': '56px',
        'input': '48px',
        'input-lg': '52px',
        'btn-sm': '40px',
      },
      height: {
        'touch': '44px',
        'btn': '52px',
        'btn-lg': '56px',
        'input': '48px',
        'input-lg': '52px',
        'btn-sm': '40px',
        'avatar': '40px',
        'avatar-card': '60px',
        'avatar-profile': '96px',
        'otp-box': '44px',
        'otp-box-h': '52px',
        'role-icon': '52px',
        'role-check': '22px',
        'splash-bar': '104px',
        'splash-bar-h': '4px',
        'chip-sm': '38px',
        'pill-sm': '36px',
        'cta-amber': '56px',
        'avatar-uploader': '88px',
        'bio-area': '120px',
        'role-card': '92px',
        'phone-row': '52px',
        'rate-row': '52px',
      },
      width: {
        'btn': '52px',
        'btn-sm': '40px',
        'avatar-uploader': '88px',
        'role-icon': '52px',
        'role-check': '22px',
        'splash-bar': '104px',
        'country-code': '92px',
      },
      minWidth: {
        'country-code': '92px',
      },
      borderWidth: {
        'hairline': '1px',
        'emphasis': '1.5px',
        'thick': '2px',
      },
    },
  },
  plugins: [],
};