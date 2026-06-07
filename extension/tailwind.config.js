/** @type {import('tailwindcss').Config} */
module.exports = {
  mode: "jit",
  darkMode: "class",
  content: [
    "./popup.tsx",
    "./content.tsx",
    "./components/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          950: "#020617",
          900: "#0f172a",
          850: "#1e293b",
          800: "#334155",
        }
      }
    },
  },
  plugins: [],
}
