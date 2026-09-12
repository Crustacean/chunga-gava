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
        // Apple HIG system color tokens (see app/globals.css for the light/dark CSS variables).
        systemGreen: "var(--color-system-green)",
        systemRed: "var(--color-system-red)",
        systemYellow: "var(--color-system-yellow)",
        systemOrange: "var(--color-system-orange)",
        systemTeal: "var(--color-system-teal)",
        systemPurple: "var(--color-system-purple)",
        systemGray: "var(--color-system-gray)",
      },
    },
  },
  plugins: [],
};

export default config;
