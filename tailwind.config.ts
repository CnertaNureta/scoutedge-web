import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        /* ── Night Match: deep navy-black base ── */
        background: '#0a0e1a',
        surface: '#0a0e1a',
        'surface-dim': '#060912',
        'surface-bright': '#1e293b',
        'surface-container-lowest': '#060912',
        'surface-container-low': '#0f1422',
        'surface-container': '#141b2d',
        'surface-container-high': '#1a2332',
        'surface-container-highest': '#222d40',
        'surface-variant': '#1e293b',
        'surface-tint': '#00ff87',
        'on-surface': '#e2e8f0',
        'on-surface-variant': '#94a3b8',
        'on-background': '#e2e8f0',

        /* ── Neon green primary — energy & victory ── */
        primary: '#00ff87',
        'primary-container': '#003d20',
        'primary-fixed': '#00ff87',
        'primary-fixed-dim': '#00cc6a',
        'on-primary': '#003d20',
        'on-primary-container': '#00ff87',
        'on-primary-fixed': '#001a0d',
        'on-primary-fixed-variant': '#005c30',
        'inverse-primary': '#006e3a',

        /* ── Hot magenta secondary — passion & urgency ── */
        secondary: '#ff4081',
        'secondary-container': '#e90052',
        'secondary-fixed': '#ffd5e0',
        'secondary-fixed-dim': '#ff4081',
        'on-secondary': '#ffffff',
        'on-secondary-container': '#fff0f3',
        'on-secondary-fixed': '#3b0014',
        'on-secondary-fixed-variant': '#7a0028',

        /* ── Gold tertiary — champions & premium ── */
        tertiary: '#ffd700',
        'tertiary-container': '#4a3d00',
        'tertiary-fixed': '#ffe16d',
        'tertiary-fixed-dim': '#ffd700',
        'on-tertiary': '#3a3000',
        'on-tertiary-container': '#ffd700',
        'on-tertiary-fixed': '#221b00',
        'on-tertiary-fixed-variant': '#544600',

        /* ── Electric cyan accent ── */
        accent: '#04f5ff',
        'accent-dim': '#00b8c2',

        error: '#ff6b6b',
        'error-container': '#93000a',
        'on-error': '#ffffff',
        'on-error-container': '#ffdad6',
        outline: '#334155',
        'outline-variant': '#1e293b',
        'inverse-surface': '#e2e8f0',
        'inverse-on-surface': '#0f172a',
      },
      fontFamily: {
        headline: ['var(--font-bebas)', 'Impact', 'sans-serif'],
        body: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        label: ['var(--font-oswald)', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
      },
      animation: {
        'pulse-slow': 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-fast': 'pulse 0.8s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in-up': 'fadeInUp 0.6s ease-out forwards',
        'bar-fill': 'barFill 1.2s ease-out forwards',
        'cheer-burst': 'cheerBurst 0.6s ease-out forwards',
        'neon-glow': 'neonGlow 3s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2s ease-in-out infinite',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        barFill: {
          '0%': { width: '0%' },
          '100%': { width: 'var(--bar-width)' },
        },
        cheerBurst: {
          '0%': {
            opacity: '1',
            transform: 'translate(-50%, -50%) rotate(var(--burst-angle)) translateY(0) scale(1)',
          },
          '100%': {
            opacity: '0',
            transform: 'translate(-50%, -50%) rotate(var(--burst-angle)) translateY(-36px) scale(0)',
          },
        },
        neonGlow: {
          '0%, 100%': { boxShadow: '0 0 15px rgba(0, 255, 135, 0.3)' },
          '50%': { boxShadow: '0 0 30px rgba(0, 255, 135, 0.6), 0 0 60px rgba(0, 255, 135, 0.2)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
      },
    },
  },
  plugins: [],
}

export default config
