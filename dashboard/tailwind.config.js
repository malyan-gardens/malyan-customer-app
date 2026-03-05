/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'green-deep': '#0d3b2c',
        'green-mid': '#1a5c42',
        'green-light': '#2d8a5e',
        'green-soft': '#e8f5ef',
        sand: '#f5f0e6',
        gold: '#c9a227',
      },
      fontFamily: {
        sans: ['Tajawal', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
