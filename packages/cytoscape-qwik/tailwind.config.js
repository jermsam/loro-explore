/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/shared/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class', // or 'media' for media-query based
  theme: {
    extend: {},
  },
  plugins: [],
};
