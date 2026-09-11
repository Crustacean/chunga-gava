import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        kenya: {
          black: "#000000",
          red: "#BB0000",
          green: "#006600",
          white: "#FFFFFF",
        },
      },
    },
  },
  plugins: [],
};

export default config;
