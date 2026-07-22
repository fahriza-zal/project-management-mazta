/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js}'],
  theme: {
    extend: {
      colors: {
        // Primary remapped to violet (#653EF1) — every `primary-*` class adopts it.
        // 600 = DEFAULT is the brand anchor used by `bg-brand`/gradients.
        primary: {
          DEFAULT: '#653EF1',
          50: '#F3F0FE',
          100: '#E7E0FD',
          200: '#CFC1FB',
          300: '#B29BF8',
          400: '#8E6DF4',
          500: '#7650F2',
          600: '#653EF1',
          700: '#5327D4',
          800: '#4420A8',
          900: '#371B84',
        },
        // Accent (indigo) — used as the far end of gradients.
        accent: {
          DEFAULT: '#4F46E5',
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
        },
        secondary: {
          DEFAULT: '#7650F2',
        },
        success: '#22C55E',
        warning: '#F59E0B',
        danger: '#EF4444',
        info: '#3B82F6',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      },
      boxShadow: {
        soft: '0 1px 2px 0 rgba(15, 23, 42, 0.04), 0 1px 3px 0 rgba(15, 23, 42, 0.06)',
        card: '0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)',
        'card-hover': '0 4px 12px rgba(15, 23, 42, 0.08), 0 2px 4px rgba(15, 23, 42, 0.04)',
        dropdown: '0 10px 30px rgba(15, 23, 42, 0.12), 0 2px 8px rgba(15, 23, 42, 0.06)',
        // Frosted-glass depth: soft ambient + crisp top highlight (kept subtle).
        glass: '0 4px 16px -6px rgba(55, 27, 132, 0.10), inset 0 1px 0 0 rgba(255, 255, 255, 0.5)',
        'glass-lg': '0 12px 32px -12px rgba(55, 27, 132, 0.16), inset 0 1px 0 0 rgba(255, 255, 255, 0.55)',
        glow: '0 4px 12px -4px rgba(101, 62, 241, 0.30)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #653EF1 0%, #4F46E5 100%)',
      },
      fontSize: {
        caption: ['0.75rem', { lineHeight: '1rem' }],
      },
    },
  },
  plugins: [],
}
