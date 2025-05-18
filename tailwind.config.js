/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./public/**/*.{html,js}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        indigo: {
          50: '#f5f7ff',
          100: '#ebf0ff',
          200: '#d1deff',
          300: '#a6c1ff',
          400: '#729dff',
          500: '#2463eb',
          600: '#1d4ed8',
          700: '#1e40af',
          800: '#1e3a8a',
          900: '#172554',
        },
      },
    },
  },
  plugins: [],
}
