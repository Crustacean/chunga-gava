"use client";

import { CATEGORY_ICON_BY_NAME, categoryGlyphMarkup } from "@/lib/categoryIcons";
import { useLanguage } from "@/lib/i18n";
import type { ServiceClass } from "@/types";

interface MapLegendProps {
  serviceClasses: ServiceClass[];
  activeFilters: string[];
  onToggle: (name: string) => void;
  /** Live pin count per category name, shown as a small badge next to each label. */
  counts?: Record<string, number>;
}

/** Small colored circle badge mirroring the map marker glyph for a category (building/check/
 * shield/cap for the 4 known service classes, a plain dot for anything admin-added). */
function CategoryBadge({ color, name }: { color: string; name: string }) {
  const kind = CATEGORY_ICON_BY_NAME[name];
  return (
    <svg viewBox="-10 -10 20 20" className="h-[18px] w-[18px] flex-shrink-0">
      <circle r="9.5" fill={color} />
      {kind && <g dangerouslySetInnerHTML={{ __html: categoryGlyphMarkup(kind) }} />}
    </svg>
  );
}

/** Checkbox-styled active/inactive indicator: filled + checkmark when this category's pins are
 * currently visible, an empty outlined square when it's been greyed out by other filters. */
function ToggleCheckbox({ color, checked }: { color: string; checked: boolean }) {
  return (
    <span
      className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded ${
        checked ? "" : "border border-gray-300 dark:border-gray-600"
      }`}
      style={checked ? { backgroundColor: color } : undefined}
    >
      {checked && (
        <svg viewBox="0 0 16 16" className="h-2.5 w-2.5">
          <path
            d="M3 8.5 L6.5 12 L13 4"
            fill="none"
            stroke="#fff"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </span>
  );
}

/** Fixed bottom-right legend mapping service-class colors to names; keys are clickable to
 * filter map pins by class (multi-select), greying out inactive classes once any are chosen.
 * Scaled up 30% (anchored at its own bottom-right corner so it grows into the map instead of
 * overflowing the viewport edge) per TASK.md line 662. */
export default function MapLegend({ serviceClasses, activeFilters, onToggle, counts }: MapLegendProps) {
  const { t, tCategory } = useLanguage();
  if (serviceClasses.length === 0) return null;

  const hasActiveFilters = activeFilters.length > 0;

  return (
    <div className="absolute bottom-3 right-3 z-10 origin-bottom-right scale-[1.3] rounded-md bg-white p-3 text-xs shadow-lg dark:bg-gray-800">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-systemGreen" aria-hidden="true" />
          <h3 className="font-bold uppercase tracking-wide text-gray-700 dark:text-gray-200">{t("mapKey")}</h3>
        </div>
        <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500">{t("toggleLayer")}</span>
      </div>
      <ul className="space-y-1">
        {serviceClasses.map((serviceClass) => {
          const isActive = activeFilters.includes(serviceClass.name);
          const isGreyedOut = hasActiveFilters && !isActive;
          return (
            <li key={serviceClass.id}>
              <button
                type="button"
                onClick={() => onToggle(serviceClass.name)}
                aria-pressed={isActive}
                className={`flex w-full items-center gap-2 rounded px-1 py-0.5 text-left transition-opacity hover:bg-gray-50 dark:hover:bg-gray-700 ${
                  isGreyedOut ? "text-gray-300 opacity-60 dark:text-gray-500" : "font-semibold text-gray-800 dark:text-gray-100"
                }`}
              >
                <CategoryBadge color={serviceClass.color} name={serviceClass.name} />
                <span className="flex-1">{tCategory(serviceClass.name)}</span>
                <span className="text-gray-400 dark:text-gray-500">{counts?.[serviceClass.name] ?? 0}</span>
                <ToggleCheckbox color={serviceClass.color} checked={!isGreyedOut} />
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-2 text-[10px] text-gray-400 dark:border-gray-700 dark:text-gray-500">
        <span>{t("mapProjection")}: UTM-Arc1960</span>
        <span className="font-semibold text-systemGreen">{t("synced")}</span>
      </div>
    </div>
  );
}
