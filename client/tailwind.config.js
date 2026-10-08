/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        focus: {
          50: "#f0f9ff",
          500: "#0ea5e9",
          700: "#0369a1",
        },
      },
    },
  },
  plugins: [],
};
