module.exports = {
  purge: [
    "./pages/**/*.{js,ts,jsx,tsx}",     // all files in pages/ directory
    "./components/**/*.{js,ts,jsx,tsx}", // all files in components/
  ],
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {},
  },
  variants: {
    extend: {},
  },
  plugins: [],
};
