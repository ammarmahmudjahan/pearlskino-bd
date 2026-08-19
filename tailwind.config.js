export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Fraunces", "serif"],
        sans: ["Manrope", "sans-serif"],
        label: ["Space Grotesk", "sans-serif"],
      },
      colors: {
        void: "#0a0810",
        surface: "#17131f",
        surface2: "#1e1929",
        ink: "#f7f2ea",
        gold: "#cda15c",
        gold2: "#e8c98a",
        rose: "#e2a6b5",
        violet: "#a68bd6",
        jade: "#8fae95",
      },
    },
  },
  plugins: [],
};
