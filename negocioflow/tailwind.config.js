/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0F172A",
        muted: "#64748B",
        line: "#E2E8F0",
        surface: "#F8FAFC",
        brand: {
          50: "#ECFDF5",
          100: "#D1FAE5",
          500: "#059669",
          600: "#047857",
          700: "#065F46",
        },
        amber: {
          50: "#FFFBEB",
          500: "#F59E0B",
        },
      },
    },
  },
  plugins: [],
};
