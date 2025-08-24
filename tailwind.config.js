/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",      // all files in app/ directory
    "./components/**/*.{js,ts,jsx,tsx}", // all files in components/
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
