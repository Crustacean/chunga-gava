"use client";

import { useTheme } from "@/lib/theme";

/** Circular header toggle; only the "target" emoji for the mode you'd switch TO is shown. */
export default function DarkModeToggle() {
  const { theme, toggleTheme } = useTheme();
  const icon = theme === "dark" ? "☀️" : "🌙";
  const label = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className="cg-header-circle-btn border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
    >
      <span aria-hidden="true">{icon}</span>
    </button>
  );
}
