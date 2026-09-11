"use client";

import { useLanguage } from "@/lib/i18n";
import type { ServiceClass } from "@/types";

interface MapLegendProps {
  serviceClasses: ServiceClass[];
  activeFilters: string[];
  onToggle: (name: string) => void;
}

/** Fixed bottom-right legend mapping service-class colors to names; keys are clickable to
 * filter map pins by class (multi-select), greying out inactive classes once any are chosen. */
export default function MapLegend({ serviceClasses, activeFilters, onToggle }: MapLegendProps) {
  const { t, tCategory } = useLanguage();
  if (serviceClasses.length === 0) return null;

  const hasActiveFilters = activeFilters.length > 0;

  return (
    <div className="absolute bottom-3 right-3 z-10 rounded-md bg-white p-3 text-xs shadow-lg dark:bg-gray-800">
      <h3 className="mb-1 font-semibold text-gray-700 dark:text-gray-200">{t("mapKey")}</h3>
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
                <span
                  className="inline-block h-3 w-3 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: serviceClass.color, opacity: isGreyedOut ? 0.4 : 1 }}
                />
                {tCategory(serviceClass.name)}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
