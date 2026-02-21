/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Vinland Saga palette
        ink: {
          DEFAULT: '#0e0c08',
          900: '#0e0c08',
          800: '#1a1710',
          700: '#252118',
          600: '#312b20',
        },
        parchment: {
          DEFAULT: '#e8d5a3',
          100: '#f5eed8',
          200: '#eedcb4',
          300: '#e8d5a3',
          400: '#d4b87a',
          500: '#b8944f',
        },
        blood: {
          DEFAULT: '#8b1a1a',
          light: '#c0392b',
          bright: '#e74c3c',
        },
        frost: {
          DEFAULT: '#5b8fa8',
          light: '#7fb3cc',
          dark: '#3d6b80',
        },
        gold: {
          DEFAULT: '#c9a84c',
          light: '#e5c46a',
          dark: '#9b7d32',
        },
        ash: '#4a4540',
        mist: '#8c8070',
      },
      fontFamily: {
        norse: ['var(--font-cinzel)', 'serif'],
        body: ['var(--font-crimson)', 'Georgia', 'serif'],
        mono: ['var(--font-jetbrains)', 'monospace'],
      },
      backgroundImage: {
        'saga-grain': "url('/grain.png')",
        'rune-border': "url('/rune-border.svg')",
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease forwards',
        'slide-up': 'slideUp 0.5s ease forwards',
        'flicker': 'flicker 4s infinite',
        'breathe': 'breathe 3s ease-in-out infinite',
        'rune-glow': 'runeGlow 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
        slideUp: {
          from: { opacity: 0, transform: 'translateY(20px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        flicker: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.85 },
          '75%': { opacity: 0.95 },
        },
        breathe: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.02)' },
        },
        runeGlow: {
          '0%, 100%': { textShadow: '0 0 10px rgba(201, 168, 76, 0.5)' },
          '50%': { textShadow: '0 0 20px rgba(201, 168, 76, 0.9), 0 0 40px rgba(201, 168, 76, 0.4)' },
        },
      },
    },
  },
  plugins: [],
}
