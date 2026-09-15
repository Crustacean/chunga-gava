"use client";

import { useState } from "react";
import { useLanguage } from "@/lib/i18n";
import { useMapFilters } from "@/lib/mapFilters";
import type { County } from "@/types";

/** Border-bottom is always 5px so nothing shifts on interaction; only its color changes
 * (invisible/header-matching for "Countrywide", red once a specific county is selected).
 * The drawer toggle is bound only to the label area and chevron (TASK.md line 744) - the
 * viewport/total notification pills are separate sibling controls, not nested inside either
 * toggle button, so clicking them never opens/closes the drawer. */
export default function LocationDropdown() {
  const { t } = useLanguage();
  const { counties, selectedCounty, selectCountyFromDropdown, viewportItemCount, totalItemCount } =
    useMapFilters();
  const [isOpen, setIsOpen] = useState(false);

  function handleSelect(county: County | null) {
    setIsOpen(false);
    selectCountyFromDropdown(county);
  }

  function closeOnBlur() {
    window.setTimeout(() => setIsOpen(false), 150);
  }

  // Hide the yellow pill once every available item for this selection is already on screen.
  const showViewportPill = totalItemCount > 0 && viewportItemCount !== totalItemCount;

  return (
    <div className="relative flex-1">
      <div
        className={`cg-dropdown-font flex w-full items-center gap-1.5 border-b-[5px] px-2 py-1.5 text-base font-semibold text-gray-800 dark:text-gray-100 ${
          selectedCounty ? "border-kenya-red" : "border-white dark:border-gray-900"
        }`}
      >
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          onBlur={closeOnBlur}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
        >
          {selectedCounty ? (
            <span className="flex min-w-0 items-center gap-1.5">
              <span aria-hidden="true">{selectedCounty.emoji}</span>
              <span className="truncate">{selectedCounty.name}</span>
            </span>
          ) : (
            <span>{t("countrywide")}</span>
          )}
        </button>

        {showViewportPill && (
          <span
            title="Items visible in the current map view"
            className="flex-shrink-0 rounded-full bg-systemYellow px-1.5 py-0.5 text-[10px] font-bold leading-none text-black"
          >
            {viewportItemCount}
          </span>
        )}
        <button
          type="button"
          onClick={() => handleSelect(null)}
          title="Show every item countrywide"
          className="flex-shrink-0 rounded-full bg-systemRed px-1.5 py-0.5 text-[10px] font-bold leading-none text-white"
        >
          {t("allLabel")} {totalItemCount}
        </button>

        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          onBlur={closeOnBlur}
          aria-label="Toggle county list"
          className="flex-shrink-0 text-xs"
        >
          ▾
        </button>
      </div>

      {isOpen && (
        <ul className="cg-dropdown-font absolute left-0 top-full z-30 mt-1 max-h-80 w-full min-w-[16rem] overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-xl dark:border-gray-700 dark:bg-gray-800">
          <li>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(null)}
              className="flex w-full items-center gap-3 px-4 py-[0.9rem] text-left hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <span aria-hidden="true" className="flex-shrink-0 text-xl leading-none">
                🌍
              </span>
              <span className="flex flex-col">
                <span className="font-bold text-gray-900 dark:text-gray-100">{t("countrywide")}</span>
                <span className="text-xs font-normal text-secondaryLabel">{t("countrywideTagline")}</span>
              </span>
            </button>
          </li>
          {counties.map((county) => (
            <li key={county.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(county)}
                className="flex w-full items-center gap-3 px-4 py-[0.9rem] text-left hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <span aria-hidden="true" className="flex-shrink-0 text-xl leading-none">
                  {county.emoji}
                </span>
                <span className="flex flex-col">
                  <span className="font-bold text-gray-900 dark:text-gray-100">{county.name}</span>
                  <span className="text-xs font-normal text-secondaryLabel">{county.tagline}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

