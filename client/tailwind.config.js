/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        studio: {
          bg: '#0a0b0e',
          card: '#12141a',
          hover: '#1a1d26',
          elevated: '#161922',
          border: 'rgba(255, 255, 255, 0.08)',
        },
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
      },
      boxShadow: {
        'glow': '0 0 25px rgba(99, 102, 241, 0.25)',
        'glow-lg': '0 0 40px rgba(99, 102, 241, 0.35)',
      },
    },
  },
  plugins: [],
}
