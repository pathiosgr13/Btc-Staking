/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        gold: {
          50:  '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        btc: {
          orange: '#f7931a',
          gold:   '#ffd700',
          dark:   '#03000b',
          card:   '#0e0020',
          border: '#2a0045',
          muted:  '#8878aa',
        },
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #f7931a 0%, #ffd700 50%, #f7931a 100%)',
        'dark-gradient': 'linear-gradient(180deg, #03000b 0%, #07000f 50%, #03000b 100%)',
        'card-gradient': 'linear-gradient(135deg, rgba(255,215,0,0.06) 0%, rgba(247,147,26,0.03) 100%)',
        'glow-gradient': 'radial-gradient(ellipse at center, rgba(247,147,26,0.15) 0%, transparent 70%)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-gold':    'pulseGold 2s ease-in-out infinite',
        'float':         'float 3s ease-in-out infinite',
        'shimmer':       'shimmer 2s linear infinite',
        'spin-slow':     'spin 8s linear infinite',
        'glow':          'glow 2s ease-in-out infinite alternate',
        'counter':       'counter 0.5s ease-out',
        'slide-up':      'slideUp 0.5s ease-out',
        'fade-in':       'fadeIn 0.4s ease-out',
      },
      keyframes: {
        pulseGold: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(247,147,26,0.3)' },
          '50%':      { boxShadow: '0 0 40px rgba(247,147,26,0.6)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-8px)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        glow: {
          from: { textShadow: '0 0 10px rgba(247,147,26,0.5)' },
          to:   { textShadow: '0 0 20px rgba(255,215,0,0.8), 0 0 40px rgba(247,147,26,0.5)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
      },
      boxShadow: {
        'gold':       '0 0 20px rgba(247,147,26,0.3)',
        'gold-lg':    '0 0 40px rgba(247,147,26,0.4)',
        'card':       '0 4px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(100,0,180,0.2)',
        'inner-gold': 'inset 0 1px 0 rgba(255,215,0,0.1)',
        'neon-pink':  '0 0 16px rgba(255,0,170,0.5)',
      },
    },
  },
  plugins: [],
};
