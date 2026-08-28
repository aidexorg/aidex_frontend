/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Vazirmatn', 'system-ui', 'sans-serif'],
      },
      colors: {
        sage: {
          50: '#f4f8f5',
          100: '#e4efe6',
          200: '#c8dfd0',
          300: '#a8cdb4',
          400: '#8fb898',
          500: '#7a9e7e',
          600: '#5f8263',
          700: '#4a6752',
          800: '#3d5440',
          900: '#334536',
        },
        brand: {
          navy: '#1e2a3a',
          navyLight: '#2a3a4f',
        },
        primary: {
          50: '#f4f8f5',
          100: '#e4efe6',
          200: '#c8dfd0',
          300: '#a8cdb4',
          400: '#8fb898',
          500: '#7a9e7e',
          600: '#5f8263',
          700: '#4a6752',
          800: '#3d5440',
          900: '#334536',
        },
      },
      borderRadius: {
        card: '1rem',
      },
    },
  },
  plugins: [],
};
