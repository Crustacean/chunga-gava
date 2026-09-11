"use client";

import { useState } from "react";
import { useLanguage } from "@/lib/i18n";
import type { Layer } from "@/lib/mapFilters";
import { useMapFilters } from "@/lib/mapFilters";

/** Border-bottom is always 5px so nothing shifts on interaction; only its color changes
 * (invisible/header-matching by default, red once a non-default option is active). */
export default function CategoryDropdown() {
  const { t } = useLanguage();
  const { layer, setLayer } = useMapFilters();
  const [isOpen, setIsOpen] = useState(false);
  const isDefault = layer === "leaders";

  const options: { value: Layer; label: string; icon: string }[] = [
    { value: "leaders", label: t("leadersOption"), icon: "🧑‍💼" },
    { value: "services", label: t("servicesOption"), icon: "🏥" },
    { value: "expenditure", label: t("expenditureOption"), icon: "🏗️" },
  ];

  const showingLabels: Record<Layer, string> = {
    leaders: t("showingLeaders"),
    services: t("showingServices"),
    expenditure: t("showingExpenditure"),
  };

  return (
    <div className="relative flex-1">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        onBlur={() => window.setTimeout(() => setIsOpen(false), 150)}
        className={`flex w-full items-center justify-between gap-1.5 border-b-[5px] px-2 py-1.5 text-sm font-semibold text-gray-800 dark:text-gray-100 ${
          isDefault
            ? "border-white dark:border-gray-900"
            : "border-kenya-red"
        }`}
      >
        {showingLabels[layer]}
        <span aria-hidden="true" className="text-xs">
          ▾
        </span>
      </button>

      {isOpen && (
        <ul className="absolute left-0 top-full z-30 mt-1 w-full min-w-[14rem] overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-xl dark:border-gray-700 dark:bg-gray-800">
          {options.map((option) => (
            <li key={option.value}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setLayer(option.value);
                  setIsOpen(false);
                }}
                className="flex w-full items-center gap-3 px-4 py-3 text-left font-bold text-gray-900 hover:bg-gray-50 dark:text-gray-100 dark:hover:bg-gray-700"
              >
                <span aria-hidden="true">{option.icon}</span>
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
