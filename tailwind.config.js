/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        heading: ["Prompt", "sans-serif"],
      },
      screens: {
        xs: "480px",
      },
      // Outras configurações...
    },
  },
  plugins: [],
};
