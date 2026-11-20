/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'system-ui', 'Segoe UI', 'sans-serif'] },
      colors: {
        brand: {
          50: '#eefbfb', 100: '#d3f4f4', 200: '#aee8ea', 300: '#78d6da', 400: '#3dbcc3',
          500: '#219fa8', 600: '#1c808d', 700: '#1c6774', 800: '#1e545e', 900: '#1d464f', 950: '#0d282e',
        },
      },
      keyframes: {
        pop: { '0%': { opacity: 0, transform: 'translateY(8px) scale(.98)' }, '100%': { opacity: 1, transform: 'none' } },
      },
      animation: { pop: 'pop .18s ease-out' },
    },
  },
  plugins: [],
};
