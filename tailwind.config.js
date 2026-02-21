/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        clinical: {
          critical: '#dc2626',
          high: '#f97316',
          moderate: '#eab308',
          normal: '#22c55e',
          info: '#3b82f6',
        },
        ward: {
          bg: 'var(--ward-bg, #f8fafc)',
          card: 'var(--ward-card, #ffffff)',
          border: 'var(--ward-border, #e2e8f0)',
          text: 'var(--ward-text, #0f172a)',
          muted: 'var(--ward-muted, #64748b)',
          subtle: 'var(--ward-subtle, #f1f5f9)',
          hover: 'var(--ward-hover, #f8fafc)',
        },
        mode: {
          'accent-light': 'var(--mode-accent-light)',
          'accent-text': 'var(--mode-accent-text)',
          'accent-dot': 'var(--mode-accent-dot)',
          'accent-border': 'var(--mode-accent-border)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.65rem', { lineHeight: '0.85rem' }],
      },
      animation: {
        'pulse-critical': 'criticalPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'shimmer': 'shimmer 1.5s infinite',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'slide-out-right': 'slideOutRight 0.25s ease-in forwards',
        'spin-slow': 'spin 2s linear infinite',
      },
      keyframes: {
        criticalPulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        slideUp: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        slideOutRight: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(100%)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(400%)' },
        },
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.06), 0 2px 4px -2px rgb(0 0 0 / 0.04)',
        'float': '0 8px 30px rgb(0 0 0 / 0.08)',
        'glow-primary': '0 0 20px rgba(59, 130, 246, 0.15)',
        'glow-critical': '0 0 20px rgba(220, 38, 38, 0.15)',
        'inner-border': 'inset 0 0 0 1px rgb(0 0 0 / 0.05)',
      },
      spacing: {
        'sidebar': '260px',
        'sidebar-collapsed': '72px',
      },
      transitionTimingFunction: {
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
    },
  },
  plugins: [],
}
