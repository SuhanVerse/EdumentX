/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/app/**/*.{js,jsx,ts,tsx}',
    './src/components/**/*.{js,jsx,ts,tsx}',
    './src/screens/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // ── Core palette ─────────────────────────────────────────────────────
        // Backward-compat alias: screens still use bg-night / text-night
        // Phase 2 (July 2026): ink family moved to Slate #0F172A
        night: '#0F172A',
        // Deep Slate — the "page well" under glass cards. One step
        // darker than `night` so translucent surfaces read as float.
        'night-deep': '#0A0F1E',
        // Semantic alias for the same value
        ink: '#0F172A',
        'ink-muted': '#6B7280',
        'surface-muted': '#F1ECE0',
        sand: '#F1ECE0',
        surface: '#FFFFFF',

        // Dark-mode glass surfaces (the Premium UI pass). These are
        // luminance-based so they read identically on any backdrop;
        // hairline borders are what give glass its crisp edge.
        glass: 'rgba(255, 255, 255, 0.06)',
        'glass-strong': 'rgba(255, 255, 255, 0.10)',
        'glass-border': 'rgba(255, 255, 255, 0.14)',
        'glass-faint': 'rgba(255, 255, 255, 0.03)',

        // Brand
        primary: {
          DEFAULT: '#2F5D50',
          dark: '#254B41',
          light: '#F1ECE0',
        },
        accent: {
          DEFAULT: '#E5A03B',
          light: '#FBEBCF',
          // Aliases used across the app (bg-accent-soft / text-accent-dark).
          // Kept as nested keys so nested-class resolution works in v3.
          soft: '#FBEBCF',
          dark: '#8B5E10',
        },
        // Amber brand family — alias of the accent tokens. Declared as
        // a nested object with a DEFAULT key (same shape as primary /
        // accent / verification / ai above) so both bare utilities
        // (bg-amber, text-amber, border-amber/30, bg-amber/10) and the
        // light variant (bg-amber-light) resolve. The PREVIOUS state
        // had NO amber key at all, so Tailwind fell back to its default
        // amber palette object ({50..950}) — an object without a
        // DEFAULT key silently drops every bare `amber` class (visible
        // as the "dim" map CTA and washed-out subject pills in the
        // Aug 9 screenshots). extend deep-merges, so the default
        // amber-500-style numeric shades remain available too.
        amber: {
          DEFAULT: '#E5A03B',
          light: '#FBEBCF',
        },
        verification: {
          DEFAULT: '#3F8A5A',
          dark: '#2D6B44',
          light: '#DCF0E4',
        },
        ai: {
          DEFAULT: '#4A7FA5',
          dark: '#2D5F80',
          light: '#EBF3F9',
          border: '#B8D4E8',
        },

        // Semantic
        success: '#3F8A5A',
        'success-text': '#2D6B44',
        'success-bg': '#DCF0E4',
        warning: '#E5A03B',
        'warning-text': '#8B5E10',
        'warning-bg': '#FBEBCF',
        danger: '#C1503D',
        'danger-text': '#8B3628',
        'danger-bg': '#F9E5E1',

        // Backgrounds
        background: {
          DEFAULT: '#FBF8F2',
          surface: '#FFFFFF',
          admin: '#F6F3EC',
        },

        // Text
        text: {
          DEFAULT: '#0F172A',
          primary: '#0F172A',
          secondary: '#6B7280',
          tertiary: '#0F172A',
          muted: '#6B7280',
          inverse: '#FFFFFF',
          link: '#2F5D50',
        },

        // Border
        border: {
          DEFAULT: '#E7E1D3',
          strong: '#6B7280',
          subtle: 'rgba(15, 23, 42, 0.05)',
        },

        // Onboarding illustration backgrounds
        'onb-map': '#F0EBE0',
        'onb-ai': '#EBF3F9',
        'onb-verify': '#DCF0E4',

        // Splash
        splash: '#0F172A',
        'splash-text': '#FBF8F2',
        'splash-track': 'rgba(251, 248, 242, 0.20)',
        // Logo tile on the splash canvas — one step off the night base
        // (previously the raw Tailwind default `slate-800`).
        'splash-tile': '#1E293B',
      },
      fontSize: {
        // ── New semantic scale ────────────────────────────────────────────────
        'display':       ['28px', { lineHeight: '34px', fontWeight: '700' }],
        'heading':       ['20px', { lineHeight: '26px', fontWeight: '600' }],
        'body':          ['15px', { lineHeight: '22px', fontWeight: '400' }],
        'body-sm':       ['13px', { lineHeight: '19px', fontWeight: '400' }],
        'caption':       ['13px', { lineHeight: '18px', fontWeight: '500' }],
        'label':         ['12px', { lineHeight: '16px', fontWeight: '600', letterSpacing: '0.4px' }],
        'micro':         ['10px', { lineHeight: '13px', fontWeight: '500' }],

        // ── Legacy named sizes (kept for backward compat) ─────────────────────
        'hero':          ['28px', { lineHeight: '34px', fontWeight: '500' }],
        'screen-title':  ['22px', { lineHeight: '29px', fontWeight: '500' }],
        'section-title': ['15px', { lineHeight: '22px', fontWeight: '500' }],
        'card-title':    ['14px', { lineHeight: '20px', fontWeight: '500' }],
        'header-title':  ['26px', { lineHeight: '34px', fontWeight: '500' }],
        'stepper-value': ['22px', { lineHeight: '28px', fontWeight: '500' }],
        'splash-mark':   ['30px', { lineHeight: '36px', fontWeight: '600' }],
        'splash-wordmark':['34px', { lineHeight: '40px', fontWeight: '500' }],
        'body-lg':       ['15px', { lineHeight: '24px', fontWeight: '400' }],
        'overline':      ['11px', { lineHeight: '15px', fontWeight: '500', letterSpacing: '0.6px' }],
        'button':        ['14px', { lineHeight: '20px', fontWeight: '500' }],
        'button-sm':     ['13px', { lineHeight: '18px', fontWeight: '500' }],
        'tagline':       ['16px', { lineHeight: '22px', fontWeight: '400' }],
      },
      spacing: {
        // 4px-based scale + named sizes from theme.ts
        'hairline':          '1px',
        'touch':             '44px',
        'input':             '48px',
        'input-lg':          '52px',
        'btn':               '52px',
        'btn-lg':            '56px',
        'btn-sm':            '40px',
        'avatar':            '40px',
        'avatar-card':       '60px',
        'avatar-profile':    '96px',
        'otp-box':           '44px',
        'otp-box-h':         '52px',
        'bottom-nav':        '64px',
      },
      borderRadius: {
        'xs':   '6px',
        'sm':   '8px',
        'md':   '12px',
        'card': '14px',
        'lg':   '18px',
        'xl':   '24px',
        'hero': '18px',
        'pill': '9999px',
      },
      minHeight: {
        'touch':    '44px',
        'btn':      '52px',
        'btn-lg':   '56px',
        'input':    '48px',
        'input-lg': '52px',
        'btn-sm':   '40px',
      },
      height: {
        'touch':           '44px',
        'btn':             '52px',
        'btn-lg':          '56px',
        'input':           '48px',
        'input-lg':        '52px',
        'btn-sm':          '40px',
        'avatar':          '40px',
        'avatar-card':     '60px',
        'avatar-profile':  '96px',
        'otp-box':         '44px',
        'otp-box-h':       '52px',
        'role-icon':       '52px',
        'role-check':      '22px',
        'splash-bar':      '104px',
        'splash-bar-h':    '4px',
        'chip-sm':         '38px',
        'pill-sm':         '36px',
        'cta-amber':       '56px',
        'avatar-uploader': '88px',
        'bio-area':        '120px',
        'role-card':       '92px',
        'phone-row':       '52px',
        'rate-row':        '52px',
      },
      width: {
        'btn':             '52px',
        'btn-sm':          '40px',
        'avatar-uploader': '88px',
        'role-icon':       '52px',
        'role-check':      '22px',
        'splash-bar':      '104px',
        'country-code':    '92px',
      },
      minWidth: {
        'country-code': '92px',
      },
      borderWidth: {
        'hairline':  '1px',
        'emphasis':  '1.5px',
        'thick':     '2px',
      },
    },
  },
  plugins: [],
};
