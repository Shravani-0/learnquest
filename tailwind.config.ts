import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        quest: {
          // Neutrals — Industrial Brutalism (asphalt/steel/chalk), aliased to the --c-* system
          bg:           '#181818',
          surface:      '#1F1F1F',
          'surface-2':  '#292927',
          'surface-3':  '#323230',
          border:       '#30302E',
          'border-2':   '#454542',
          // Nintendo accent palette
          red:          '#FF3C3C',
          'red-dark':   '#881A1A',
          blue:         '#00A0E0',
          'blue-dark':  '#006A94',
          // Legacy — kept for game pages
          purple:       '#a855f7',
          'purple-dark':'#7c3aed',
          'purple-light':'#c084fc',
          cyan:         '#06b6d4',
          green:        '#22c55e',
          amber:        '#f59e0b',
          // Text scale
          text:         '#F2F0E6',
          'text-2':     '#B7B7B0',
          'text-3':     '#8C8C84',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'Inter', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-sans)', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      animation: {
        'float':           'float 6s ease-in-out infinite',
        'cursor-blink':    'cursor-blink 1s step-end infinite',
        'grid-shift':      'grid-shift 30s linear infinite',
        'fade-in':         'fade-in 0.5s ease-out',
        'slide-up':        'slide-up 0.5s ease-out',
        'glow-pulse':      'glow-pulse 3s ease-in-out infinite',
        'shimmer':         'shimmer 2.5s linear infinite',
        'scale-in':        'scale-in 0.3s ease-out',
      },
      keyframes: {
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':       { transform: 'translateY(-8px)' },
        },
        'cursor-blink': {
          '0%, 100%': { opacity: '1' },
          '50%':       { opacity: '0' },
        },
        'grid-shift': {
          '0%':   { backgroundPosition: '0 0' },
          '100%': { backgroundPosition: '60px 60px' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%':   { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '0.3' },
          '50%':       { opacity: '0.7' },
        },
        'shimmer': {
          '0%':   { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        'scale-in': {
          '0%':   { opacity: '0', transform: 'scale(0.92)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'xp-fill': {
          from: { width: '0% !important' },
        },
      },
      backgroundImage: {
        // Updated grid to match new neutral border color
        'grid-pattern': "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0.5H60M0.5 0V60' stroke='%232A2A2A' stroke-opacity='0.9'/%3E%3C/svg%3E\")",
      },
      boxShadow: {
        // ── Tactile button shadows (Nintendo press-depth feel) ──
        'btn-red':       '0 4px 0 #881A1A',
        'btn-red-sm':    '0 2px 0 #881A1A',
        'btn-dark':      '0 4px 0 #0A0A0A',
        'btn-dark-sm':   '0 2px 0 #0A0A0A',
        'btn-white':     '0 4px 0 rgba(0,0,0,0.35)',
        'btn-white-sm':  '0 2px 0 rgba(0,0,0,0.35)',
        'btn-nav':       '0 3px 0 #0A0A0A',
        'btn-nav-sm':    '0 1px 0 #0A0A0A',
        // ── Card shadows ──
        'card':          '0 2px 16px rgba(0,0,0,0.45)',
        'card-hover':    '0 12px 40px rgba(0,0,0,0.65)',
        // ── Legacy glow shadows (game pages) ──
        'glow-purple':   '0 0 20px rgba(168,85,247,0.25), 0 0 60px rgba(168,85,247,0.08)',
        'glow-blue':     '0 0 20px rgba(56,189,248,0.25),  0 0 60px rgba(56,189,248,0.08)',
        'glow-cyan':     '0 0 20px rgba(6,182,212,0.25),   0 0 60px rgba(6,182,212,0.08)',
        'glow-green':    '0 0 20px rgba(34,197,94,0.25),   0 0 60px rgba(34,197,94,0.08)',
        'glow-amber':    '0 0 20px rgba(251,191,36,0.25),  0 0 60px rgba(251,191,36,0.08)',
      },
    },
  },
  plugins: [],
}

export default config
