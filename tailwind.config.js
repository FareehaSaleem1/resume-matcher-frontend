/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        primary: '#3b82f6',
        secondary: '#facc15',
        muted: '#f3f4f6',
        darkBg: '#111827',
        darkCard: '#1f2937',
      },
    },
  },
  plugins: [],
}
