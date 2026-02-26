/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          red: '#FF0000',
          darkred: '#CC0000',
          black: '#000000',
          card: '#111111',
          border: '#222222',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.8s ease forwards',
        'scale-in': 'scaleIn 0.3s ease forwards',
        'pulse-red': 'pulseRed 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'scale(0.8)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        pulseRed: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(255,0,0,0.4)' },
          '50%': { boxShadow: '0 0 0 20px rgba(255,0,0,0)' },
        },
      },
    },
  },
  plugins: [],
};
