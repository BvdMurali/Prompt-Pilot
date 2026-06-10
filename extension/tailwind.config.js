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
        brand: {
          start: "#7C3AED",
          mid: "#8B5CF6",
          end: "#06B6D4",
        },
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
