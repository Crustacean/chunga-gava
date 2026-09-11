"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";
import { useMapFilters } from "@/lib/mapFilters";
import type { County } from "@/types";

/** Border-bottom is always 5px so nothing shifts on interaction; only its color changes
 * (invisible/header-matching for "Countrywide", red once a specific county is selected). */
export default function LocationDropdown() {
  const { t } = useLanguage();
  const { requestCounty } = useMapFilters();
  const [counties, setCounties] = useState<County[]>([]);
  const [selected, setSelected] = useState<County | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    api.get<County[]>("/api/counties").then(setCounties).catch(() => setCounties([]));
  }, []);

  function handleSelect(county: County | null) {
    setIsOpen(false);
    // Exact-match guard: re-selecting the already-active county would otherwise re-run
    // the full cinematic pan/zoom for no reason.
    if (selected?.id === county?.id) return;
    setSelected(county);
    requestCounty(county);
  }

  return (
    <div className="relative flex-1">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        onBlur={() => window.setTimeout(() => setIsOpen(false), 150)}
        className={`flex w-full items-center justify-between gap-1.5 border-b-[5px] px-2 py-1.5 text-sm font-semibold text-gray-800 dark:text-gray-100 ${
          selected ? "border-kenya-red" : "border-white dark:border-gray-900"
        }`}
      >
        {selected ? (
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true">{selected.emoji}</span> {selected.name}
          </span>
        ) : (
          <span>{t("countrywide")}</span>
        )}
        <span aria-hidden="true" className="text-xs">
          ▾
        </span>
      </button>

      {isOpen && (
        <ul className="absolute left-0 top-full z-30 mt-1 max-h-80 w-full min-w-[16rem] overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-xl dark:border-gray-700 dark:bg-gray-800">
          <li>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(null)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left font-bold text-gray-900 hover:bg-gray-50 dark:text-gray-100 dark:hover:bg-gray-700"
            >
              <span aria-hidden="true">🌍</span>
              {t("countrywide")}
            </button>
          </li>
          {counties.map((county) => (
            <li key={county.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(county)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left font-bold text-gray-900 hover:bg-gray-50 dark:text-gray-100 dark:hover:bg-gray-700"
              >
                <span aria-hidden="true">{county.emoji}</span>
                {county.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
